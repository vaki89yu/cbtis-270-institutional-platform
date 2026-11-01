/**
 * Recordatorios automáticos (cron diario).
 *
 * Tres trabajos, todos idempotentes:
 *  1. Actividades que cierran en las próximas 48 horas.
 *  2. Actividades que ya vencieron y siguen sin entrega (últimos 7 días).
 *  3. Resumen semanal para cada docente con pendientes de sus aulas (lunes).
 *
 * Cada aviso llega como notificación interna y, si hay SMTP configurado, por
 * correo. La deduplicación se hace contra la tabla `notifications`: el mismo
 * alumno no recibe dos veces el aviso de la misma actividad en 72 horas.
 *
 * La planeación está separada de la base de datos (`planearAvisos`) para poder
 * probar las reglas sin Postgres.
 */

import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { assignments, courses, enrollments, notifications, submissions, users } from "@/db/schema";
import { crearNotificacion } from "@/lib/notificaciones";
import { enviarCorreo } from "@/lib/email";
import { registrarAuditoria } from "@/lib/auditoria";

export const VENTANA_POR_VENCER_HORAS = 48;
export const VENTANA_VENCIDAS_DIAS = 7;
export const VENTANA_DEDUPE_HORAS = 72;
export const MAX_CORREOS_POR_EJECUCION = 60;

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

export type TareaRecordatorio = {
  id: number;
  courseId: number;
  curso: string;
  titulo: string;
  fechaEntrega: Date;
  parcial: number;
};

export type InscritoRecordatorio = {
  courseId: number;
  id: number;
  nombre: string;
  email: string;
};

export type EntregaRecordatorio = { assignmentId: number; studentId: number };

export type AvisoRecordatorio = {
  userId: number;
  nombre: string;
  email: string;
  titulo: string;
  contenido: string;
  tareaId: number;
  tareaTitulo: string;
  curso: string;
  fechaEntrega: Date;
  vencida: boolean;
};

export type ResumenTrabajo = { tareas: number; avisos: number; correos: number };

export type ResultadoRecordatorios = {
  ok: boolean;
  ejecutadoEn: string;
  modo: "diario" | "semanal" | "completo";
  porVencer: ResumenTrabajo;
  vencidas: ResumenTrabajo;
  resumenSemanal: { docentes: number; correos: number } | null;
  duplicadosOmitidos: number;
  sinBaseDeDatos?: boolean;
  mensajes: string[];
};

const formatoFecha = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function fechaLegible(fecha: Date) {
  return formatoFecha.format(fecha);
}

/** Clave de deduplicación: un aviso por alumno y actividad. */
export function claveAviso(userId: number, titulo: string) {
  return `${userId}|${titulo}`;
}

/* ------------------------------- PLANEACIÓN -------------------------------- */

/**
 * Decide qué avisos se envían. No toca la base de datos: recibe las tareas
 * candidatas, quién está inscrito, qué ya se entregó y qué ya se avisó.
 */
