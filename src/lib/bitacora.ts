/**
 * Consulta de la bitácora de auditoría.
 *
 * `audit_log` se llena desde todas las acciones sensibles de la plataforma
 * (calificaciones, formatos, reactivos, recordatorios, exportaciones). Esta capa
 * la vuelve consultable: filtros, paginación y facetas para que dirección pueda
 * responder "¿quién modificó esto y cuándo?" sin tocar la base.
 */

import { and, count, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { demoListarAuditoria } from "@/lib/demo-store";

export type FiltrosBitacora = {
  q?: string;
  accion?: string;
  entidad?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
  porPagina?: number;
};

export type FilaBitacora = {
  id: number;
  userId: number | null;
  actor: string | null;
  accion: string;
  entidad: string | null;
  entidadId: string | null;
  detalle: string | null;
  createdAt: Date;
};

export type FacetaBitacora = { valor: string; total: number };

export type ResultadoBitacora = {
  filas: FilaBitacora[];
  total: number;
  pagina: number;
  paginas: number;
  porPagina: number;
  acciones: FacetaBitacora[];
  entidades: FacetaBitacora[];
  actores: number;
};

export const BITACORA_POR_PAGINA = 40;

/** Etiquetas legibles de las acciones más frecuentes. */
export const ETIQUETA_ACCION: Record<string, string> = {
  reactivo_creado: "Reactivo creado",
  reactivo_editado: "Reactivo editado",
  reactivo_archivado: "Reactivo archivado",
  reactivo_reactivado: "Reactivo reactivado",
  cuestionario_resuelto: "Cuestionario resuelto",
  recordatorio_entrega: "Recordatorio de entrega",
  cron_recordatorios: "Recordatorios automáticos",
  enlace_tutor_creado: "Enlace de tutor creado",
  enlace_tutor_revocado: "Enlace de tutor revocado",
  exportacion_generada: "Exportación generada",
  password_restablecida: "Contraseña restablecida",
};

export function etiquetaAccion(accion: string): string {
  return ETIQUETA_ACCION[accion] ?? accion.replaceAll("_", " ");
}

function fechaInicio(valor?: string): Date | null {
  if (!valor) return null;
  const fecha = new Date(`${valor}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function fechaFinExclusiva(valor?: string): Date | null {
  if (!valor) return null;
  const fecha = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return null;
  fecha.setDate(fecha.getDate() + 1);
  return fecha;
}

/** Filtros compartidos entre la pantalla y la exportación a Excel/CSV. */
export function condicionesDeBitacora(filtros: FiltrosBitacora) {
  const condiciones = [];
  const q = filtros.q?.trim();
  if (q) {
    const patron = `%${q}%`;
    condiciones.push(
      or(
        ilike(auditLog.detalle, patron),
        ilike(auditLog.actor, patron),
        ilike(auditLog.entidad, patron),
        ilike(auditLog.accion, patron),
      ),
    );
  }
  if (filtros.accion?.trim()) condiciones.push(eq(auditLog.accion, filtros.accion.trim()));
  if (filtros.entidad?.trim()) condiciones.push(eq(auditLog.entidad, filtros.entidad.trim()));

  const desde = fechaInicio(filtros.desde);
  if (desde) condiciones.push(gte(auditLog.createdAt, desde));

  const hasta = fechaFinExclusiva(filtros.hasta);
  if (hasta) condiciones.push(lt(auditLog.createdAt, hasta));

  return condiciones;
}

const VACIO: ResultadoBitacora = {
  filas: [],
  total: 0,
  pagina: 1,
  paginas: 1,
  porPagina: BITACORA_POR_PAGINA,
  acciones: [],
  entidades: [],
  actores: 0,
};

/** Respaldo en memoria para el preview sin base de datos. */
function consultarDemo(filtros: FiltrosBitacora): ResultadoBitacora {
  const porPagina = Math.min(Math.max(filtros.porPagina ?? BITACORA_POR_PAGINA, 10), 5000);
  const pagina = Math.max(1, Math.floor(filtros.pagina ?? 1));
  const q = filtros.q?.trim().toLowerCase() ?? "";
  const desde = fechaInicio(filtros.desde);
  const hasta = fechaFinExclusiva(filtros.hasta);

  const todos = demoListarAuditoria().map((registro) => ({
    id: registro.id,
    userId: registro.userId,
    actor: registro.actor,
    accion: registro.accion,
    entidad: registro.entidad,
    entidadId: registro.entidadId,
    detalle: registro.detalle,
    createdAt: new Date(registro.createdAt),
  }));

  const filtrados = todos.filter((registro) => {
    if (filtros.accion?.trim() && registro.accion !== filtros.accion.trim()) return false;
    if (filtros.entidad?.trim() && registro.entidad !== filtros.entidad.trim()) return false;
    if (desde && registro.createdAt < desde) return false;
    if (hasta && registro.createdAt >= hasta) return false;
    if (q) {
      const texto = `${registro.actor ?? ""} ${registro.accion} ${registro.entidad ?? ""} ${registro.detalle ?? ""}`.toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  });

  const contar = (valores: Array<string | null>) => {
    const mapa = new Map<string, number>();
    for (const valor of valores) {
      if (!valor) continue;
      mapa.set(valor, (mapa.get(valor) ?? 0) + 1);
    }
    return [...mapa.entries()]
      .map(([valor, total]) => ({ valor, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  };

  return {
    filas: filtrados.slice((pagina - 1) * porPagina, pagina * porPagina),
    total: filtrados.length,
    pagina,
    paginas: Math.max(1, Math.ceil(filtrados.length / porPagina)),
    porPagina,
    acciones: contar(todos.map((r) => r.accion)),
    entidades: contar(todos.map((r) => r.entidad)),
    actores: new Set(todos.map((r) => r.userId).filter((id) => id !== null)).size,
  };
}

export async function consultarBitacora(filtros: FiltrosBitacora): Promise<ResultadoBitacora> {
  const porPagina = Math.min(Math.max(filtros.porPagina ?? BITACORA_POR_PAGINA, 10), 200);
  const pagina = Math.max(1, Math.floor(filtros.pagina ?? 1));

  try {
    const condiciones = condicionesDeBitacora(filtros);
    const donde = condiciones.length > 0 ? and(...condiciones) : undefined;

    const [totalFila] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(donde);
    const total = totalFila?.total ?? 0;

    const filas = await db
      .select()
      .from(auditLog)
      .where(donde)
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(porPagina)
      .offset((pagina - 1) * porPagina);

    // Facetas sobre todo el histórico (no sobre la página) para poder filtrar.
    const acciones = await db
      .select({ valor: auditLog.accion, total: sql<number>`count(*)::int` })
      .from(auditLog)
      .groupBy(auditLog.accion)
      .orderBy(desc(sql`count(*)`))
      .limit(15);

    const entidades = await db
      .select({ valor: auditLog.entidad, total: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(sql`${auditLog.entidad} is not null`)
      .groupBy(auditLog.entidad)
      .orderBy(desc(sql`count(*)`))
      .limit(15);

    const [actoresFila] = await db
      .select({ total: sql<number>`count(distinct ${auditLog.userId})::int` })
      .from(auditLog);

    return {
      filas,
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / porPagina)),
      porPagina,
      acciones: acciones
        .filter((a) => Boolean(a.valor))
        .map((a) => ({ valor: a.valor, total: a.total })),
      entidades: entidades
        .filter((e): e is { valor: string; total: number } => Boolean(e.valor)),
      actores: actoresFila?.total ?? 0,
    };
  } catch {
    // Sin base de datos se consulta el almacén demo.
    return consultarDemo(filtros);
  }
}

/** Sólo las acciones registradas por un usuario concreto (usado en expedientes). */
export async function actividadDeUsuario(userId: number, limite = 30) {
  try {
    return await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.userId, userId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limite);
  } catch {
    return demoListarAuditoria()
      .filter((r) => r.userId === userId)
      .slice(0, limite)
      .map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
  }
}

/** Total de registros de la bitácora (indicador del panel de seguimiento). */
export async function totalBitacora() {
  try {
    const [fila] = await db.select({ total: count() }).from(auditLog);
    return Number(fila?.total ?? 0);
  } catch {
    return demoListarAuditoria().length;
  }
}
