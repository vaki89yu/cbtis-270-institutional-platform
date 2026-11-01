/**
 * Permisos de aula con varios docentes.
 *
 * `courses.docente_id` sigue siendo el docente principal (dueño del aula), pero
 * `course_teachers` permite sumar co-docentes que también pasan lista, publican
 * material y califican. Dirección puede administrar cualquier aula.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courseTeachers, courses, users } from "@/db/schema";

export type DocenteDeAula = {
  id: number;
  nombre: string;
  email: string;
  principal: boolean;
  desde: Date | null;
};

export type SesionAula = { id: number; rol: string; nombre?: string };

/** Docente principal + co-docentes de un aula. */
export async function docentesDelAula(courseId: number): Promise<DocenteDeAula[]> {
  try {
    const [fila] = await db
      .select({ curso: courses, docente: users })
      .from(courses)
      .innerJoin(users, eq(users.id, courses.docenteId))
      .where(eq(courses.id, courseId))
      .limit(1);
    if (!fila) return [];

    const coDocentes = await db
      .select({ docente: users, desde: courseTeachers.createdAt })
      .from(courseTeachers)
      .innerJoin(users, eq(users.id, courseTeachers.teacherId))
      .where(eq(courseTeachers.courseId, courseId));

    const lista: DocenteDeAula[] = [
      {
        id: fila.docente.id,
        nombre: fila.docente.nombre,
        email: fila.docente.email,
        principal: true,
        desde: null,
      },
    ];
    for (const extra of coDocentes) {
      if (extra.docente.id === fila.docente.id) continue;
      lista.push({
        id: extra.docente.id,
        nombre: extra.docente.nombre,
        email: extra.docente.email,
        principal: false,
        desde: new Date(extra.desde),
      });
    }
    return lista;
  } catch {
    return [];
  }
}

/** ¿El usuario es el docente principal o un co-docente del aula? */
export async function esDocenteDelAula(courseId: number, userId: number): Promise<boolean> {
  try {
    const [curso] = await db
      .select({ docenteId: courses.docenteId })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);
    if (!curso) return false;
    if (curso.docenteId === userId) return true;

    const [extra] = await db
      .select({ id: courseTeachers.id })
      .from(courseTeachers)
      .where(and(eq(courseTeachers.courseId, courseId), eq(courseTeachers.teacherId, userId)))
      .limit(1);
    return Boolean(extra);
  } catch {
    return false;
  }
}

/** Dirección administra todo; el resto sólo las aulas donde imparte. */
export async function puedeAdministrarAula(user: SesionAula, courseId: number): Promise<boolean> {
  if (!Number.isFinite(courseId)) return false;
  if (user.rol === "admin") return true;
  if (user.rol !== "docente") return false;
  return esDocenteDelAula(courseId, user.id);
}

/** Ids de las aulas que puede administrar el usuario. */
export async function aulasAdministradasPor(user: SesionAula): Promise<number[]> {
  if (user.rol === "admin") {
    try {
      const filas = await db.select({ id: courses.id }).from(courses);
      return filas.map((f) => f.id);
    } catch {
      return [];
    }
  }
  if (user.rol !== "docente") return [];
  try {
    const propias = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.docenteId, user.id));
    const extras = await db
      .select({ id: courseTeachers.courseId })
      .from(courseTeachers)
      .where(eq(courseTeachers.teacherId, user.id));
    return [...new Set([...propias, ...extras].map((f) => f.id))];
  } catch {
    return [];
  }
}

/** Docentes disponibles para sumar a un aula (activos, sin incluir a los ya asignados). */
export async function docentesDisponiblesParaAula(courseId: number) {
  try {
    const asignados = new Set((await docentesDelAula(courseId)).map((d) => d.id));
    const filas = await db
      .select({ id: users.id, nombre: users.nombre, email: users.email })
      .from(users)
      .where(and(eq(users.rol, "docente"), eq(users.activo, true)));
    return filas.filter((f) => !asignados.has(f.id));
  } catch {
    return [];
  }
}