export function planearAvisos(entrada: {
  tareas: TareaRecordatorio[];
  inscritos: InscritoRecordatorio[];
  entregas: EntregaRecordatorio[];
  yaAvisados: Set<string>;
  ahora: Date;
}): { porVencer: AvisoRecordatorio[]; vencidas: AvisoRecordatorio[]; duplicadosOmitidos: number } {
  const { tareas, inscritos, entregas, yaAvisados, ahora } = entrada;
  const horizonte = ahora.getTime() + VENTANA_POR_VENCER_HORAS * HORA;
  const pisoVencidas = ahora.getTime() - VENTANA_VENCIDAS_DIAS * DIA;

  const porCurso = new Map<number, InscritoRecordatorio[]>();
  for (const alumno of inscritos) {
    const lista = porCurso.get(alumno.courseId) ?? [];
    lista.push(alumno);
    porCurso.set(alumno.courseId, lista);
  }

  const entregado = new Set(entregas.map((e) => `${e.assignmentId}|${e.studentId}`));

  const porVencer: AvisoRecordatorio[] = [];
  const vencidas: AvisoRecordatorio[] = [];
  let duplicadosOmitidos = 0;

  for (const tarea of tareas) {
    const fecha = tarea.fechaEntrega.getTime();
    const yaVencio = fecha <= ahora.getTime();
    if (!yaVencio && fecha > horizonte) continue;
    if (yaVencio && fecha < pisoVencidas) continue;

    const titulo = yaVencio ? `Entrega vencida · ${tarea.titulo}` : `Cierra pronto · ${tarea.titulo}`;
    const cuando = fechaLegible(tarea.fechaEntrega);
    const contenido = yaVencio
      ? `No registramos tu entrega de "${tarea.titulo}" en ${tarea.curso}. La fecha límite fue el ${cuando}. Sube tu evidencia o habla con tu docente.`
      : `Te falta entregar "${tarea.titulo}" en ${tarea.curso}. La fecha límite es el ${cuando}. Entra al aula y sube tu evidencia.`;

    for (const alumno of porCurso.get(tarea.courseId) ?? []) {
      if (entregado.has(`${tarea.id}|${alumno.id}`)) continue;
      if (yaAvisados.has(claveAviso(alumno.id, titulo))) {
        duplicadosOmitidos += 1;
        continue;
      }
      const aviso: AvisoRecordatorio = {
        userId: alumno.id,
        nombre: alumno.nombre,
        email: alumno.email,
        titulo,
        contenido,
        tareaId: tarea.id,
        tareaTitulo: tarea.titulo,
        curso: tarea.curso,
        fechaEntrega: tarea.fechaEntrega,
        vencida: yaVencio,
      };
      // Un mismo alumno puede estar inscrito en dos aulas con la misma tarea:
      // el set evita duplicados dentro de la misma corrida.
      yaAvisados.add(claveAviso(alumno.id, titulo));
      if (yaVencio) vencidas.push(aviso);
      else porVencer.push(aviso);
    }
  }

  return { porVencer, vencidas, duplicadosOmitidos };
}

export function plantillaAviso(aviso: AvisoRecordatorio) {
  const cuando = fechaLegible(aviso.fechaEntrega);
  const url = "https://cbtis-270-institutional-platform.vercel.app/panel/tareas";
  return {
    asunto: `${aviso.titulo} · CBTIS 270`,
    texto: `${aviso.nombre}: ${aviso.contenido} Entra a ${url}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f4f6f5;padding:24px">
        <div style="max-width:520px;margin:auto;background:white;border-radius:18px;padding:28px;border:1px solid #d7e5dd">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1D5BD5">CBTIS No. 270 · Logística</p>
          <h1 style="margin:10px 0 6px;font-size:20px;color:#0f172a">${aviso.titulo}</h1>
          <p style="margin:0 0 12px;font-size:14px;color:#475569">Hola ${aviso.nombre},</p>
          <p style="margin:0 0 12px;font-size:14px;color:#475569">${aviso.contenido}</p>
          <a href="${url}" style="display:inline-block;background:#1D5BD5;color:white;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:10px">Abrir mis actividades</a>
          <p style="margin:20px 0 0;font-size:11px;color:#94a3b8">Aviso automático de la plataforma. Si ya entregaste, ignora este mensaje.</p>
        </div>
      </div>`,
  };
}

/* --------------------------------- CONSULTAS -------------------------------- */

type TareaConCurso = TareaRecordatorio & { docenteId: number };

async function tareasCandidatas(ahora: Date): Promise<TareaConCurso[]> {
  return db
    .select({
      id: assignments.id,
      courseId: assignments.courseId,
      curso: courses.nombre,
      titulo: assignments.titulo,
      fechaEntrega: assignments.fechaEntrega,
      parcial: assignments.parcial,
      docenteId: courses.docenteId,
    })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .where(
      and(
        eq(assignments.activa, true),
        eq(courses.activo, true),
        gte(assignments.fechaEntrega, new Date(ahora.getTime() - VENTANA_VENCIDAS_DIAS * DIA)),
        lte(assignments.fechaEntrega, new Date(ahora.getTime() + VENTANA_POR_VENCER_HORAS * HORA)),
      ),
    );
}

