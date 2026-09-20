import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  announcements,
  assignments,
  attendances,
  attendanceJustifications,
  classSessions,
  courses,
  enrollments,
  logisticsTemplates,
  studentProfiles,
  submissions,
  users,
  warehousePractices,
} from "@/db/schema";

export async function clasesDelEstudiante(studentId: number) {
  return db
    .select({
      curso: courses,
      docente: users.nombre,
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(users, eq(users.id, courses.docenteId))
    .where(eq(enrollments.studentId, studentId))
    .orderBy(asc(courses.nombre));
}

export async function clasesDelDocente(docenteId: number) {
  return db
    .select({
      curso: courses,
      inscritos: sql<number>`count(${enrollments.id})::int`,
    })
    .from(courses)
    .leftJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(eq(courses.docenteId, docenteId))
    .groupBy(courses.id)
    .orderBy(asc(courses.nombre));
}

export async function catalogoDeClases() {
  return db
    .select({
      curso: courses,
      docente: users.nombre,
      inscritos: sql<number>`count(${enrollments.id})::int`,
    })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.docenteId))
    .leftJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(eq(courses.activo, true))
    .groupBy(courses.id, users.nombre)
    .orderBy(asc(courses.semestre), asc(courses.nombre));
}

export async function proximasSesiones(courseIds: number[], limite = 5) {
  if (courseIds.length === 0) return [];
  return db
    .select({
      sesion: classSessions,
      curso: courses,
    })
    .from(classSessions)
    .innerJoin(courses, eq(courses.id, classSessions.courseId))
    .where(and(inArray(classSessions.courseId, courseIds), gte(classSessions.inicia, new Date())))
    .orderBy(asc(classSessions.inicia))
    .limit(limite);
}

export async function tareasDelEstudiante(studentId: number) {
  return db
    .select({
      tarea: assignments,
      curso: courses,
      entrega: submissions,
    })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .innerJoin(
      enrollments,
      and(eq(enrollments.courseId, courses.id), eq(enrollments.studentId, studentId)),
    )
    .leftJoin(
      submissions,
      and(eq(submissions.assignmentId, assignments.id), eq(submissions.studentId, studentId)),
    )
    .orderBy(asc(assignments.fechaEntrega));
}

export async function tareasDelDocente(docenteId: number, soloDelDocente = true) {
  return db
    .select({
      tarea: assignments,
      curso: courses,
      entregas: sql<number>`count(${submissions.id})::int`,
      porCalificar: sql<number>`count(*) filter (where ${submissions.id} is not null and ${submissions.calificacion} is null)::int`,
    })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .leftJoin(submissions, eq(submissions.assignmentId, assignments.id))
    .where(soloDelDocente ? eq(courses.docenteId, docenteId) : undefined)
    .groupBy(assignments.id, courses.id)
    .orderBy(desc(assignments.fechaEntrega));
}

export async function avisosRecientes(limite = 5, soloPublicados = true) {
  return db
    .select({
      aviso: announcements,
      autor: users.nombre,
    })
    .from(announcements)
    .leftJoin(users, eq(users.id, announcements.autorId))
    .where(soloPublicados ? eq(announcements.publicado, true) : undefined)
    .orderBy(desc(announcements.createdAt))
    .limit(limite);
}

export async function estadisticasGenerales() {
  const [estudiantes] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.rol, "estudiante"));
  const [docentes] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.rol, "docente"));
  const [clases] = await db.select({ total: sql<number>`count(*)::int` }).from(courses);
  const [entregas] = await db.select({ total: sql<number>`count(*)::int` }).from(submissions);
  const [pendientes] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(submissions)
    .where(sql`${submissions.calificacion} is null`);

  return {
    estudiantes: estudiantes?.total ?? 0,
    docentes: docentes?.total ?? 0,
    clases: clases?.total ?? 0,
    entregas: entregas?.total ?? 0,
    pendientes: pendientes?.total ?? 0,
  };
}

/* ---------------- MEJORA 1 & 4: ASISTENCIAS Y JUSTIFICANTES ---------------- */

