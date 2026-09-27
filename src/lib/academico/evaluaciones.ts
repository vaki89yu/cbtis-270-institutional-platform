/**
 * Capa de datos de los cuestionarios autocalificables.
 *
 * Guarda intentos, historial y mejor marca. Las respuestas correctas del banco
 * nunca se escriben aquí: sólo qué opción eligió el alumno y cuántas acertó.
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, enrollments, quizAttempts, users } from "@/db/schema";
import { CUESTIONARIOS, cuestionarioPorClave } from "@/lib/academico/cuestionarios";
import { registrarAuditoria } from "@/lib/auditoria";

export type IntentoGuardado = {
  id: number;
  cuestionarioClave: string;
  studentId: number;
  courseId: number | null;
  correctas: number;
  total: number;
  calificacion: number;
  duracionSeg: number;
  respuestas: string;
  agotado: boolean;
  createdAt: Date;
};

/** Sin base de datos el módulo devuelve respaldos vacíos en vez de tirar la página. */
let avisoDado = false;
async function consultaSegura<T>(consulta: () => Promise<T>, respaldo: T): Promise<T> {
  try {
    return await consulta();
  } catch (error) {
    if (!avisoDado) {
      console.warn("[evaluaciones] Sin base de datos, modo demo:", (error as Error).message?.slice(0, 160));
      avisoDado = true;
    }
    return respaldo;
  }
}

/** Registra un intento ya calificado por el servidor. */
export async function guardarIntento(params: {
  clave: string;
  studentId: number;
  courseId?: number | null;
  correctas: number;
  total: number;
  calificacion: number;
  duracionSeg: number;
  respuestas: number[];
  agotado: boolean;
  alumnoNombre: string;
}): Promise<IntentoGuardado | null> {
  const filas = await consultaSegura(
    () =>
      db
        .insert(quizAttempts)
        .values({
          cuestionarioClave: params.clave,
          studentId: params.studentId,
          courseId: params.courseId ?? null,
          correctas: params.correctas,
          total: params.total,
          calificacion: params.calificacion,
          duracionSeg: Math.max(0, Math.round(params.duracionSeg)),
          respuestas: JSON.stringify(params.respuestas),
          agotado: params.agotado,
        })
        .returning(),
    [] as IntentoGuardado[],
  );

  const fila = filas[0];
  if (!fila) return null;

  await registrarAuditoria({
    userId: params.studentId,
    actor: params.alumnoNombre,
    accion: "cuestionario_resuelto",
    entidad: "quiz_attempt",
    entidadId: fila.id,
    detalle: `${params.clave}: ${params.correctas}/${params.total} · ${params.calificacion} puntos`,
  });

  return fila;
}

/** Todos los intentos de un alumno, opcionalmente de un solo cuestionario. */
export async function intentosDelAlumno(studentId: number, clave?: string) {
  const condicion = clave
    ? and(eq(quizAttempts.studentId, studentId), eq(quizAttempts.cuestionarioClave, clave))
    : eq(quizAttempts.studentId, studentId);
  return consultaSegura(
    () => db.select().from(quizAttempts).where(condicion).orderBy(desc(quizAttempts.createdAt)),
    [] as IntentoGuardado[],
  );
}

/** Mejor calificación del alumno en cada cuestionario, con su intento. */
export async function mejoresMarcasDelAlumno(studentId: number) {
  const intentos = await intentosDelAlumno(studentId);
  const mejores = new Map<string, (typeof intentos)[number]>();
  for (const intento of intentos) {
    const actual = mejores.get(intento.cuestionarioClave);
    if (!actual || intento.calificacion > actual.calificacion) {
      mejores.set(intento.cuestionarioClave, intento);
    }
  }
  return mejores;
}

/** Resumen para el catálogo: por cada cuestionario, cuántos intentos y la mejor marca. */
export async function resumenDelAlumno(studentId: number) {
  const mejores = await mejoresMarcasDelAlumno(studentId);
  const todos = await intentosDelAlumno(studentId);
  const conteo = new Map<string, number>();
  for (const intento of todos) {
    conteo.set(intento.cuestionarioClave, (conteo.get(intento.cuestionarioClave) ?? 0) + 1);
  }
  return CUESTIONARIOS.map((c) => ({
    cuestionario: c,
    intentos: conteo.get(c.clave) ?? 0,
    mejor: mejores.get(c.clave) ?? null,
  }));
}

/** Intentos de los alumnos de un aula, para la vista del docente. */
export async function intentosDelAula(courseId: number) {
  return consultaSegura(
    () =>
      db
        .select({
          intento: quizAttempts,
          alumno: users.nombre,
          matricula: users.matricula,
        })
        .from(quizAttempts)
        .innerJoin(users, eq(users.id, quizAttempts.studentId))
        .where(eq(quizAttempts.courseId, courseId))
        .orderBy(desc(quizAttempts.createdAt))
        .limit(200),
    [] as Array<{ intento: IntentoGuardado; alumno: string; matricula: string | null }>,
  );
}

/** Intentos de todos los alumnos del docente, con el aula en la que se aplicó. */
export async function resultadosPorDocente(docenteId: number) {
  const aulas = await consultaSegura(
    () =>
      db
        .select({ id: courses.id, nombre: courses.nombre })
        .from(courses)
        .where(eq(courses.docenteId, docenteId)),
    [] as Array<{ id: number; nombre: string }>,
  );
  if (aulas.length === 0) return { aulas, filas: [] as Array<{ intento: typeof quizAttempts.$inferSelect; alumno: string; aula: string | null }> };

  // Alumnos inscritos en alguna de sus aulas
  const inscritos = await consultaSegura(
    () =>
      db
        .select({ studentId: enrollments.studentId, courseId: enrollments.courseId })
        .from(enrollments),
    [] as Array<{ studentId: number; courseId: number }>,
  );
  const nombresAula = new Map(aulas.map((a) => [a.id, a.nombre]));
  const alumnosDelDocente = new Map<number, string>();
  for (const fila of inscritos) {
    const nombre = nombresAula.get(fila.courseId);
    if (nombre) alumnosDelDocente.set(fila.studentId, nombre);
  }
  if (alumnosDelDocente.size === 0) return { aulas, filas: [] };

  const filas = await consultaSegura(
    () =>
      db
        .select({
          intento: quizAttempts,
          alumno: users.nombre,
        })
        .from(quizAttempts)
        .innerJoin(users, eq(users.id, quizAttempts.studentId))
        .orderBy(desc(quizAttempts.createdAt))
        .limit(500),
    [] as Array<{ intento: IntentoGuardado; alumno: string }>,
  );

  return {
    aulas,
    filas: filas
      .filter((f) => alumnosDelDocente.has(f.intento.studentId))
      .map((f) => ({ ...f, aula: alumnosDelDocente.get(f.intento.studentId) ?? null })),
  };
}

/** Etiqueta legible del cuestionario a partir de su clave. */
export function tituloDelCuestionario(clave: string): string {
  return cuestionarioPorClave(clave)?.titulo ?? clave;
}
