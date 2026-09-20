"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, warehousePractices } from "@/db/schema";
import { requireRole, requireUser } from "@/lib/guards";
import { crearNotificacion, registrarActividad } from "@/lib/notificaciones";

export type ActionState = { error?: string; ok?: string };

export async function programarPracticaAlmacenAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("docente", "admin");
  const courseId = Number(formData.get("courseId"));
  const titulo = String(formData.get("titulo") ?? "").trim();
  const objetivo = String(formData.get("objetivo") ?? "").trim();
  const areaAlmacen = String(formData.get("areaAlmacen") ?? "").trim() || "Zona de Racks y Estantería A";
  const equipos = String(formData.get("equiposUtilizados") ?? "").trim();
  const seguridad = String(formData.get("equipoSeguridadObligatorio") ?? "").trim();
  const fechaStr = String(formData.get("fechaPractica") ?? "").trim();
  const duracionMinutos = Number(formData.get("duracionMinutos") ?? 100) || 100;
  const cupoMaximo = Number(formData.get("cupoMaximo") ?? 30) || 30;

  if (!Number.isFinite(courseId) || titulo.length < 4 || objetivo.length < 5 || !fechaStr) {
    return { error: "Completa los campos obligatorios de la práctica de almacén." };
  }

  const [curso] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!curso) return { error: "Aula no encontrada." };
  if (user.rol !== "admin" && curso.docenteId !== user.id) {
    return { error: "No tienes permisos sobre este grupo." };
  }

  const fechaPractica = new Date(fechaStr);

  await db.insert(warehousePractices).values({
    courseId,
    docenteId: user.id,
    titulo,
    objetivo,
    areaAlmacen,
    equiposUtilizados: equipos || "Montacargas contrabalanceado, transpaleta hidráulica, lector de código de barras",
    equipoSeguridadObligatorio: seguridad || "Chaleco reflejante, calzado con casquillo de protección, guantes de carnaza",
    fechaPractica,
    duracionMinutos,
    cupoMaximo,
    estado: "programada",
  });

  await registrarActividad(
    user.id,
    "practica_almacen_programada",
    `Práctica de almacén programada: ${titulo} (${curso.nombre}, ${fechaStr}).`,
  );

  revalidatePath("/panel/almacen");
  revalidatePath(`/panel/clases/${courseId}`);
  return { ok: `Práctica "${titulo}" agendada exitosamente en el Almacén Escuela Edificio C.` };
}

export async function actualizarEstadoPracticaAction(formData: FormData) {
  const user = await requireRole("docente", "admin");
  const practicaId = Number(formData.get("practicaId"));
  const nuevoEstado = String(formData.get("estado") ?? "");

  if (!Number.isFinite(practicaId) || !["programada", "en_curso", "concluida"].includes(nuevoEstado)) return;

  const [p] = await db
    .select()
    .from(warehousePractices)
    .where(eq(warehousePractices.id, practicaId))
    .limit(1);

  if (!p) return;
  if (user.rol !== "admin" && p.docenteId !== user.id) return;

  await db
    .update(warehousePractices)
    .set({ estado: nuevoEstado })
    .where(eq(warehousePractices.id, practicaId));

  revalidatePath("/panel/almacen");
}
