/**
 * Búsqueda global del panel (Ctrl/⌘ + K).
 *
 * Devuelve resultados agrupados y ya filtrados por rol:
 *  - Dirección: todo el plantel.
 *  - Docente: sus aulas (propias o como co-docente) y los alumnos inscritos ahí.
 *  - Estudiante: sus aulas y material de consulta; nunca otros alumnos.
 *
 * El catálogo de cuestionarios y la biblioteca de formatos son estáticos, así
 * que la búsqueda sigue funcionando aunque no haya base de datos (preview).
 */

import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { assignments, courses, enrollments, users } from "@/db/schema";
import { CUESTIONARIOS } from "@/lib/academico/cuestionarios";
import { FORMATOS_DINAMICOS } from "@/lib/formatos/catalogo";
import { aulasAdministradasPor, type SesionAula } from "@/lib/permisos-aula";

export type ItemBusqueda = {
  id: string;
  titulo: string;
  detalle: string;
  href: string;
};

export type GrupoBusqueda = {
  clave: "alumnos" | "aulas" | "actividades" | "cuestionarios" | "formatos" | "usuarios";
  etiqueta: string;
  items: ItemBusqueda[];
};

export type ResultadoBusqueda = {
  q: string;
  total: number;
  grupos: GrupoBusqueda[];
};

const LIMITE = 5;

