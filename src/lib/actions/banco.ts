"use server";

/**
 * Acciones del banco de reactivos ampliado.
 *
 * Reglas de acceso:
 *  - docente y admin pueden escribir reactivos;
 *  - el docente sólo edita o archiva los que él escribió;
 *  - admin puede con cualquier reactivo.
 *
 * Los reactivos nunca se borran de la base: se archivan (`activa = false`) para
 * que los intentos ya guardados sigan teniendo sentido al analizarlos.
 */

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quizQuestions } from "@/db/schema";
import { cuestionarioPorClave } from "@/lib/academico/cuestionarios";
import {
  MAX_REACTIVOS_EXTRA_POR_CUESTIONARIO,
  validarReactivo,
} from "@/lib/academico/banco-reactivos";
import { demoActualizarReactivo, demoCrearReactivo, demoListarReactivos } from "@/lib/demo-store";
import { registrarAuditoria } from "@/lib/auditoria";
import { requireRole } from "@/lib/guards";

export type EstadoBanco = { error?: string; ok?: string };

function leerOpciones(formData: FormData): string[] {
  return [1, 2, 3, 4, 5, 6].map((n) => String(formData.get(`opcion${n}`) ?? ""));
}

async function cuantosReactivos(clave: string): Promise<number> {
  try {
    const [fila] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(quizQuestions)
      .where(and(eq(quizQuestions.cuestionarioClave, clave), eq(quizQuestions.activa, true)));
    return fila?.total ?? 0;
  } catch {
    return demoListarReactivos(clave).filter((r) => r.activa).length;
  }
}

type ReactivoGuardado = {
  id: number;
  cuestionarioClave: string;
  enunciado: string;
  autorId: number | null;
};

/** Busca un reactivo en la base o, si no hay base, en el almacén demo. */
async function buscarReactivo(id: number, clave: string): Promise<ReactivoGuardado | null> {
  try {
    const [fila] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, id)).limit(1);
    return fila ?? null;
  } catch {
    const demo = demoListarReactivos(clave).find((r) => r.id === id);
    if (!demo) return null;
    return {
      id: demo.id,
      cuestionarioClave: demo.cuestionarioClave,
      enunciado: demo.enunciado,
      autorId: demo.autorId,
    };
  }
}

function refrescar(clave: string) {
  revalidatePath("/panel/cuestionarios");
  revalidatePath("/panel/cuestionarios/banco");
  revalidatePath(`/panel/cuestionarios/${clave}`);
}

/** Crea un reactivo nuevo para un cuestionario del catálogo. */
export async function crearReactivoAction(
  _estado: EstadoBanco,
  formData: FormData,
): Promise<EstadoBanco> {
  const user = await requireRole("docente", "admin");
  const clave = String(formData.get("clave") ?? "").trim();
  if (!cuestionarioPorClave(clave)) {
    return { error: "Ese cuestionario no existe en el catálogo." };
  }

  const validacion = validarReactivo({
    enunciado: formData.get("enunciado"),
    opciones: leerOpciones(formData),
    correcta: formData.get("correcta"),
    explicacion: formData.get("explicacion"),
  });
  if (!validacion.ok) return { error: validacion.errores[0] ?? "Revisa los datos." };

  const yaHay = await cuantosReactivos(clave);
  if (yaHay >= MAX_REACTIVOS_EXTRA_POR_CUESTIONARIO) {
    return {
      error: `Este cuestionario ya tiene ${MAX_REACTIVOS_EXTRA_POR_CUESTIONARIO} reactivos propios. Archiva alguno para agregar otro.`,
    };
  }

  try {
    const [fila] = await db
      .insert(quizQuestions)
      .values({
        cuestionarioClave: clave,
        enunciado: validacion.datos.enunciado,
        opciones: JSON.stringify(validacion.datos.opciones),
        correcta: validacion.datos.correcta,
        explicacion: validacion.datos.explicacion,
        autorId: user.id,
        autorNombre: user.nombre,
      })
      .returning({ id: quizQuestions.id });

    await registrarAuditoria({
      userId: user.id,
      actor: user.nombre,
      accion: "reactivo_creado",
      entidad: "quiz_question",
      entidadId: fila?.id ?? null,
      detalle: `${clave}: ${validacion.datos.enunciado.slice(0, 120)}`,
    });
  } catch (error) {
    console.warn("[banco] Sin base de datos, guardando reactivo en modo demo:", (error as Error).message?.slice(0, 160));
    demoCrearReactivo({
      cuestionarioClave: clave,
      enunciado: validacion.datos.enunciado,
      opciones: validacion.datos.opciones,
      correcta: validacion.datos.correcta,
      explicacion: validacion.datos.explicacion,
      autorId: user.id,
      autorNombre: user.nombre,
    });
  }

  refrescar(clave);
  return { ok: "Reactivo agregado: ya aparece al final del cuestionario." };
}

