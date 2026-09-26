/**
 * Control de acceso de la Biblioteca de Formatos.
 *
 * Regla institucional:
 *  - Docentes y administración ven siempre el catálogo completo.
 *  - Los alumnos sólo ven un formato cuando el docente lo habilitó para su
 *    semestre. El módulo profesional determina el semestre natural del formato.
 *
 * Como el resto de la plataforma, cada consulta intenta PostgreSQL y cae al
 * almacén demo si no hay base de datos.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { formatoHabilitaciones } from "@/db/schema";
import {
  demoDeshabilitarFormato,
  demoHabilitarFormato,
  demoListarHabilitaciones,
} from "@/lib/demo-store";

export type Habilitacion = {
  codigo: string;
  tipo: string;
  modulo: number;
  semestre: number;
};

/** Semestre en el que se cursa cada módulo profesional del plan DGETI. */
export const SEMESTRE_DE_MODULO: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
};

export const SEMESTRES_DISPONIBLES = [2, 3, 4, 5, 6];

/** Módulo que corresponde a un semestre dado (inverso de SEMESTRE_DE_MODULO). */
export function moduloDeSemestre(semestre: number | null | undefined): number | null {
  if (!semestre) return null;
  const entrada = Object.entries(SEMESTRE_DE_MODULO).find(([, sem]) => sem === semestre);
  return entrada ? Number(entrada[0]) : null;
}

async function conRespaldo<T>(consulta: () => Promise<T>, respaldo: () => T, etiqueta: string): Promise<T> {
  try {
    return await consulta();
  } catch (error) {
    console.warn(
      `[formatos/acceso] ${etiqueta} sin base de datos, usando modo demo:`,
      (error as Error).message?.slice(0, 150),
    );
    return respaldo();
  }
}

/** Todas las habilitaciones vigentes. */
export async function listarHabilitaciones(): Promise<Habilitacion[]> {
  return conRespaldo(
    async () => {
      const filas = await db
        .select({
          codigo: formatoHabilitaciones.codigo,
          tipo: formatoHabilitaciones.tipo,
          modulo: formatoHabilitaciones.modulo,
          semestre: formatoHabilitaciones.semestre,
        })
        .from(formatoHabilitaciones);
      return filas as Habilitacion[];
    },
    () => demoListarHabilitaciones(),
    "listarHabilitaciones",
  );
}

/** Clave estable para consultar una habilitación concreta. */
export function claveHabilitacion(codigo: string, semestre: number) {
  return `${codigo}|${semestre}`;
}

/** Conjunto de claves `codigo|semestre` habilitadas, para búsquedas O(1). */
export async function clavesHabilitadas(): Promise<Set<string>> {
  const lista = await listarHabilitaciones();
  return new Set(lista.map((h) => claveHabilitacion(h.codigo, h.semestre)));
}

export async function habilitarFormato(datos: {
  codigo: string;
  tipo: string;
  modulo: number;
  semestre: number;
  docenteId: number;
}) {
  return conRespaldo(
    async () => {
      await db
        .insert(formatoHabilitaciones)
        .values(datos)
        .onConflictDoNothing({
          target: [formatoHabilitaciones.codigo, formatoHabilitaciones.semestre],
        });
    },
    () => demoHabilitarFormato(datos),
    "habilitarFormato",
  );
}

export async function deshabilitarFormato(codigo: string, semestre: number) {
  return conRespaldo(
    async () => {
      await db
        .delete(formatoHabilitaciones)
        .where(
          and(
            eq(formatoHabilitaciones.codigo, codigo),
            eq(formatoHabilitaciones.semestre, semestre),
          ),
        );
    },
    () => demoDeshabilitarFormato(codigo, semestre),
    "deshabilitarFormato",
  );
}

/** El catálogo completo sólo es visible para docencia y administración. */
export function veTodoElCatalogo(rol: string) {
  return rol === "docente" || rol === "admin";
}

/**
 * Determina si un usuario puede ver un formato concreto.
 * El alumno necesita una habilitación vigente para su semestre.
 */
export function puedeVerFormato(
  user: { rol: string; semestre?: number | null },
  codigo: string,
  habilitadas: Set<string>,
) {
  if (veTodoElCatalogo(user.rol)) return true;
  if (!user.semestre) return false;
  return habilitadas.has(claveHabilitacion(codigo, user.semestre));
}
