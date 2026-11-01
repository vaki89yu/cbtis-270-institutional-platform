/**
 * Consulta para tutores por enlace personal.
 *
 * Decisión de producto: el tutor no crea cuenta ni contraseña. Dirección o el
 * docente encargado genera un enlace con token; en la base sólo queda el hash
 * SHA-256, la caducidad y la bitácora de accesos. Un enlace sirve para un solo
 * alumno y se puede revocar en cualquier momento.
 *
 * La vista es de sólo lectura: asistencia, promedio por parcial, actividades
 * pendientes y alertas. Nunca expone calificaciones de otros alumnos ni permite
 * escribir nada.
 */

import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { assignments, attendances, courses, enrollments, studentProfiles, submissions, tutorLinks, users } from "@/db/schema";
import { evaluarRiesgo, type NivelRiesgo } from "@/lib/academico/riesgo";
import {
  demoCrearEnlaceTutor,
  demoBuscarEnlaceTutorPorHash,
  demoFindUserById,
  demoListarEnlacesTutor,
  demoRegistrarAccesoEnlaceTutor,
  demoRevocarEnlaceTutor,
} from "@/lib/demo-store";

/** Cookie de un solo uso donde viaja el token recién creado (3 minutos). */
export const COOKIE_ENLACE_TUTOR = "cbtis270_enlace_tutor";

export const DIAS_ENLACE_POR_DEFECTO = 7;
export const DIAS_ENLACE_MAXIMO = 60;
export const ETIQUETAS_TUTOR = ["Madre", "Padre", "Tutor legal", "Tutor"] as const;

export type EnlaceTutor = {
  id: number;
  studentId: number;
  tokenPista: string;
  etiqueta: string;
  creadoPorNombre: string | null;
  expiraEn: Date;
  revocadoEn: Date | null;
  ultimoAccesoEn: Date | null;
  accesos: number;
  createdAt: Date;
};

