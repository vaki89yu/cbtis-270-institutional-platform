/**
 * Calendario de entregas.
 *
 * Reúne las actividades con fecha de entrega del mes visible, ya filtradas por
 * rol: dirección ve todo el plantel, el docente sus aulas (propias o donde es
 * co-docente) y el estudiante las de sus aulas inscritas.
 *
 * Las fechas se presentan en la zona del plantel (Ciudad Juárez). Los cortes de
 * mes se calculan con 00:00 local (UTC−6, huso de invierno de la frontera).
 */

import { and, count, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { assignments, courses, enrollments, submissions } from "@/db/schema";
import { aulasAdministradasPor, type SesionAula } from "@/lib/permisos-aula";

export const ZONA_PLANTEL = "America/Ciudad_Juarez";

export type EventoCalendario = {
  id: number;
  titulo: string;
  cursoId: number;
  curso: string;
  color: string;
  fechaEntrega: Date;
  parcial: number;
  puntos: number;
  /** Estudiante: true si ya entregó, false si le falta, null si no aplica. */
  entregado: boolean | null;
  /** Docente/dirección: entregas faltantes del grupo, null para alumnos. */
  pendientes: number | null;
  inscritos: number | null;
};

export type Calendario = {
  mes: string;
  tituloMes: string;
  inicio: Date;
  fin: Date;
  eventos: EventoCalendario[];
  aulas: Array<{ id: number; nombre: string }>;
  aulaSeleccionada: number | null;
  /** Día de hoy (clave YYYY-MM-DD) calculado en el servidor, no en el render. */
  hoyClave: string;
  sinBaseDeDatos?: boolean;
};

export function mesActual(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_PLANTEL,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(ahora);
  const anio = partes.find((p) => p.type === "year")?.value ?? "2026";
  const mes = partes.find((p) => p.type === "month")?.value ?? "01";
  return `${anio}-${mes}`;
}

/** Valida "YYYY-MM" y devuelve sus límites en UTC (00:00 local del plantel). */
export function rangoDelMes(mes: string) {
  const coincide = /^(\d{4})-(\d{2})$/.exec(mes) ? mes : mesActual();
  const [anioTexto, mesTexto] = coincide.split("-");
  const anio = Number(anioTexto);
  const numeroMes = Number(mesTexto);
  const inicio = new Date(Date.UTC(anio, numeroMes - 1, 1, 6, 0, 0));
  const fin = new Date(Date.UTC(anio, numeroMes, 1, 6, 0, 0));
  return { mes: coincide, inicio, fin };
}

export function tituloDelMes(mes: string) {
  const { inicio } = rangoDelMes(mes);
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA_PLANTEL,
    month: "long",
    year: "numeric",
  }).format(inicio);
}

export function mesVecino(mes: string, delta: number) {
  const { inicio } = rangoDelMes(mes);
  const fecha = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + delta, 1, 12, 0, 0));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function claveDia(fecha: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_PLANTEL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

export function horaLocal(fecha: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA_PLANTEL,
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

export async function eventosDelMes(
  user: SesionAula,
  opciones: { mes?: string; aula?: number } = {},
): Promise<Calendario> {
  const { mes, inicio, fin } = rangoDelMes(opciones.mes ?? mesActual());

  const base: Calendario = {
    mes,
    tituloMes: tituloDelMes(mes),
    inicio,
    fin,
    eventos: [],
    aulas: [],
    aulaSeleccionada: opciones.aula ?? null,
    hoyClave: claveDia(new Date()),
  };

  try {
    let idsAulas: number[] | null = null;
    if (user.rol === "docente") idsAulas = await aulasAdministradasPor(user);
    if (user.rol === "estudiante") {
      const inscripciones = await db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(eq(enrollments.studentId, user.id));
      idsAulas = inscripciones.map((i) => i.courseId);
    }

    const aulasVisibles = await db
      .select({ id: courses.id, nombre: courses.nombre })
      .from(courses)
      .where(
        idsAulas === null
          ? eq(courses.activo, true)
          : and(eq(courses.activo, true), inArray(courses.id, idsAulas.length > 0 ? idsAulas : [-1])),
      )
      .orderBy(courses.nombre);

    const filtroAula =
      opciones.aula && aulasVisibles.some((a) => a.id === opciones.aula) ? [opciones.aula] : null;
    const idsConsulta = filtroAula ?? (idsAulas === null ? null : idsAulas.length > 0 ? idsAulas : [-1]);

    if (idsConsulta !== null && idsConsulta.length === 0) {
      return { ...base, aulas: aulasVisibles };
    }

    const filas = await db
      .select({
        id: assignments.id,
        titulo: assignments.titulo,
        cursoId: courses.id,
        curso: courses.nombre,
        color: courses.color,
        fechaEntrega: assignments.fechaEntrega,
        parcial: assignments.parcial,
        puntos: assignments.puntos,
      })
      .from(assignments)
      .innerJoin(courses, eq(courses.id, assignments.courseId))
      .where(
        and(
          eq(assignments.activa, true),
          eq(courses.activo, true),
          gte(assignments.fechaEntrega, inicio),
          lt(assignments.fechaEntrega, fin),
          idsConsulta === null ? undefined : inArray(assignments.courseId, idsConsulta),
        ),
      )
      .orderBy(assignments.fechaEntrega);

    const idsTareas = filas.map((f) => f.id);
    const idsCursos = [...new Set(filas.map((f) => f.cursoId))];

    let entregadoPorTarea = new Map<number, boolean>();
    let entregasPorTarea = new Map<number, number>();
    let inscritosPorCurso = new Map<number, number>();

    if (idsTareas.length > 0) {
      if (user.rol === "estudiante") {
        const propias = await db
          .select({ assignmentId: submissions.assignmentId })
          .from(submissions)
          .where(and(eq(submissions.studentId, user.id), inArray(submissions.assignmentId, idsTareas)));
        entregadoPorTarea = new Map(propias.map((p) => [p.assignmentId, true]));
      } else {
        const entregas = await db
          .select({ assignmentId: submissions.assignmentId, total: count() })
          .from(submissions)
          .where(inArray(submissions.assignmentId, idsTareas))
          .groupBy(submissions.assignmentId);
        entregasPorTarea = new Map(entregas.map((e) => [e.assignmentId, Number(e.total)]));

        const inscritos = await db
          .select({ courseId: enrollments.courseId, total: count() })
          .from(enrollments)
          .where(inArray(enrollments.courseId, idsCursos))
          .groupBy(enrollments.courseId);
        inscritosPorCurso = new Map(inscritos.map((i) => [i.courseId, Number(i.total)]));
      }
    }

    const eventos: EventoCalendario[] = filas.map((fila) => {
      const inscritos = inscritosPorCurso.get(fila.cursoId) ?? null;
      const entregas = entregasPorTarea.get(fila.id) ?? 0;
      return {
        ...fila,
        entregado: user.rol === "estudiante" ? entregadoPorTarea.has(fila.id) : null,
        pendientes: user.rol === "estudiante" || inscritos === null ? null : Math.max(0, inscritos - entregas),
        inscritos,
      };
    });

    return {
      ...base,
      eventos,
      aulas: aulasVisibles,
      aulaSeleccionada: filtroAula ? filtroAula[0] : null,
    };
  } catch (error) {
    console.warn("[calendario] Sin base de datos:", (error as Error).message?.slice(0, 130));
    return { ...base, sinBaseDeDatos: true };
  }
}
