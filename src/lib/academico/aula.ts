/**
 * Lógica del aula: quién pertenece a ella y qué está pasando dentro.
 *
 * Regla institucional: el alumno NO se inscribe solo. Pertenece al aula cuando
 * coinciden las tres cosas que declaró en su registro —su semestre, su grupo y
 * el docente que eligió como tutor— con los datos del aula que abrió el
 * docente. La inscripción se sincroniza sola cada vez que se abre el aula.
 */

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  attendanceSessions,
  attendances,
  courses,
  enrollments,
  studentProfiles,
  submissions,
  users,
} from "@/db/schema";

export type AlumnoDelGrupo = {
  id: number;
  nombre: string;
  matricula: string | null;
  email: string;
  grupo: string | null;
  semestre: number | null;
};

/** Alumnos que eligieron a este docente como tutor en su registro. */
export async function alumnosDeDocente(docenteId: number): Promise<AlumnoDelGrupo[]> {
  const filas = await db
    .select({
      id: users.id,
      nombre: users.nombre,
      matricula: users.matricula,
      email: users.email,
      grupo: studentProfiles.grupo,
      semestre: users.semestre,
    })
    .from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(and(eq(users.rol, "estudiante"), eq(studentProfiles.tutorDocenteId, docenteId)))
    .orderBy(asc(users.nombre));
  return filas;
}

/**
 * Inscribe automáticamente al aula a los alumnos cuyo registro coincide con
 * ella (mismo docente tutor, mismo semestre y mismo grupo).
 * Devuelve cuántos se agregaron en esta pasada.
 */
export async function sincronizarGrupoDelAula(courseId: number): Promise<number> {
  const [curso] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!curso) return 0;

  const candidatos = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(
      and(
        eq(users.rol, "estudiante"),
        eq(studentProfiles.tutorDocenteId, curso.docenteId),
        eq(users.semestre, curso.semestre),
        eq(studentProfiles.grupo, curso.grupo),
      ),
    );
  if (candidatos.length === 0) return 0;

  const yaInscritos = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId));
  const set = new Set(yaInscritos.map((e) => e.studentId));

  const nuevos = candidatos.filter((c) => !set.has(c.id));
  if (nuevos.length === 0) return 0;

  await db
    .insert(enrollments)
    .values(nuevos.map((n) => ({ courseId, studentId: n.id })))
    .onConflictDoNothing();
  return nuevos.length;
}

/** Aulas que le corresponden al alumno, sincronizando su inscripción. */
export async function aulasDelAlumno(studentId: number) {
  const [perfil] = await db
    .select({ grupo: studentProfiles.grupo, tutorDocenteId: studentProfiles.tutorDocenteId })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, studentId))
    .limit(1);

  const [alumno] = await db
    .select({ semestre: users.semestre })
    .from(users)
    .where(eq(users.id, studentId))
    .limit(1);

  // Aulas que coinciden con su registro: se auto-inscribe
  if (perfil?.tutorDocenteId && perfil.grupo && alumno?.semestre) {
    const coincidentes = await db
      .select({ id: courses.id })
      .from(courses)
      .where(
        and(
          eq(courses.docenteId, perfil.tutorDocenteId),
          eq(courses.semestre, alumno.semestre),
          eq(courses.grupo, perfil.grupo),
          eq(courses.activo, true),
        ),
      );
    if (coincidentes.length > 0) {
      await db
        .insert(enrollments)
        .values(coincidentes.map((c) => ({ courseId: c.id, studentId })))
        .onConflictDoNothing();
    }
  }

  return db
    .select({ curso: courses, docente: users.nombre })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(users, eq(users.id, courses.docenteId))
    .where(and(eq(enrollments.studentId, studentId), eq(courses.activo, true)))
    .orderBy(asc(courses.nombre));
}

/** Pase de lista abierto en este momento, si lo hay. */
export async function paseDeListaAbierto(courseId: number) {
  const [sesion] = await db
    .select()
    .from(attendanceSessions)
    .where(and(eq(attendanceSessions.courseId, courseId), eq(attendanceSessions.abierta, true)))
    .orderBy(desc(attendanceSessions.fecha))
    .limit(1);
  return sesion ?? null;
}

