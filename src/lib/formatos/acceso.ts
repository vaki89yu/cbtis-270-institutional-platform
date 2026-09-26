/**
 * Control de acceso de la Biblioteca de Formatos.
 *
 * Regla institucional:
 *  - Docencia y administración ven siempre el catálogo completo.
 *  - Cuando un docente habilita un formato, lo habilita para el ámbito que él
 *    mismo declaró en su registro: su módulo, su semestre y su(s) grupo(s).
 *  - Un alumno ve ese formato sólo si coinciden las tres cosas de su propio
 *    registro: su semestre, su grupo y el docente que eligió como tutor.
 *
 * Como el resto de la plataforma, cada consulta intenta PostgreSQL y cae al
 * almacén demo si no hay base de datos.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { formatoHabilitaciones, studentProfiles, teacherProfiles } from "@/db/schema";
import {
  demoDeshabilitarFormato,
  demoHabilitarFormato,
  demoListarHabilitaciones,
  demoPerfilAlumno,
  demoPerfilDocente,
} from "@/lib/demo-store";

export type Habilitacion = {
  codigo: string;
  tipo: string;
  modulo: number;
  semestre: number;
  grupo: string;
  turno: string | null;
  docenteId: number | null;
};

/** Ámbito que el docente declaró en su registro. */
export type AmbitoDocente = {
  docenteId: number;
  modulo: number | null;
  semestre: number | null;
  grupos: string[];
  turno: string | null;
  /** Falta semestre o grupo: no puede habilitar hasta completar su registro. */
  incompleto: boolean;
};

/** Datos del alumno que determinan qué formatos ve. */
export type AmbitoAlumno = {
  semestre: number | null;
  grupo: string | null;
  tutorDocenteId: number | null;
  incompleto: boolean;
};

/** Semestre en el que se cursa cada módulo profesional del plan DGETI. */
export const SEMESTRE_DE_MODULO: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
};

async function conRespaldo<T>(
  consulta: () => Promise<T>,
  respaldo: () => T,
  etiqueta: string,
): Promise<T> {
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

function listaGrupos(valor: string | null | undefined): string[] {
  if (!valor) return [];
  return valor
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ *
 * Ámbitos declarados en el registro
 * ------------------------------------------------------------------ */

/** Módulo, semestre y grupos que el docente declaró al registrarse. */
export async function ambitoDocente(user: {
  id: number;
  semestre?: number | null;
  turno?: string | null;
}): Promise<AmbitoDocente> {
  const perfil = await conRespaldo(
    async () => {
      const [fila] = await db
        .select()
        .from(teacherProfiles)
        .where(eq(teacherProfiles.userId, user.id))
        .limit(1);
      return fila ?? null;
    },
    () => demoPerfilDocente(user.id),
    "ambitoDocente",
  );

  const semestre = perfil?.semestreResponsable ?? user.semestre ?? null;
  const grupos =
    listaGrupos(perfil?.gruposResponsables).length > 0
      ? listaGrupos(perfil?.gruposResponsables)
      : perfil?.grupoResponsable
        ? [perfil.grupoResponsable]
        : [];
  const turno =
    listaGrupos(perfil?.turnosResponsables)[0] ?? perfil?.turnoResponsable ?? user.turno ?? null;

  return {
    docenteId: user.id,
    modulo: perfil?.moduloNumero ?? null,
    semestre,
    grupos,
    turno,
    incompleto: !semestre || grupos.length === 0,
  };
}

/** Semestre, grupo y docente tutor que el alumno declaró al registrarse. */
export async function ambitoAlumno(user: {
  id: number;
  semestre?: number | null;
}): Promise<AmbitoAlumno> {
  const perfil = await conRespaldo(
    async () => {
      const [fila] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, user.id))
        .limit(1);
      return fila ?? null;
    },
    () => demoPerfilAlumno(user.id),
    "ambitoAlumno",
  );

  const semestre = user.semestre ?? null;
  const grupo = perfil?.grupo ?? null;
  const tutorDocenteId = perfil?.tutorDocenteId ?? null;

  return {
    semestre,
    grupo,
    tutorDocenteId,
    incompleto: !semestre || !grupo || !tutorDocenteId,
  };
}