function patron(q: string) {
  return `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
}

function coincide(texto: string, q: string) {
  return texto.toLowerCase().includes(q.toLowerCase());
}

export async function buscarGlobal(qOriginal: string, user: SesionAula): Promise<ResultadoBusqueda> {
  const q = qOriginal.trim().slice(0, 60);
  const vacio: ResultadoBusqueda = { q, total: 0, grupos: [] };
  if (q.length < 2) return vacio;

  const grupos: GrupoBusqueda[] = [];
  const like = patron(q);

  /* --------------------------------- AULAS -------------------------------- */
  try {
    const visibles = user.rol === "admin" ? null : await aulasAdministradasPor(user);
    let filas: Array<{ id: number; nombre: string; clave: string; semestre: number; grupo: string; turno: string }> = [];

    if (user.rol === "estudiante") {
      filas = await db
        .select({
          id: courses.id,
          nombre: courses.nombre,
          clave: courses.clave,
          semestre: courses.semestre,
          grupo: courses.grupo,
          turno: courses.turno,
        })
        .from(enrollments)
        .innerJoin(courses, eq(courses.id, enrollments.courseId))
        .where(
          and(
            eq(enrollments.studentId, user.id),
            or(ilike(courses.nombre, like), ilike(courses.clave, like), ilike(courses.aula, like)),
          ),
        )
        .limit(LIMITE);
    } else if (user.rol === "admin") {
      filas = await db
        .select({
          id: courses.id,
          nombre: courses.nombre,
          clave: courses.clave,
          semestre: courses.semestre,
          grupo: courses.grupo,
          turno: courses.turno,
        })
        .from(courses)
        .where(or(ilike(courses.nombre, like), ilike(courses.clave, like), ilike(courses.aula, like)))
        .limit(LIMITE);
    } else if ((visibles ?? []).length > 0) {
      filas = await db
        .select({
          id: courses.id,
          nombre: courses.nombre,
          clave: courses.clave,
          semestre: courses.semestre,
          grupo: courses.grupo,
          turno: courses.turno,
        })
        .from(courses)
        .where(
          and(
            inArray(courses.id, visibles ?? []),
            or(ilike(courses.nombre, like), ilike(courses.clave, like), ilike(courses.aula, like)),
          ),
        )
        .limit(LIMITE);
    }

    if (filas.length > 0) {
      grupos.push({
        clave: "aulas",
        etiqueta: "Aulas",
        items: filas.map((f) => ({
          id: `aula-${f.id}`,
          titulo: f.nombre,
          detalle: `${f.clave} · ${f.semestre}° ${f.grupo} · ${f.turno}`,
          href: `/panel/clases/${f.id}`,
        })),
      });
    }
  } catch {
    // Sin base de datos: la búsqueda de aulas se omite.
  }

  /* -------------------------------- ALUMNOS ------------------------------- */
  if (user.rol !== "estudiante") {
    try {
      const visibles = user.rol === "admin" ? null : await aulasAdministradasPor(user);
      if (user.rol === "admin" || (visibles ?? []).length > 0) {
        const filtroTexto = or(
          ilike(users.nombre, like),
          ilike(users.email, like),
          ilike(users.matricula, like),
        );

        const filas =
          user.rol === "admin"
            ? await db
                .select({ id: users.id, nombre: users.nombre, email: users.email, matricula: users.matricula })
                .from(users)
                .where(and(eq(users.rol, "estudiante"), filtroTexto))
                .limit(LIMITE)
            : await db
                .selectDistinct({
                  id: users.id,
                  nombre: users.nombre,
                  email: users.email,
                  matricula: users.matricula,
                })
                .from(users)
                .innerJoin(enrollments, eq(enrollments.studentId, users.id))
                .where(and(eq(users.rol, "estudiante"), inArray(enrollments.courseId, visibles ?? []), filtroTexto))
                .limit(LIMITE);

        if (filas.length > 0) {
          grupos.push({
            clave: "alumnos",
            etiqueta: "Alumnos",
            items: filas.map((f) => ({
              id: `alumno-${f.id}`,
              titulo: f.nombre,
              detalle: `${f.matricula ?? "sin matrícula"} · ${f.email}`,
              href: `/panel/expedientes/${f.id}`,
            })),
          });
        }
      }
    } catch {
      // Sin base de datos no hay alumnos que buscar.
    }
  }

  /* ------------------------------ ACTIVIDADES ------------------------------ */
  try {
    const visibles = user.rol === "admin" ? null : await aulasAdministradasPor(user);
    if (user.rol === "admin" || (visibles ?? []).length > 0) {
      const filtroTexto = ilike(assignments.titulo, like);
      const filas =
        user.rol === "admin"
          ? await db
              .select({ id: assignments.id, titulo: assignments.titulo, curso: courses.nombre })
              .from(assignments)
              .innerJoin(courses, eq(courses.id, assignments.courseId))
              .where(filtroTexto)
              .limit(LIMITE)
          : await db
              .select({ id: assignments.id, titulo: assignments.titulo, curso: courses.nombre })
              .from(assignments)
              .innerJoin(courses, eq(courses.id, assignments.courseId))
              .where(and(inArray(assignments.courseId, visibles ?? []), filtroTexto))
              .limit(LIMITE);

      if (filas.length > 0) {
        grupos.push({
          clave: "actividades",
          etiqueta: "Actividades",
          items: filas.map((f) => ({
            id: `actividad-${f.id}`,
            titulo: f.titulo,
            detalle: f.curso,
            href: `/panel/tareas/${f.id}`,
          })),
        });
      }
    }
  } catch {
    // Sin base de datos no hay actividades que buscar.
  }

  /* ------------------------------ CUESTIONARIOS ---------------------------- */
  const cuestionarios = CUESTIONARIOS.filter(
    (c) =>
      coincide(c.titulo, q) ||
      coincide(c.clave, q) ||
      coincide(c.submodulo, q) ||
      coincide(`modulo ${c.modulo}`, q),
  ).slice(0, LIMITE);
  if (cuestionarios.length > 0) {
    grupos.push({
      clave: "cuestionarios",
      etiqueta: "Cuestionarios",
      items: cuestionarios.map((c) => ({
        id: `cuestionario-${c.clave}`,
        titulo: c.titulo,
        detalle: `${c.clave} · ${c.preguntas?.length ?? 0} reactivos`,
        href: `/panel/cuestionarios/${c.clave}`,
      })),
    });
  }

  /* -------------------------------- FORMATOS ------------------------------- */
  const formatos = FORMATOS_DINAMICOS.filter(
    (f) => coincide(f.titulo, q) || coincide(f.codigo, q) || coincide(f.descripcion, q),
  ).slice(0, LIMITE);
  if (formatos.length > 0) {
    grupos.push({
      clave: "formatos",
      etiqueta: "Formatos",
      items: formatos.map((f) => ({
        id: `formato-${f.codigo}`,
        titulo: f.titulo,
        detalle: `${f.codigo} · Módulo ${f.modulo}`,
        href: `/panel/formatos/${f.codigo}`,
      })),
    });
  }

  /* -------------------------------- USUARIOS ------------------------------- */
  if (user.rol === "admin") {
    try {
      const filas = await db
        .select({ id: users.id, nombre: users.nombre, email: users.email, rol: users.rol })
        .from(users)
        .where(or(ilike(users.nombre, like), ilike(users.email, like), ilike(users.matricula, like)))
        .limit(LIMITE);
      if (filas.length > 0) {
        grupos.push({
          clave: "usuarios",
          etiqueta: "Usuarios del plantel",
          items: filas.map((f) => ({
            id: `usuario-${f.id}`,
            titulo: f.nombre,
            detalle: `${f.email} · ${f.rol}`,
            href: `/panel/usuarios?q=${encodeURIComponent(f.email)}`,
          })),
        });
      }
    } catch {
      // Sin base de datos no hay padrón que buscar.
    }
  }

  return {
    q,
    total: grupos.reduce((suma, g) => suma + g.items.length, 0),
    grupos,
  };
}