async function inscritosDeCursos(courseIds: number[]): Promise<InscritoRecordatorio[]> {
  if (courseIds.length === 0) return [];
  return db
    .select({
      courseId: enrollments.courseId,
      id: users.id,
      nombre: users.nombre,
      email: users.email,
    })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .where(and(inArray(enrollments.courseId, courseIds), eq(users.activo, true), eq(users.rol, "estudiante")));
}

async function entregasDeTareas(assignmentIds: number[]): Promise<EntregaRecordatorio[]> {
  if (assignmentIds.length === 0) return [];
  return db
    .select({ assignmentId: submissions.assignmentId, studentId: submissions.studentId })
    .from(submissions)
    .where(inArray(submissions.assignmentId, assignmentIds));
}

async function avisosRecientes(desde: Date, titulos: string[], userIds: number[]): Promise<Set<string>> {
  if (titulos.length === 0 || userIds.length === 0) return new Set();
  const filas = await db
    .select({ userId: notifications.userId, titulo: notifications.titulo })
    .from(notifications)
    .where(
      and(
        eq(notifications.tipo, "recordatorio"),
        gte(notifications.createdAt, desde),
        inArray(notifications.titulo, titulos),
        inArray(notifications.userId, userIds),
      ),
    );
  return new Set(filas.map((f) => claveAviso(f.userId, f.titulo)));
}

/* --------------------------------- ENVÍO ---------------------------------- */

async function enviarAvisos(
  avisos: AvisoRecordatorio[],
  contexto: string,
  correosRestantes: number,
): Promise<{ enviados: number; correos: number; mensajes: string[] }> {
  const mensajes: string[] = [];
  let enviados = 0;
  let correos = 0;

  for (const aviso of avisos) {
    await crearNotificacion(aviso.userId, aviso.titulo, aviso.contenido, "recordatorio");
    enviados += 1;

    if (correos < correosRestantes && aviso.email) {
      try {
        const correo = plantillaAviso(aviso);
        const resultado = await enviarCorreo({
          para: aviso.email,
          asunto: correo.asunto,
          texto: correo.texto,
          html: correo.html,
        });
        if (resultado.sent) correos += 1;
      } catch (error) {
        mensajes.push(`Correo falló para ${aviso.email}: ${(error as Error).message?.slice(0, 80)}`);
      }
    }
  }

  if (enviados > 0) {
    mensajes.push(`${contexto}: ${enviados} aviso(s) interno(s), ${correos} correo(s).`);
  }
  return { enviados, correos, mensajes };
}

