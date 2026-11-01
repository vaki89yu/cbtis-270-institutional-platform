/**
 * Justificante de inasistencia por clase.
 *
 * Se emite a partir de un registro de asistencia (falta o falta justificada) y
 * sirve para que la familia o el alumno lo presenten en control escolar. Cada
 * descarga queda en la bitácora con su folio.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attendances, courses, studentProfiles, users } from "@/db/schema";

export type Justificante = {
  asistenciaId: number;
  alumno: {
    id: number;
    nombre: string;
    matricula: string | null;
    semestre: number | null;
    turno: string | null;
    grupo: string | null;
  };
  curso: {
    nombre: string;
    clave: string;
    aula: string | null;
    docente: string;
  };
  fecha: Date;
  estado: string;
  observacion: string | null;
  folio: string;
  emitidoEn: Date;
};

export function folioJustificante(asistenciaId: number, fecha: Date) {
  return `CB270-J${asistenciaId}-${fecha.toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
}

export async function datosJustificante(asistenciaId: number): Promise<Justificante | null> {
  if (!Number.isFinite(asistenciaId) || asistenciaId <= 0) return null;

  const [fila] = await db
    .select({
      id: attendances.id,
      fecha: attendances.fecha,
      estado: attendances.estado,
      observacion: attendances.observacion,
      curso: courses,
      docente: users.nombre,
      alumnoId: attendances.studentId,
    })
    .from(attendances)
    .innerJoin(courses, eq(courses.id, attendances.courseId))
    .innerJoin(users, eq(users.id, courses.docenteId))
    .where(eq(attendances.id, asistenciaId))
    .limit(1);

  if (!fila) return null;

  const [alumno] = await db
    .select({
      id: users.id,
      nombre: users.nombre,
      matricula: users.matricula,
      semestre: users.semestre,
      turno: users.turno,
      grupo: studentProfiles.grupo,
    })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(eq(users.id, fila.alumnoId))
    .limit(1);

  if (!alumno) return null;

  const emitidoEn = new Date();

  return {
    asistenciaId: fila.id,
    alumno: {
      id: alumno.id,
      nombre: alumno.nombre,
      matricula: alumno.matricula,
      semestre: alumno.semestre,
      turno: alumno.turno,
      grupo: alumno.grupo,
    },
    curso: {
      nombre: fila.curso.nombre,
      clave: fila.curso.clave,
      aula: fila.curso.aula,
      docente: fila.docente,
    },
    fecha: new Date(fila.fecha),
    estado: fila.estado,
    observacion: fila.observacion,
    folio: folioJustificante(fila.id, emitidoEn),
    emitidoEn,
  };
}