/** Registros de asistencia de un pase de lista. */
export async function asistenciasDeSesion(sessionId: number) {
  return db
    .select({
      asistencia: attendances,
      alumno: users.nombre,
      matricula: users.matricula,
    })
    .from(attendances)
    .innerJoin(users, eq(users.id, attendances.studentId))
    .where(eq(attendances.sessionId, sessionId))
    .orderBy(asc(users.nombre));
}

/** Últimos pases de lista del aula con su conteo. */
export async function historialPasesDeLista(courseId: number, limite = 8) {
  return db
    .select({
      sesion: attendanceSessions,
      presentes: sql<number>`count(*) filter (where ${attendances.estado} = 'presente')::int`,
      retardos: sql<number>`count(*) filter (where ${attendances.estado} = 'retardo')::int`,
      faltas: sql<number>`count(*) filter (where ${attendances.estado} = 'falta')::int`,
    })
    .from(attendanceSessions)
    .leftJoin(attendances, eq(attendances.sessionId, attendanceSessions.id))
    .where(eq(attendanceSessions.courseId, courseId))
    .groupBy(attendanceSessions.id)
    .orderBy(desc(attendanceSessions.fecha))
    .limit(limite);
}

/** Actividades del aula con el avance de entregas. */
export async function actividadesDelAula(courseId: number) {
  return db
    .select({
      tarea: assignments,
      entregas: sql<number>`count(${submissions.id})::int`,
      porCalificar: sql<number>`count(*) filter (where ${submissions.id} is not null and ${submissions.calificacion} is null)::int`,
    })
    .from(assignments)
    .leftJoin(submissions, eq(submissions.assignmentId, assignments.id))
    .where(eq(assignments.courseId, courseId))
    .groupBy(assignments.id)
    .orderBy(asc(assignments.parcial), asc(assignments.fechaEntrega));
}

/** Actividades activas del aula con la entrega del alumno. */
export async function actividadesDelAlumnoEnAula(courseId: number, studentId: number) {
  return db
    .select({ tarea: assignments, entrega: submissions })
    .from(assignments)
    .leftJoin(
      submissions,
      and(eq(submissions.assignmentId, assignments.id), eq(submissions.studentId, studentId)),
    )
    .where(and(eq(assignments.courseId, courseId), eq(assignments.activa, true)))
    .orderBy(asc(assignments.parcial), asc(assignments.fechaEntrega));
}

/** Promedio del alumno en el aula, sobre las actividades ya calificadas. */
export async function promedioDelAlumno(courseId: number, studentId: number) {
  const filas = await db
    .select({ calificacion: submissions.calificacion })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .where(and(eq(assignments.courseId, courseId), eq(submissions.studentId, studentId)));
  const calificadas = filas
    .map((f) => f.calificacion)
    .filter((c): c is number => typeof c === "number");
  if (calificadas.length === 0) return null;
  return Math.round(calificadas.reduce((a, b) => a + b, 0) / calificadas.length);
}

/** Alumnos inscritos al aula. */
export async function alumnosDelAula(courseId: number): Promise<AlumnoDelGrupo[]> {
  return db
    .select({
      id: users.id,
      nombre: users.nombre,
      matricula: users.matricula,
      email: users.email,
      grupo: studentProfiles.grupo,
      semestre: users.semestre,
    })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(eq(enrollments.courseId, courseId))
    .orderBy(asc(users.nombre));
}

/** Concentrado de calificaciones del aula: alumno × actividad. */
export async function concentradoCalificaciones(courseId: number) {
  const alumnos = await alumnosDelAula(courseId);
  if (alumnos.length === 0) return { alumnos, actividades: [], notas: new Map<string, number>() };

  const actividades = await db
    .select()
    .from(assignments)
    .where(eq(assignments.courseId, courseId))
    .orderBy(asc(assignments.parcial), asc(assignments.fechaEntrega));

  const ids = actividades.map((a) => a.id);
  const entregas =
    ids.length > 0
      ? await db
          .select({
            assignmentId: submissions.assignmentId,
            studentId: submissions.studentId,
            calificacion: submissions.calificacion,
          })
          .from(submissions)
          .where(inArray(submissions.assignmentId, ids))
      : [];

  const notas = new Map<string, number>();
  for (const e of entregas) {
    if (typeof e.calificacion === "number") {
      notas.set(`${e.studentId}|${e.assignmentId}`, e.calificacion);
    }
  }

  return { alumnos, actividades, notas };
}
