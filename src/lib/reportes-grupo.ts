/**
 * Reporte de grupo: una hoja por aula con el avance de cada alumno.
 *
 * Pensado para la junta de academia y para la entrega a orientación: promedio
 * de actividades calificadas, porcentaje de asistencia y entregas pendientes de
 * un vistazo, sin abrir expediente por expediente.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { assignments, attendances, courses, enrollments, studentProfiles, submissions, users } from "@/db/schema";
import { docentesDelAula } from "@/lib/permisos-aula";

export type FilaReporteGrupo = {
  id: number;
  nombre: string;
  matricula: string | null;
  promedio: number | null;
  asistencia: number | null;
  sesiones: number;
  entregas: number;
  pendientes: number;
};

export type ReporteGrupo = {
  curso: {
    id: number;
    nombre: string;
    clave: string;
    aula: string | null;
    semestre: number;
    grupo: string;
    turno: string;
    modulo: number | null;
  };
  docentes: string[];
  actividades: number;
  filas: FilaReporteGrupo[];
  promedioGrupo: number | null;
  asistenciaGrupo: number | null;
  pendientesTotales: number;
  emitidoEn: Date;
  folio: string;
};

function promedioDe(valores: number[]) {
  if (valores.length === 0) return null;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

export function folioReporte(courseId: number, fecha: Date) {
  return `CB270-R${courseId}-${fecha.toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
}

export async function datosReporteGrupo(courseId: number): Promise<ReporteGrupo | null> {
  if (!Number.isFinite(courseId)) return null;

  const [filaCurso] = await db
    .select({ curso: courses, docente: users.nombre })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.docenteId))
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!filaCurso) return null;

  const alumnos = await db
    .select({
      id: users.id,
      nombre: users.nombre,
      matricula: users.matricula,
      grupo: studentProfiles.grupo,
    })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(eq(enrollments.courseId, courseId))
    .orderBy(users.nombre);

  const tareas = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(and(eq(assignments.courseId, courseId), eq(assignments.activa, true)));
  const idsTareas = tareas.map((t) => t.id);

  const entregas = idsTareas.length
    ? await db
        .select({
          studentId: submissions.studentId,
          entregas: sql<number>`count(*)::int`,
          promedio: sql<number | null>`round(avg(${submissions.calificacion}))::int`,
        })
        .from(submissions)
        .where(and(inArray(submissions.assignmentId, idsTareas), sql`${submissions.calificacion} is not null`))
        .groupBy(submissions.studentId)
    : [];

  const totalEntregas = idsTareas.length
    ? await db
        .select({
          studentId: submissions.studentId,
          entregas: sql<number>`count(*)::int`,
        })
        .from(submissions)
        .where(inArray(submissions.assignmentId, idsTareas))
        .groupBy(submissions.studentId)
    : [];

  const asistencias = await db
    .select({
      studentId: attendances.studentId,
      total: sql<number>`count(*)::int`,
      validas: sql<number>`count(*) filter (where ${attendances.estado} in ('presente','retardo','justificado'))::int`,
    })
    .from(attendances)
    .where(eq(attendances.courseId, courseId))
    .groupBy(attendances.studentId);

  const promedioPorAlumno = new Map(entregas.map((e) => [e.studentId, e.promedio]));
  const entregasPorAlumno = new Map(totalEntregas.map((e) => [e.studentId, e.entregas]));
  const asistenciaPorAlumno = new Map(asistencias.map((a) => [a.studentId, a]));

  const filas: FilaReporteGrupo[] = alumnos.map((alumno) => {
    const asistencia = asistenciaPorAlumno.get(alumno.id);
    const entregasAlumno = entregasPorAlumno.get(alumno.id) ?? 0;
    return {
      id: alumno.id,
      nombre: alumno.nombre,
      matricula: alumno.matricula,
      promedio: promedioPorAlumno.get(alumno.id) ?? null,
      asistencia:
        asistencia && asistencia.total > 0 ? Math.round((asistencia.validas / asistencia.total) * 100) : null,
      sesiones: asistencia?.total ?? 0,
      entregas: entregasAlumno,
      pendientes: Math.max(0, idsTareas.length - entregasAlumno),
    };
  });

  const docentes = (await docentesDelAula(courseId)).map((d) => d.nombre);
  const promedios = filas.map((f) => f.promedio).filter((n): n is number => n !== null);
  const asistenciasValidas = filas.map((f) => f.asistencia).filter((n): n is number => n !== null);
  const emitidoEn = new Date();

  return {
    curso: {
      id: filaCurso.curso.id,
      nombre: filaCurso.curso.nombre,
      clave: filaCurso.curso.clave,
      aula: filaCurso.curso.aula,
      semestre: filaCurso.curso.semestre,
      grupo: filaCurso.curso.grupo,
      turno: filaCurso.curso.turno,
      modulo: filaCurso.curso.modulo ?? null,
    },
    docentes: docentes.length > 0 ? docentes : [filaCurso.docente],
    actividades: idsTareas.length,
    filas,
    promedioGrupo: promedioDe(promedios),
    asistenciaGrupo: promedioDe(asistenciasValidas),
    pendientesTotales: filas.reduce((suma, f) => suma + f.pendientes, 0),
    emitidoEn,
    folio: folioReporte(courseId, emitidoEn),
  };
}
