/**
 * Banco de reactivos ampliado por el docente.
 *
 * El catálogo oficial (120 reactivos) sigue viviendo en `cuestionarios.ts` y no
 * se modifica desde la base de datos. Aquí sólo se administran los reactivos
 * extra que un docente escribe para su grupo: se guardan en `quiz_questions` y
 * se combinan con el catálogo en el momento de mostrar y de calificar.
 *
 * Regla de seguridad heredada del catálogo: la versión pública del cuestionario
 * nunca incluye `correcta` ni `explicacion`, y la calificación ocurre sólo en el
 * servidor.
 */

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { quizQuestions, type QuizQuestion } from "@/db/schema";
import { demoListarReactivos } from "@/lib/demo-store";
import {
  calificarRespuestas,
  cuestionarioPorClave,
  versionPublicaDeCuestionario,
  type Cuestionario,
  type PreguntaCuestionario,
} from "@/lib/academico/cuestionarios";

export const MAX_REACTIVOS_EXTRA_POR_CUESTIONARIO = 40;
export const MAX_OPCIONES = 6;
export const MIN_OPCIONES = 2;
export const MAX_LARGO_ENUNCIADO = 600;
export const MAX_LARGO_OPCION = 240;
export const MAX_LARGO_EXPLICACION = 700;

export type ReactivoExtra = {
  id: number;
  cuestionarioClave: string;
  enunciado: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
  autorId: number | null;
  autorNombre: string | null;
  activa: boolean;
  createdAt: Date;
};

/** Lee el JSON de opciones sin confiar en que sea válido. */
export function parseOpciones(texto: string | null | undefined): string[] {
  if (!texto) return [];
  try {
    const valor = JSON.parse(texto);
    if (!Array.isArray(valor)) return [];
    return valor
      .filter((o): o is string => typeof o === "string")
      .map((o) => o.trim())
      .filter(Boolean)
      .slice(0, MAX_OPCIONES);
  } catch {
    return [];
  }
}

type FilaDemo = ReturnType<typeof demoListarReactivos>[number];

function aReactivoDemo(fila: FilaDemo): ReactivoExtra {
  return {
    id: fila.id,
    cuestionarioClave: fila.cuestionarioClave,
    enunciado: fila.enunciado,
    opciones: fila.opciones,
    correcta: fila.correcta,
    explicacion: fila.explicacion,
    autorId: fila.autorId,
    autorNombre: fila.autorNombre,
    activa: fila.activa,
    createdAt: new Date(fila.createdAt),
  };
}

function aReactivo(fila: QuizQuestion): ReactivoExtra {
  return {
    id: fila.id,
    cuestionarioClave: fila.cuestionarioClave,
    enunciado: fila.enunciado,
    opciones: parseOpciones(fila.opciones),
    correcta: fila.correcta,
    explicacion: fila.explicacion,
    autorId: fila.autorId,
    autorNombre: fila.autorNombre,
    activa: fila.activa,
    createdAt: fila.createdAt,
  };
}

/** Reactivos extra activos de un cuestionario, en el orden en que se escribieron. */
export async function reactivosExtraDeClave(clave: string): Promise<ReactivoExtra[]> {
  try {
    const filas = await db
      .select()
      .from(quizQuestions)
      .where(and(eq(quizQuestions.cuestionarioClave, clave), eq(quizQuestions.activa, true)))
      .orderBy(asc(quizQuestions.id));
    return filas.map(aReactivo);
  } catch {
    // Sin base disponible se usa el almacén demo en memoria.
    return demoListarReactivos(clave).filter((r) => r.activa).map(aReactivoDemo);
  }
}

/** Todos los reactivos extra activos de varios cuestionarios (una sola consulta). */
export async function reactivosExtraDeVarias(claves: string[]): Promise<Map<string, ReactivoExtra[]>> {
  const mapa = new Map<string, ReactivoExtra[]>();
  if (claves.length === 0) return mapa;
  try {
    const filas = await db
      .select()
      .from(quizQuestions)
      .where(and(inArray(quizQuestions.cuestionarioClave, claves), eq(quizQuestions.activa, true)))
      .orderBy(asc(quizQuestions.id));
    for (const fila of filas) {
      const lista = mapa.get(fila.cuestionarioClave) ?? [];
      lista.push(aReactivo(fila));
      mapa.set(fila.cuestionarioClave, lista);
    }
  } catch {
    // Igual que arriba: sin base se usa el almacén demo.
    for (const clave of claves) {
      const propios = demoListarReactivos(clave).filter((r) => r.activa).map(aReactivoDemo);
      if (propios.length > 0) mapa.set(clave, propios);
    }
  }
  return mapa;
}