/* ------------------------------------------------------------------ *
 * Habilitaciones
 * ------------------------------------------------------------------ */

export async function listarHabilitaciones(): Promise<Habilitacion[]> {
  return conRespaldo(
    async () => {
      const filas = await db
        .select({
          codigo: formatoHabilitaciones.codigo,
          tipo: formatoHabilitaciones.tipo,
          modulo: formatoHabilitaciones.modulo,
          semestre: formatoHabilitaciones.semestre,
          grupo: formatoHabilitaciones.grupo,
          turno: formatoHabilitaciones.turno,
          docenteId: formatoHabilitaciones.docenteId,
        })
        .from(formatoHabilitaciones);
      return filas as Habilitacion[];
    },
    () => demoListarHabilitaciones() as Habilitacion[],
    "listarHabilitaciones",
  );
}

export async function habilitarFormato(datos: {
  codigo: string;
  tipo: string;
  modulo: number;
  semestre: number;
  grupo: string;
  turno: string | null;
  docenteId: number;
}) {
  return conRespaldo(
    async () => {
      await db
        .insert(formatoHabilitaciones)
        .values(datos)
        .onConflictDoNothing({
          target: [
            formatoHabilitaciones.codigo,
            formatoHabilitaciones.docenteId,
            formatoHabilitaciones.semestre,
            formatoHabilitaciones.grupo,
          ],
        });
    },
    () => demoHabilitarFormato(datos),
    "habilitarFormato",
  );
}

export async function deshabilitarFormato(
  codigo: string,
  docenteId: number,
  semestre: number,
  grupo: string,
) {
  return conRespaldo(
    async () => {
      await db
        .delete(formatoHabilitaciones)
        .where(
          and(
            eq(formatoHabilitaciones.codigo, codigo),
            eq(formatoHabilitaciones.docenteId, docenteId),
            eq(formatoHabilitaciones.semestre, semestre),
            eq(formatoHabilitaciones.grupo, grupo),
          ),
        );
    },
    () => demoDeshabilitarFormato(codigo, docenteId, semestre, grupo),
    "deshabilitarFormato",
  );
}

/* ------------------------------------------------------------------ *
 * Reglas de visibilidad
 * ------------------------------------------------------------------ */

/** El catálogo completo sólo es visible para docencia y administración. */
export function veTodoElCatalogo(rol: string) {
  return rol === "docente" || rol === "admin";
}

/**
 * ¿El docente ya liberó este formato a su ámbito?
 * Con varios grupos a cargo se considera liberado cuando lo están todos.
 */
export function habilitadoPorDocente(
  codigo: string,
  ambito: AmbitoDocente,
  habilitaciones: Habilitacion[],
) {
  if (ambito.incompleto || !ambito.semestre) return false;
  return ambito.grupos.every((grupo) =>
    habilitaciones.some(
      (h) =>
        h.codigo === codigo &&
        h.docenteId === ambito.docenteId &&
        h.semestre === ambito.semestre &&
        h.grupo === grupo,
    ),
  );
}

/**
 * ¿El alumno puede ver este formato?
 * Debe existir una habilitación de SU docente tutor, para SU semestre y SU grupo.
 */
export function alumnoVeFormato(
  codigo: string,
  ambito: AmbitoAlumno,
  habilitaciones: Habilitacion[],
) {
  if (!ambito.semestre || !ambito.grupo || !ambito.tutorDocenteId) return false;
  return habilitaciones.some(
    (h) =>
      h.codigo === codigo &&
      h.docenteId === ambito.tutorDocenteId &&
      h.semestre === ambito.semestre &&
      (h.grupo === ambito.grupo || h.grupo === "Todos"),
  );
}

/** Etiqueta legible del ámbito del docente: "3° A y B · Matutino". */
export function etiquetaAmbito(ambito: AmbitoDocente) {
  if (!ambito.semestre || ambito.grupos.length === 0) return "Sin grupo asignado";
  const grupos = ambito.grupos.join(" y ");
  return `${ambito.semestre}° ${grupos}${ambito.turno ? ` · ${ambito.turno}` : ""}`;
}