export async function resumenAsistenciaEstudiante(studentId: number) {
  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      presentes: sql<number>`count(*) filter (where ${attendances.estado} = 'presente')::int`,
      retardos: sql<number>`count(*) filter (where ${attendances.estado} = 'retardo')::int`,
      faltas: sql<number>`count(*) filter (where ${attendances.estado} = 'falta')::int`,
      justificados: sql<number>`count(*) filter (where ${attendances.estado} = 'justificado')::int`,
    })
    .from(attendances)
    .where(eq(attendances.studentId, studentId));

  const data = rows[0] ?? { total: 0, presentes: 0, retardos: 0, faltas: 0, justificados: 0 };
  const validas = data.presentes + data.justificados + Math.floor(data.retardos / 2);
  const porcentaje = data.total > 0 ? Math.round((validas / data.total) * 100) : 100;

  return {
    ...data,
    porcentaje,
  };
}

export async function registrosAsistenciaEstudiante(studentId: number) {
  return db
    .select({
      asistencia: attendances,
      curso: courses,
      docente: users.nombre,
    })
    .from(attendances)
    .innerJoin(courses, eq(courses.id, attendances.courseId))
    .innerJoin(users, eq(users.id, courses.docenteId))
    .where(eq(attendances.studentId, studentId))
    .orderBy(desc(attendances.fecha));
}

export async function justificantesDelEstudiante(studentId: number) {
  return db
    .select({
      justificante: attendanceJustifications,
      curso: courses,
    })
    .from(attendanceJustifications)
    .innerJoin(courses, eq(courses.id, attendanceJustifications.courseId))
    .where(eq(attendanceJustifications.studentId, studentId))
    .orderBy(desc(attendanceJustifications.createdAt));
}

export async function justificantesParaDocente(docenteId: number) {
  return db
    .select({
      justificante: attendanceJustifications,
      alumno: users,
      curso: courses,
    })
    .from(attendanceJustifications)
    .innerJoin(courses, eq(courses.id, attendanceJustifications.courseId))
    .innerJoin(users, eq(users.id, attendanceJustifications.studentId))
    .where(eq(courses.docenteId, docenteId))
    .orderBy(desc(attendanceJustifications.createdAt));
}

/* ---------------- MEJORA 2: FORMATOS LOGÍSTICOS ---------------- */

export async function catalogoFormatosLogistica() {
  return db
    .select()
    .from(logisticsTemplates)
    .orderBy(asc(logisticsTemplates.categoria), asc(logisticsTemplates.codigo));
}

/* ---------------- MEJORA 6: PRÁCTICAS EN ALMACÉN ESCUELA ---------------- */

export async function practicasAlmacen(docenteId?: number) {
  return db
    .select({
      practica: warehousePractices,
      curso: courses,
      docente: users.nombre,
    })
    .from(warehousePractices)
    .innerJoin(courses, eq(courses.id, warehousePractices.courseId))
    .innerJoin(users, eq(users.id, warehousePractices.docenteId))
    .where(docenteId ? eq(warehousePractices.docenteId, docenteId) : undefined)
    .orderBy(desc(warehousePractices.fechaPractica));
}

/* ---------------- MEJORA 5: EXPEDIENTES DE ESTUDIANTES ---------------- */

export async function listaExpedientesEstudiantes() {
  return db
    .select({
      alumno: users,
      perfil: studentProfiles,
      tutorNombre: users.nombre,
      asistenciasTotal: sql<number>`count(${attendances.id})::int`,
      presentes: sql<number>`count(*) filter (where ${attendances.estado} = 'presente')::int`,
    })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .leftJoin(attendances, eq(attendances.studentId, users.id))
    .where(eq(users.rol, "estudiante"))
    .groupBy(users.id, studentProfiles.userId)
    .orderBy(asc(users.nombre));
}

export async function expedienteCompletoEstudiante(studentId: number) {
  const [alumnoRow] = await db
    .select({
      alumno: users,
      perfil: studentProfiles,
    })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(eq(users.id, studentId))
    .limit(1);

  if (!alumnoRow) return null;

  const [tutorRow] = alumnoRow.perfil?.tutorDocenteId
    ? await db
        .select({ tutor: users })
        .from(users)
        .where(eq(users.id, alumnoRow.perfil.tutorDocenteId))
        .limit(1)
    : [null];

  const cursosInscritos = await db
    .select({ curso: courses, docente: users.nombre })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(users, eq(users.id, courses.docenteId))
    .where(eq(enrollments.studentId, studentId));

  const asistencias = await resumenAsistenciaEstudiante(studentId);
  const tareas = await tareasDelEstudiante(studentId);

  return {
    alumno: alumnoRow.alumno,
    perfil: alumnoRow.perfil,
    tutor: tutorRow?.tutor ?? null,
    cursos: cursosInscritos,
    asistencias,
    tareas,
  };
}