export type AlumnoDeEnlace = {
  id: number;
  nombre: string;
  matricula: string | null;
  email: string;
  semestre: number | null;
  turno: string | null;
  grupo: string | null;
  especialidad: string | null;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function clampDias(dias?: number) {
  if (!Number.isFinite(dias)) return DIAS_ENLACE_POR_DEFECTO;
  return Math.min(Math.max(Math.floor(dias as number), 1), DIAS_ENLACE_MAXIMO);
}

function estadoDeEnlace(enlace: EnlaceTutor, ahora = new Date()): "activo" | "expirado" | "revocado" {
  if (enlace.revocadoEn) return "revocado";
  if (enlace.expiraEn.getTime() <= ahora.getTime()) return "expirado";
  return "activo";
}

export function estadoEnlace(enlace: EnlaceTutor) {
  return estadoDeEnlace(enlace);
}

/* --------------------------------- ALTA/BAJA -------------------------------- */

export async function crearEnlaceTutor(params: {
  studentId: number;
  etiqueta?: string;
  dias?: number;
  actor: { id: number; nombre: string };
}): Promise<{ ok: true; token: string; enlace: EnlaceTutor } | { ok: false; error: string }> {
  if (!Number.isFinite(params.studentId)) return { ok: false, error: "Alumno inválido." };

  const dias = clampDias(params.dias);
  const etiqueta = String(params.etiqueta ?? "Tutor").slice(0, 40) || "Tutor";
  const token = randomBytes(24).toString("base64url");
  const expiraEn = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  const base = {
    studentId: params.studentId,
    tokenHash: hashToken(token),
    tokenPista: token.slice(-6),
    etiqueta,
    creadoPorId: params.actor.id,
    creadoPorNombre: params.actor.nombre,
  };

  try {
    const [fila] = await db
      .insert(tutorLinks)
      .values({ ...base, expiraEn })
      .returning();
    if (!fila) return { ok: false, error: "No se pudo crear el enlace." };
    return { ok: true, token, enlace: fila };
  } catch {
    // Preview sin base de datos: el enlace vive en el almacén demo.
    const fila = demoCrearEnlaceTutor({ ...base, expiraEn: expiraEn.toISOString() });
    return {
      ok: true,
      token,
      enlace: {
        ...fila,
        expiraEn: new Date(fila.expiraEn),
        revocadoEn: null,
        ultimoAccesoEn: null,
        createdAt: new Date(fila.createdAt),
      },
    };
  }
}

export async function listarEnlacesDelAlumno(studentId: number): Promise<EnlaceTutor[]> {
  try {
    return await db
      .select()
      .from(tutorLinks)
      .where(eq(tutorLinks.studentId, studentId))
      .orderBy(desc(tutorLinks.createdAt));
  } catch {
    return demoListarEnlacesTutor(studentId).map((fila) => ({
      ...fila,
      expiraEn: new Date(fila.expiraEn),
      revocadoEn: fila.revocadoEn ? new Date(fila.revocadoEn) : null,
      ultimoAccesoEn: fila.ultimoAccesoEn ? new Date(fila.ultimoAccesoEn) : null,
      createdAt: new Date(fila.createdAt),
    }));
  }
}

export async function revocarEnlaceTutor(id: number, studentId: number): Promise<boolean> {
  try {
    const [fila] = await db
      .update(tutorLinks)
      .set({ revocadoEn: new Date() })
      .where(and(eq(tutorLinks.id, id), eq(tutorLinks.studentId, studentId)))
      .returning({ id: tutorLinks.id });
    return Boolean(fila);
  } catch {
    const enlace = demoListarEnlacesTutor(studentId).find((e) => e.id === id);
    if (!enlace) return false;
    demoRevocarEnlaceTutor(id);
    return true;
  }
}

/* ------------------------------- RESOLUCIÓN -------------------------------- */

export type EnlaceResuelto = {
  enlace: EnlaceTutor;
  alumno: AlumnoDeEnlace;
};

/**
 * Busca el enlace por hash y valida caducidad, revocación y que la cuenta siga
 * activa. Registra el acceso sin bloquear la consulta.
 */
export async function resolverEnlace(token: string): Promise<EnlaceResuelto | null> {
  const limpio = String(token ?? "").trim();
  if (limpio.length < 16 || limpio.length > 128) return null;
  const tokenHash = hashToken(limpio);

  try {
    const [fila] = await db
      .select({
        enlace: tutorLinks,
        alumno: users,
        perfil: studentProfiles,
      })
      .from(tutorLinks)
      .innerJoin(users, eq(users.id, tutorLinks.studentId))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(and(eq(tutorLinks.tokenHash, tokenHash), isNull(tutorLinks.revocadoEn), gt(tutorLinks.expiraEn, new Date())))
      .limit(1);

    if (!fila || !fila.alumno.activo) return null;

    try {
      await db
        .update(tutorLinks)
        .set({ ultimoAccesoEn: new Date(), accesos: fila.enlace.accesos + 1 })
        .where(eq(tutorLinks.id, fila.enlace.id));
    } catch {
      // El contador de accesos no debe impedir la consulta.
    }

    return {
      enlace: fila.enlace,
      alumno: {
        id: fila.alumno.id,
        nombre: fila.alumno.nombre,
        matricula: fila.alumno.matricula,
        email: fila.alumno.email,
        semestre: fila.alumno.semestre,
        turno: fila.alumno.turno,
        grupo: fila.perfil?.grupo ?? null,
        especialidad: fila.alumno.especialidad,
      },
    };
  } catch {
    const demo = demoBuscarEnlaceTutorPorHash(tokenHash);
    if (!demo) return null;
    if (demo.revocadoEn) return null;
    if (new Date(demo.expiraEn).getTime() <= Date.now()) return null;
    const alumno = demoFindUserById(demo.studentId);
    if (!alumno || !alumno.activo) return null;
    demoRegistrarAccesoEnlaceTutor(demo.id);
    return {
      enlace: {
        ...demo,
        expiraEn: new Date(demo.expiraEn),
        revocadoEn: null,
        ultimoAccesoEn: new Date(),
        createdAt: new Date(demo.createdAt),
      },
      alumno: {
        id: alumno.id,
        nombre: alumno.nombre,
        matricula: alumno.matricula ?? null,
        email: alumno.email,
        semestre: alumno.semestre ?? null,
        turno: alumno.turno ?? null,
        grupo: null,
        especialidad: alumno.especialidad ?? null,
      },
    };
  }
}

/* ------------------------------ DATOS DE LA VISTA --------------------------- */

export type AsistenciaPorAula = {
  cursoId: number;
  curso: string;
  clave: string;
  docente: string;
  presentes: number;
  retardos: number;
  faltas: number;
  justificados: number;
  total: number;
  porcentaje: number | null;
};

export type ParcialTutor = { parcial: number; promedio: number | null; evaluadas: number };

export type ActividadPendiente = {
  id: number;
  titulo: string;
  curso: string;
  parcial: number;
  fechaEntrega: Date;
  vencida: boolean;
};

export type ConsultaTutor = {
  alumno: AlumnoDeEnlace;
  docenteEncargado: string | null;
  aulas: AsistenciaPorAula[];
  asistencia: { presentes: number; retardos: number; faltas: number; justificados: number; total: number; porcentaje: number | null };
  parciales: ParcialTutor[];
  promedio: number | null;
  pendientes: ActividadPendiente[];
  nivelRiesgo: NivelRiesgo;
  motivosRiesgo: string[];
  actualizadoEn: Date;
};

/**
 * Junta todo lo que el tutor necesita ver. Sólo lectura y sólo del alumno del
 * enlace: no se aceptan filtros externos.
 */
export async function datosParaTutor(alumno: AlumnoDeEnlace): Promise<ConsultaTutor> {
  const vacio: ConsultaTutor = {
    alumno,
    docenteEncargado: null,
    aulas: [],
    asistencia: { presentes: 0, retardos: 0, faltas: 0, justificados: 0, total: 0, porcentaje: null },
    parciales: [1, 2, 3].map((parcial) => ({ parcial, promedio: null, evaluadas: 0 })),
    promedio: null,
    pendientes: [],
    nivelRiesgo: "ninguno",
    motivosRiesgo: [],
    actualizadoEn: new Date(),
  };

  try {
    const [perfil] = await db
      .select({ tutor: users.nombre })
      .from(studentProfiles)
      .innerJoin(users, eq(users.id, studentProfiles.tutorDocenteId))
      .where(eq(studentProfiles.userId, alumno.id))
      .limit(1);

    const aulas = await db
      .select({
        cursoId: courses.id,
        curso: courses.nombre,
        clave: courses.clave,
        docente: users.nombre,
        presentes: sqlCount("presente"),
        retardos: sqlCount("retardo"),
        faltas: sqlCount("falta"),
        justificados: sqlCount("justificado"),
      })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .innerJoin(users, eq(users.id, courses.docenteId))
      .leftJoin(
        attendances,
        and(eq(attendances.studentId, enrollments.studentId), eq(attendances.courseId, courses.id)),
      )
      .where(eq(enrollments.studentId, alumno.id))
      .groupBy(courses.id, courses.nombre, courses.clave, users.nombre);

    const tareas = await db
      .select({
        tarea: assignments,
        curso: courses.nombre,
        entrega: submissions,
      })
      .from(assignments)
      .innerJoin(courses, eq(courses.id, assignments.courseId))
      .innerJoin(enrollments, and(eq(enrollments.courseId, courses.id), eq(enrollments.studentId, alumno.id)))
      .leftJoin(
        submissions,
        and(eq(submissions.assignmentId, assignments.id), eq(submissions.studentId, alumno.id)),
      )
      .orderBy(assignments.fechaEntrega);

    const recientes = await db
      .select({ estado: attendances.estado })
      .from(attendances)
      .where(eq(attendances.studentId, alumno.id))
      .orderBy(desc(attendances.fecha))
      .limit(12);

    return calcular({
      alumno,
      docenteEncargado: perfil?.tutor ?? null,
      aulas: aulas.map((a) => {
        const total = a.presentes + a.retardos + a.faltas + a.justificados;
        return {
          ...a,
          total,
          porcentaje: total === 0 ? null : Math.round(((a.presentes + a.retardos + a.justificados) / total) * 100),
        };
      }),
      tareas: tareas.map((t) => ({
        id: t.tarea.id,
        titulo: t.tarea.titulo,
        curso: t.curso,
        parcial: t.tarea.parcial,
        activa: t.tarea.activa,
        fechaEntrega: new Date(t.tarea.fechaEntrega),
        entrega: t.entrega ? { calificacion: t.entrega.calificacion } : null,
      })),
      recientes: recientes.map((r) => r.estado),
    });
  } catch {
    // Preview sin base de datos: se muestra la ficha del alumno sin detalle.
    return vacio;
  }
}

function sqlCount(estado: string) {
  return sql<number>`count(*) filter (where ${attendances.estado} = ${estado})::int`;
}

type TareaTutor = {
  id: number;
  titulo: string;
  curso: string;
  parcial: number;
  activa: boolean;
  fechaEntrega: Date;
  entrega: { calificacion: number | null } | null;
};

function calcular(entrada: {
  alumno: AlumnoDeEnlace;
  docenteEncargado: string | null;
  aulas: AsistenciaPorAula[];
  tareas: TareaTutor[];
  recientes: string[];
}): ConsultaTutor {
  const { alumno, aulas, tareas, recientes } = entrada;

  const asistencia = {
    presentes: aulas.reduce((a, c) => a + c.presentes, 0),
    retardos: aulas.reduce((a, c) => a + c.retardos, 0),
    faltas: aulas.reduce((a, c) => a + c.faltas, 0),
    justificados: aulas.reduce((a, c) => a + c.justificados, 0),
    total: aulas.reduce((a, c) => a + c.total, 0),
    porcentaje: null as number | null,
  };
  if (asistencia.total > 0) {
    asistencia.porcentaje = Math.round(
      ((asistencia.presentes + asistencia.retardos + asistencia.justificados) / asistencia.total) * 100,
    );
  }

  const calificadas = tareas.filter(
    (t): t is TareaTutor & { entrega: { calificacion: number } } =>
      typeof t.entrega?.calificacion === "number",
  );

  const parciales = [1, 2, 3].map((parcial) => {
    const delParcial = calificadas.filter((t) => t.parcial === parcial);
    if (delParcial.length === 0) return { parcial, promedio: null, evaluadas: 0 };
    const suma = delParcial.reduce((a, t) => a + t.entrega.calificacion, 0);
    return {
      parcial,
      promedio: Math.round(suma / delParcial.length),
      evaluadas: delParcial.length,
    };
  });

  const promedio =
    calificadas.length === 0
      ? null
      : Math.round(calificadas.reduce((a, t) => a + t.entrega.calificacion, 0) / calificadas.length);

  const ahora = Date.now();
  const pendientes = tareas
    .filter((t) => t.activa && !t.entrega)
    .map((t) => ({
      id: t.id,
      titulo: t.titulo,
      curso: t.curso,
      parcial: t.parcial,
      fechaEntrega: t.fechaEntrega,
      vencida: t.fechaEntrega.getTime() < ahora,
    }));

  let faltasSeguidas = 0;
  for (const estado of recientes) {
    if (estado !== "falta") break;
    faltasSeguidas += 1;
  }

  const riesgo = evaluarRiesgo({
    faltasSeguidas,
    porcentajeAsistencia: asistencia.porcentaje,
    sinEntregar: pendientes.length,
    promedio,
  });

  return {
    alumno,
    docenteEncargado: entrada.docenteEncargado,
    aulas,
    asistencia,
    parciales,
    promedio,
    pendientes,
    nivelRiesgo: riesgo.nivel,
    motivosRiesgo: riesgo.motivos,
    actualizadoEn: new Date(),
  };
}