async function resumenSemanalDocentes(
  ahora: Date,
  correosDisponibles: number,
): Promise<{ docentes: number; correos: number; mensajes: string[] }> {
  const mensajes: string[] = [];

  const tareas = await db
    .select({
      docenteId: users.id,
      docente: users.nombre,
      email: users.email,
      curso: courses.nombre,
      titulo: assignments.titulo,
      fechaEntrega: assignments.fechaEntrega,
      inscritos: sql<number>`count(${enrollments.id})::int`,
      entregas: sql<number>`count(${submissions.id})::int`,
    })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .innerJoin(users, eq(users.id, courses.docenteId))
    .leftJoin(enrollments, eq(enrollments.courseId, courses.id))
    .leftJoin(submissions, eq(submissions.assignmentId, assignments.id))
    .where(
      and(
        eq(assignments.activa, true),
        eq(courses.activo, true),
        eq(users.activo, true),
        gte(assignments.fechaEntrega, new Date(ahora.getTime() - VENTANA_VENCIDAS_DIAS * DIA)),
        lte(assignments.fechaEntrega, new Date(ahora.getTime() + VENTANA_POR_VENCER_HORAS * HORA)),
      ),
    )
    .groupBy(users.id, users.nombre, users.email, courses.nombre, assignments.titulo, assignments.fechaEntrega);

  const porDocente = new Map<
    number,
    { nombre: string; email: string; pendientes: number; vencidas: number; tareas: string[] }
  >();

  for (const fila of tareas) {
    const pendientes = Math.max(0, (fila.inscritos ?? 0) - (fila.entregas ?? 0));
    if (pendientes === 0) continue;
    const actual =
      porDocente.get(fila.docenteId) ??
      { nombre: fila.docente, email: fila.email, pendientes: 0, vencidas: 0, tareas: [] as string[] };
    actual.pendientes += pendientes;
    const vencida = fila.fechaEntrega.getTime() <= ahora.getTime();
    if (vencida) actual.vencidas += pendientes;
    if (actual.tareas.length < 6) {
      actual.tareas.push(
        `${fila.titulo} (${fila.curso})${vencida ? " — vencida" : " — por cerrar"}`,
      );
    }
    porDocente.set(fila.docenteId, actual);
  }

  let correos = 0;
  for (const [docenteId, datos] of porDocente) {
    const titulo = "Resumen semanal de entregas";
    const contenido = `Tienes ${datos.pendientes} entrega(s) pendiente(s) en tus aulas (${datos.vencidas} ya vencidas): ${datos.tareas.join("; ")}${datos.tareas.length === 6 ? "; …" : ""}. Revisa /panel/tareas para recordar al grupo.`;
    await crearNotificacion(docenteId, titulo, contenido, "sistema");

    if (correos < correosDisponibles) {
      try {
        const resultado = await enviarCorreo({
          para: datos.email,
          asunto: "Resumen semanal de entregas · CBTIS 270",
          texto: `${datos.nombre}: ${contenido}`,
          html: `
            <div style="font-family:Arial,sans-serif;background:#f4f6f5;padding:24px">
              <div style="max-width:520px;margin:auto;background:white;border-radius:18px;padding:28px;border:1px solid #d7e5dd">
                <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1D5BD5">CBTIS No. 270 · Logística</p>
                <h1 style="margin:10px 0 6px;font-size:20px;color:#0f172a">Resumen semanal de entregas</h1>
                <p style="margin:0 0 12px;font-size:14px;color:#475569">Hola ${datos.nombre},</p>
                <p style="margin:0 0 8px;font-size:14px;color:#475569">${contenido}</p>
                <p style="margin:0 0 18px;font-size:13px;color:#64748b">Actividades con pendientes:</p>
                <ul style="margin:0 0 18px;padding-left:18px;font-size:13px;color:#334155">
                  ${datos.tareas.map((t) => `<li>${t}</li>`).join("")}
                </ul>
                <a href="https://cbtis-270-institutional-platform.vercel.app/panel/tareas" style="display:inline-block;background:#1D5BD5;color:white;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:10px">Ir a mis actividades</a>
              </div>
            </div>`,
        });
        if (resultado.sent) correos += 1;
      } catch (error) {
        mensajes.push(`Correo semanal falló para ${datos.email}: ${(error as Error).message?.slice(0, 80)}`);
      }
    }
  }

  if (porDocente.size > 0) {
    mensajes.push(`Resumen semanal: ${porDocente.size} docente(s), ${correos} correo(s).`);
  }
  return { docentes: porDocente.size, correos, mensajes };
}

/* ------------------------------- EJECUCIÓN -------------------------------- */