/** Todos los reactivos (activos o no) para el panel que los administra. */
export async function reactivosParaAdministrar(clave?: string): Promise<ReactivoExtra[]> {
  try {
    const filas = clave
      ? await db
          .select()
          .from(quizQuestions)
          .where(eq(quizQuestions.cuestionarioClave, clave))
          .orderBy(asc(quizQuestions.id))
      : await db
          .select()
          .from(quizQuestions)
          .orderBy(asc(quizQuestions.cuestionarioClave), asc(quizQuestions.id));
    return filas.map(aReactivo);
  } catch {
    const demo = demoListarReactivos(clave).map(aReactivoDemo);
    return clave ? demo : demo.sort((a, b) => a.cuestionarioClave.localeCompare(b.cuestionarioClave));
  }
}

function aPregunta(reactivo: ReactivoExtra): PreguntaCuestionario {
  return {
    id: `X-${reactivo.id}`,
    enunciado: reactivo.enunciado,
    opciones: reactivo.opciones,
    correcta: reactivo.correcta,
    explicacion: reactivo.explicacion,
    extra: true,
    autorNombre: reactivo.autorNombre,
  };
}

/**
 * Cuestionario del catálogo + reactivos del docente.
 * Devuelve `null` si la clave no existe en el catálogo.
 */
export async function cuestionarioConExtras(clave: string): Promise<Cuestionario | null> {
  const base = cuestionarioPorClave(clave);
  if (!base) return null;
  const extras = await reactivosExtraDeClave(clave);
  if (extras.length === 0) return base;
  return { ...base, preguntas: [...base.preguntas, ...extras.map(aPregunta)] };
}

/** Versión que ve el alumno: sin respuestas correctas ni explicaciones. */
export async function cuestionarioPublico(clave: string) {
  const completo = await cuestionarioConExtras(clave);
  if (!completo) return null;
  return versionPublicaDeCuestionario(completo);
}

/** Califica un intento contra catálogo + reactivos del docente, en el servidor. */
export async function calificarConExtras(clave: string, respuestas: number[]) {
  const completo = await cuestionarioConExtras(clave);
  if (!completo) return null;
  return calificarRespuestas(completo, respuestas);
}

export type ValidacionReactivo =
  | { ok: true; datos: { enunciado: string; opciones: string[]; correcta: number; explicacion: string } }
  | { ok: false; errores: string[] };

/**
 * Valida y normaliza lo que llega del formulario antes de escribir en la base.
 * Se usa tanto en el servidor (obligatorio) como para mostrar los mismos
 * mensajes en la interfaz.
 */
export function validarReactivo(entrada: {
  enunciado: unknown;
  opciones: unknown[];
  correcta: unknown;
  explicacion?: unknown;
}): ValidacionReactivo {
  const errores: string[] = [];

  const enunciado = String(entrada.enunciado ?? "").trim();
  if (enunciado.length < 10) errores.push("El enunciado debe tener al menos 10 caracteres.");
  if (enunciado.length > MAX_LARGO_ENUNCIADO) {
    errores.push(`El enunciado no puede pasar de ${MAX_LARGO_ENUNCIADO} caracteres.`);
  }

  const opciones = entrada.opciones
    .map((o) => String(o ?? "").trim())
    .filter((o) => o.length > 0);

  if (opciones.length < MIN_OPCIONES) {
    errores.push(`Escribe al menos ${MIN_OPCIONES} opciones.`);
  }
  if (opciones.length > MAX_OPCIONES) {
    errores.push(`Como máximo ${MAX_OPCIONES} opciones.`);
  }
  if (opciones.some((o) => o.length > MAX_LARGO_OPCION)) {
    errores.push(`Cada opción debe caber en ${MAX_LARGO_OPCION} caracteres.`);
  }
  if (new Set(opciones.map((o) => o.toLowerCase())).size !== opciones.length) {
    errores.push("No repitas la misma opción dos veces.");
  }

  const correcta = Number(entrada.correcta);
  if (!Number.isInteger(correcta) || correcta < 0 || correcta >= Math.max(opciones.length, 1)) {
    errores.push("Marca cuál de las opciones es la correcta.");
  }

  const explicacion = String(entrada.explicacion ?? "").trim();
  if (explicacion.length > MAX_LARGO_EXPLICACION) {
    errores.push(`La explicación no puede pasar de ${MAX_LARGO_EXPLICACION} caracteres.`);
  }

  if (errores.length > 0) return { ok: false, errores };
  return { ok: true, datos: { enunciado, opciones, correcta, explicacion } };
}