/** Edita un reactivo propio (admin puede editar todos). */
export async function actualizarReactivoAction(
  _estado: EstadoBanco,
  formData: FormData,
): Promise<EstadoBanco> {
  const user = await requireRole("docente", "admin");
  const id = Number(formData.get("id"));
  const clave = String(formData.get("clave") ?? "").trim();
  if (!Number.isFinite(id)) return { error: "Reactivo inválido." };

  const actual = await buscarReactivo(id, clave);
  if (!actual || actual.cuestionarioClave !== clave) {
    return { error: "Ese reactivo no existe en este cuestionario." };
  }
  if (user.rol !== "admin" && actual.autorId !== user.id) {
    return { error: "Sólo puedes editar los reactivos que tú escribiste." };
  }

  const validacion = validarReactivo({
    enunciado: formData.get("enunciado"),
    opciones: leerOpciones(formData),
    correcta: formData.get("correcta"),
    explicacion: formData.get("explicacion"),
  });
  if (!validacion.ok) return { error: validacion.errores[0] ?? "Revisa los datos." };

  try {
    await db
      .update(quizQuestions)
      .set({
        enunciado: validacion.datos.enunciado,
        opciones: JSON.stringify(validacion.datos.opciones),
        correcta: validacion.datos.correcta,
        explicacion: validacion.datos.explicacion,
      })
      .where(eq(quizQuestions.id, id));
  } catch {
    demoActualizarReactivo(id, {
      enunciado: validacion.datos.enunciado,
      opciones: validacion.datos.opciones,
      correcta: validacion.datos.correcta,
      explicacion: validacion.datos.explicacion,
    });
  }

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "reactivo_editado",
    entidad: "quiz_question",
    entidadId: id,
    detalle: `${clave}: ${validacion.datos.enunciado.slice(0, 120)}`,
  });

  refrescar(clave);
  return { ok: "Reactivo actualizado." };
}

/** Archiva (deja de mostrarse) sin borrar el histórico de intentos. */
export async function archivarReactivoAction(formData: FormData) {
  const user = await requireRole("docente", "admin");
  const id = Number(formData.get("id"));
  const clave = String(formData.get("clave") ?? "").trim();
  if (!Number.isFinite(id)) return;

  const actual = await buscarReactivo(id, clave);
  if (!actual) return;
  if (user.rol !== "admin" && actual.autorId !== user.id) return;

  try {
    await db.update(quizQuestions).set({ activa: false }).where(eq(quizQuestions.id, id));
  } catch {
    demoActualizarReactivo(id, { activa: false });
  }
  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "reactivo_archivado",
    entidad: "quiz_question",
    entidadId: id,
    detalle: `${clave}: ${actual.enunciado.slice(0, 120)}`,
  });

  refrescar(clave);
}

/** Vuelve a poner en circulación un reactivo archivado. */
export async function reactivarReactivoAction(formData: FormData) {
  const user = await requireRole("docente", "admin");
  const id = Number(formData.get("id"));
  const clave = String(formData.get("clave") ?? "").trim();
  if (!Number.isFinite(id)) return;

  const actual = await buscarReactivo(id, clave);
  if (!actual) return;
  if (user.rol !== "admin" && actual.autorId !== user.id) return;

  const yaHay = await cuantosReactivos(clave);
  if (yaHay >= MAX_REACTIVOS_EXTRA_POR_CUESTIONARIO) return;

  try {
    await db.update(quizQuestions).set({ activa: true }).where(eq(quizQuestions.id, id));
  } catch {
    demoActualizarReactivo(id, { activa: true });
  }
  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "reactivo_reactivado",
    entidad: "quiz_question",
    entidadId: id,
    detalle: clave,
  });

  refrescar(clave);
}