export async function ejecutarRecordatorios(opciones: {
  semanal?: boolean;
  soloDiario?: boolean;
  soloSemanal?: boolean;
} = {}): Promise<ResultadoRecordatorios> {
  const ahora = new Date();
  const modo: ResultadoRecordatorios["modo"] = opciones.soloSemanal
    ? "semanal"
    : opciones.soloDiario
      ? "diario"
      : opciones.semanal
        ? "semanal"
        : "completo";

  const vacio: ResultadoRecordatorios = {
    ok: false,
    ejecutadoEn: ahora.toISOString(),
    modo,
    porVencer: { tareas: 0, avisos: 0, correos: 0 },
    vencidas: { tareas: 0, avisos: 0, correos: 0 },
    resumenSemanal: null,
    duplicadosOmitidos: 0,
    mensajes: [],
  };

  if (opciones.soloSemanal) {
    try {
      const resumen = await resumenSemanalDocentes(ahora, MAX_CORREOS_POR_EJECUCION);
      await registrarAuditoria({
        userId: null,
        actor: "Sistema (cron)",
        accion: "cron_recordatorios",
        entidad: "cron",
        entidadId: ahora.toISOString().slice(0, 10),
        detalle: `Resumen semanal: ${resumen.docentes} docente(s), ${resumen.correos} correo(s)`,
      });
      return {
        ...vacio,
        ok: true,
        resumenSemanal: { docentes: resumen.docentes, correos: resumen.correos },
        mensajes: resumen.mensajes,
      };
    } catch (error) {
      const mensaje = (error as Error).message?.slice(0, 160) ?? "error desconocido";
      return {
        ...vacio,
        sinBaseDeDatos: true,
        mensajes: ["No hay conexión con PostgreSQL: no se envió el resumen semanal.", `Detalle: ${mensaje}`],
      };
    }
  }

  try {
    const tareas = await tareasCandidatas(ahora);
    const courseIds = [...new Set(tareas.map((t) => t.courseId))];
    const inscritos = await inscritosDeCursos(courseIds);
    const entregas = await entregasDeTareas(tareas.map((t) => t.id));

    const titulos = [
      ...new Set(tareas.map((t) => `Cierra pronto · ${t.titulo}`).concat(tareas.map((t) => `Entrega vencida · ${t.titulo}`))),
    ];
    const yaAvisados = await avisosRecientes(
      new Date(ahora.getTime() - VENTANA_DEDUPE_HORAS * HORA),
      titulos,
      [...new Set(inscritos.map((i) => i.id))],
    );

    const plan = planearAvisos({ tareas, inscritos, entregas, yaAvisados, ahora });

    const porVencer = await enviarAvisos(plan.porVencer, "Por vencer (48 h)", MAX_CORREOS_POR_EJECUCION);
    const correosRestantes = Math.max(0, MAX_CORREOS_POR_EJECUCION - porVencer.correos);
    const vencidas = await enviarAvisos(plan.vencidas, "Vencidas", correosRestantes);

    let resumenSemanal: { docentes: number; correos: number } | null = null;
    const mensajes = [...porVencer.mensajes, ...vencidas.mensajes];

    if (!opciones.soloDiario) {
      const correosParaSemanal = Math.max(0, correosRestantes - vencidas.correos);
      const resumen = await resumenSemanalDocentes(ahora, correosParaSemanal);
      resumenSemanal = { docentes: resumen.docentes, correos: resumen.correos };
      mensajes.push(...resumen.mensajes);
    }

    const resultado: ResultadoRecordatorios = {
      ok: true,
      ejecutadoEn: ahora.toISOString(),
      modo,
      porVencer: {
        tareas: new Set(plan.porVencer.map((a) => a.tareaId)).size,
        avisos: porVencer.enviados,
        correos: porVencer.correos,
      },
      vencidas: {
        tareas: new Set(plan.vencidas.map((a) => a.tareaId)).size,
        avisos: vencidas.enviados,
        correos: vencidas.correos,
      },
      resumenSemanal,
      duplicadosOmitidos: plan.duplicadosOmitidos,
      mensajes,
    };

    await registrarAuditoria({
      userId: null,
      actor: "Sistema (cron)",
      accion: "cron_recordatorios",
      entidad: "cron",
      entidadId: ahora.toISOString().slice(0, 10),
      detalle: `Por vencer: ${resultado.porVencer.avisos} aviso(s) en ${resultado.porVencer.tareas} actividad(es); vencidas: ${resultado.vencidas.avisos} aviso(s); resumen semanal: ${resumenSemanal?.docentes ?? 0} docente(s); duplicados omitidos: ${resultado.duplicadosOmitidos}`,
    });

    return resultado;
  } catch (error) {
    const mensaje = (error as Error).message?.slice(0, 160) ?? "error desconocido";
    console.warn("[recordatorios] Sin base de datos:", mensaje);
    return {
      ...vacio,
      sinBaseDeDatos: true,
      mensajes: [
        "No hay conexión con PostgreSQL: el cron no envió avisos.",
        `Detalle: ${mensaje}`,
      ],
    };
  }
}
