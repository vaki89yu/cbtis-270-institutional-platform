/**
 * Alerta temprana. Detecta al alumno que se está quedando atrás antes de que
 * sea tarde, con las reglas que pide control escolar:
 *   · 3 faltas seguidas o 20% de inasistencia
 *   · 2 actividades activas sin entregar
 *   · promedio por debajo de 7
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  attendances,
  courses,
  enrollments,
  studentProfiles,
  submissions,
  users,
} from "@/db/schema";

export type NivelRiesgo = "alto" | "medio" | "ninguno";

export type AlumnoEnRiesgo = {
  id: number;
  nombre: string;
  matricula: string | null;
  grupo: string | null;
  semestre: number | null;
  cursoId: number | null;
  cursoNombre: string | null;
  faltas: number;
  faltasSeguidas: number;
  porcentajeAsistencia: number | null;
  sinEntregar: number;
  promedio: number | null;
  nivel: NivelRiesgo;
  motivos: string[];
};

function evaluar(datos: {
  faltasSeguidas: number;
  porcentajeAsistencia: number | null;
  sinEntregar: number;
  promedio: number | null;
}): { nivel: NivelRiesgo; motivos: string[] } {
  const motivos: string[] = [];
  let puntos = 0;

  if (datos.faltasSeguidas >= 3) {
    motivos.push(`${datos.faltasSeguidas} faltas seguidas`);
    puntos += 2;
  }
  if (datos.porcentajeAsistencia !== null && datos.porcentajeAsistencia < 80) {
    motivos.push(`asistencia de ${datos.porcentajeAsistencia}%`);
    puntos += 1;
  }
  if (datos.sinEntregar >= 2) {
    motivos.push(`${datos.sinEntregar} actividades sin entregar`);
    puntos += datos.sinEntregar >= 4 ? 2 : 1;
  }
  if (datos.promedio !== null && datos.promedio < 70) {
    motivos.push(`promedio de ${Math.round(datos.promedio / 10 * 10) / 10}`);
    puntos += 2;
  }

  if (puntos >= 3) return { nivel: "alto", motivos };
  if (puntos >= 1) return { nivel: "medio", motivos };
  return { nivel: "ninguno", motivos };
}

/**
 * Alumnos en riesgo. Si se pasa `docenteId`, sólo los que lo eligieron como
 * docente encargado; sin él (dirección) se revisa a todo el plantel.
 */
export async function alumnosEnRiesgo(opciones?: {
  docenteId?: number;
  soloConRiesgo?: boolean;
}): Promise<AlumnoEnRiesgo[]> {
  const soloConRiesgo = opciones?.soloConRiesgo ?? true;

  const base = db
    .select({
      id: users.id,
      nombre: users.nombre,
      matricula: users.matricula,
      grupo: studentProfiles.grupo,
      semestre: users.semestre,
    })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id));

  const alumnos = await (opciones?.docenteId
    ? base.where(
        and(
          eq(users.rol, "estudiante"),
          eq(users.activo, true),
          eq(studentProfiles.tutorDocenteId, opciones.docenteId),
        ),
      )
    : base.where(and(eq(users.rol, "estudiante"), eq(users.activo, true))));

  if (alumnos.length === 0) return [];
  const ids = alumnos.map((a) => a.id);

  const asistencias = await db
    .select({
      studentId: attendances.studentId,
      estado: attendances.estado,
      fecha: attendances.fecha,
      courseId: attendances.courseId,
    })
    .from(attendances)
    .where(inArray(attendances.studentId, ids))
    .orderBy(desc(attendances.fecha));

  const inscripciones = await db
    .select({ studentId: enrollments.studentId, courseId: enrollments.courseId, curso: courses.nombre })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(inArray(enrollments.studentId, ids));

  const cursoIds = [...new Set(inscripciones.map((i) => i.courseId))];
  const tareas =
    cursoIds.length > 0
      ? await db
          .select({ id: assignments.id, courseId: assignments.courseId })
          .from(assignments)
          .where(and(inArray(assignments.courseId, cursoIds), eq(assignments.activa, true)))
      : [];

  const entregas =
    tareas.length > 0
      ? await db
          .select({
            assignmentId: submissions.assignmentId,
            studentId: submissions.studentId,
            calificacion: submissions.calificacion,
          })
          .from(submissions)
          .where(inArray(submissions.assignmentId, tareas.map((t) => t.id)))
      : [];

  const resultado: AlumnoEnRiesgo[] = alumnos.map((al) => {
    const misAsistencias = asistencias.filter((a) => a.studentId === al.id);
    const faltas = misAsistencias.filter((a) => a.estado === "falta").length;

    let faltasSeguidas = 0;
    for (const a of misAsistencias) {
      if (a.estado === "falta") faltasSeguidas += 1;
      else break;
    }

    const porcentajeAsistencia =
      misAsistencias.length > 0
        ? Math.round(
            (misAsistencias.filter((a) => a.estado === "presente" || a.estado === "justificado")
              .length /
              misAsistencias.length) *
              100,
          )
        : null;

    const misCursos = inscripciones.filter((i) => i.studentId === al.id);
    const misTareas = tareas.filter((t) => misCursos.some((c) => c.courseId === t.courseId));
    const misEntregas = entregas.filter((e) => e.studentId === al.id);
    const sinEntregar = misTareas.filter(
      (t) => !misEntregas.some((e) => e.assignmentId === t.id),
    ).length;

    const notas = misEntregas
      .map((e) => e.calificacion)
      .filter((c): c is number => typeof c === "number");
    const promedio =
      notas.length > 0 ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : null;

    const { nivel, motivos } = evaluar({ faltasSeguidas, porcentajeAsistencia, sinEntregar, promedio });

    return {
      id: al.id,
      nombre: al.nombre,
      matricula: al.matricula,
      grupo: al.grupo,
      semestre: al.semestre,
      cursoId: misCursos[0]?.courseId ?? null,
      cursoNombre: misCursos[0]?.curso ?? null,
      faltas,
      faltasSeguidas,
      porcentajeAsistencia,
      sinEntregar,
      promedio,
      nivel,
      motivos,
    };
  });

  const orden = { alto: 0, medio: 1, ninguno: 2 } as const;
  return resultado
    .filter((r) => (soloConRiesgo ? r.nivel !== "ninguno" : true))
    .sort((a, b) => orden[a.nivel] - orden[b.nivel] || a.nombre.localeCompare(b.nombre, "es"));
}

/** Riesgo de un solo alumno, para su expediente. */
export async function riesgoDelAlumno(studentId: number): Promise<AlumnoEnRiesgo | null> {
  const todos = await alumnosEnRiesgo({ soloConRiesgo: false });
  return todos.find((a) => a.id === studentId) ?? null;
}
