"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  announcements,
  assignments,
  classPosts,
  classSessions,
  courses,
  enrollments,
  materials,
  submissions,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { requireRole, requireUser } from "@/lib/guards";

export type ActionState = { error?: string; ok?: string };

function texto(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function docenteDeLaClase(courseId: number, userId: number, rol: string) {
  const rows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  const course = rows[0];
  if (!course) return null;
  if (rol === "admin" || course.docenteId === userId) return course;
  return null;
}

/* ------------------------------- Clases ------------------------------- */

export async function crearClaseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("docente", "admin");
  const nombre = texto(formData, "nombre");
  const clave = texto(formData, "clave").toUpperCase();
  const descripcion = texto(formData, "descripcion");
  const especialidad = texto(formData, "especialidad");
  const grupo = texto(formData, "grupo") || "A";
  const turno = texto(formData, "turno") || "Matutino";
  const aula = texto(formData, "aula");
  const color = texto(formData, "color") || "#1D5BD5";
  const semestre = Number(formData.get("semestre") ?? 1);

  if (nombre.length < 3) return { error: "El nombre de la asignatura es muy corto." };
  if (clave.length < 3) return { error: "Escribe una clave para la clase (ej. PROG-501)." };

  const repetida = await db.select({ id: courses.id }).from(courses).where(eq(courses.clave, clave)).limit(1);
  if (repetida.length > 0) return { error: "Ya existe una clase con esa clave." };

  await db.insert(courses).values({
    nombre,
    clave,
    descripcion: descripcion || null,
    especialidad: especialidad || null,
    semestre: Number.isFinite(semestre) ? semestre : 1,
    grupo,
    turno,
    aula: aula || null,
    color,
    docenteId: user.id,
  });

  revalidatePath("/panel/clases");
  revalidatePath("/panel");
  return { ok: `Clase "${nombre}" creada correctamente.` };
}

export async function inscribirseAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  if (user.rol !== "estudiante" || !Number.isFinite(courseId)) return;

  const yaInscrito = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.studentId, user.id)))
    .limit(1);

  if (yaInscrito.length === 0) {
    await db.insert(enrollments).values({ courseId, studentId: user.id });
  }
  revalidatePath("/panel/clases");
  revalidatePath(`/panel/clases/${courseId}`);
}

export async function darseDeBajaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  if (!Number.isFinite(courseId)) return;
  await db
    .delete(enrollments)
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.studentId, user.id)));
  revalidatePath("/panel/clases");
}

export async function eliminarClaseAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const course = await docenteDeLaClase(courseId, user.id, user.rol);
  if (!course) return;
  await db.delete(courses).where(eq(courses.id, courseId));
  revalidatePath("/panel/clases");
}

/* ------------------------------ Contenido ------------------------------ */

export async function crearMaterialAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const course = await docenteDeLaClase(courseId, user.id, user.rol);
  if (!course) return;

  const titulo = texto(formData, "titulo");
  if (!titulo) return;

  await db.insert(materials).values({
    courseId,
    titulo,
    descripcion: texto(formData, "descripcion") || null,
    tipo: texto(formData, "tipo") || "apunte",
    url: texto(formData, "url") || null,
  });
  revalidatePath(`/panel/clases/${courseId}`);
}

export async function eliminarMaterialAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const materialId = Number(formData.get("materialId"));
  const course = await docenteDeLaClase(courseId, user.id, user.rol);
  if (!course) return;
  await db.delete(materials).where(eq(materials.id, materialId));
  revalidatePath(`/panel/clases/${courseId}`);
}

export async function programarSesionAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const course = await docenteDeLaClase(courseId, user.id, user.rol);
  if (!course) return;

  const tema = texto(formData, "tema");
  const inicia = texto(formData, "inicia");
  if (!tema || !inicia) return;

  await db.insert(classSessions).values({
    courseId,
    tema,
    descripcion: texto(formData, "descripcion") || null,
    modalidad: texto(formData, "modalidad") || "Virtual",
    enlace: texto(formData, "enlace") || null,
    inicia: new Date(inicia),
    duracionMin: Number(formData.get("duracionMin") ?? 50) || 50,
  });
  revalidatePath(`/panel/clases/${courseId}`);
  revalidatePath("/panel");
}

export async function eliminarSesionAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const sesionId = Number(formData.get("sesionId"));
  const course = await docenteDeLaClase(courseId, user.id, user.rol);
  if (!course) return;
  await db.delete(classSessions).where(eq(classSessions.id, sesionId));
  revalidatePath(`/panel/clases/${courseId}`);
}

export async function publicarEnMuroAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const contenido = texto(formData, "contenido");
  if (!contenido) return;

  const permitido =
    user.rol === "admin" ||
    (await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.docenteId, user.id)))
      .limit(1)
      .then((r) => r.length > 0)) ||
    (await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.courseId, courseId), eq(enrollments.studentId, user.id)))
      .limit(1)
      .then((r) => r.length > 0));

  if (!permitido) return;

  await db.insert(classPosts).values({ courseId, autorId: user.id, contenido });
  revalidatePath(`/panel/clases/${courseId}`);
}

/* -------------------------------- Tareas -------------------------------- */

export async function crearTareaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const course = await docenteDeLaClase(courseId, user.id, user.rol);
  if (!course) return;

  const titulo = texto(formData, "titulo");
  const fechaEntrega = texto(formData, "fechaEntrega");
  if (!titulo || !fechaEntrega) return;

  const parcial = Number(formData.get("parcial") ?? 1) || 1;
  await db.insert(assignments).values({
    courseId,
    titulo,
    instrucciones: texto(formData, "instrucciones") || null,
    puntos: Number(formData.get("puntos") ?? 100) || 100,
    parcial: [1, 2, 3].includes(parcial) ? parcial : 1,
    fechaEntrega: new Date(fechaEntrega),
  });
  revalidatePath(`/panel/clases/${courseId}`);
  revalidatePath("/panel");
}

export async function eliminarTareaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const tareaId = Number(formData.get("tareaId"));
  const course = await docenteDeLaClase(courseId, user.id, user.rol);
  if (!course) return;
  await db.delete(assignments).where(eq(assignments.id, tareaId));
  revalidatePath(`/panel/clases/${courseId}`);
}

export async function entregarTareaAction(formData: FormData) {
  const user = await requireUser();
  const assignmentId = Number(formData.get("assignmentId"));
  const contenido = texto(formData, "contenido");
  const url = texto(formData, "url");
  if (!Number.isFinite(assignmentId) || (!contenido && !url)) return;

  const existente = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, user.id)))
    .limit(1);

  if (existente.length > 0) {
    await db
      .update(submissions)
      .set({ contenido: contenido || null, url: url || null, entregadoEn: new Date() })
      .where(eq(submissions.id, existente[0].id));
  } else {
    await db.insert(submissions).values({
      assignmentId,
      studentId: user.id,
      contenido: contenido || null,
      url: url || null,
    });
  }
  revalidatePath(`/panel/tareas/${assignmentId}`);
  revalidatePath("/panel");
}

export async function calificarEntregaAction(formData: FormData) {
  const user = await requireRole("docente", "admin");
  const submissionId = Number(formData.get("submissionId"));
  const assignmentId = Number(formData.get("assignmentId"));
  const calificacion = Number(formData.get("calificacion"));

  const rows = await db
    .select({ docenteId: courses.docenteId })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  if (!rows[0]) return;
  if (user.rol !== "admin" && rows[0].docenteId !== user.id) return;

  await db
    .update(submissions)
    .set({
      calificacion: Number.isFinite(calificacion) ? calificacion : null,
      retroalimentacion: texto(formData, "retroalimentacion") || null,
      calificadoEn: new Date(),
    })
    .where(eq(submissions.id, submissionId));

  revalidatePath(`/panel/tareas/${assignmentId}`);
  revalidatePath("/panel");
}

/* ------------------------- Avisos institucionales ------------------------- */

export async function crearAvisoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("admin", "docente");
  const titulo = texto(formData, "titulo");
  const contenido = texto(formData, "contenido");
  if (titulo.length < 4) return { error: "El título es muy corto." };
  if (contenido.length < 10) return { error: "Describe el aviso con más detalle." };

  await db.insert(announcements).values({
    titulo,
    contenido,
    categoria: texto(formData, "categoria") || "General",
    autorId: user.id,
    publicado: formData.get("publicado") === "on",
  });

  revalidatePath("/");
  revalidatePath("/panel/avisos");
  return { ok: "Aviso publicado en el portal institucional." };
}

export async function alternarAvisoAction(formData: FormData) {
  await requireRole("admin", "docente");
  const id = Number(formData.get("avisoId"));
  const publicado = formData.get("publicado") === "true";
  await db.update(announcements).set({ publicado: !publicado }).where(eq(announcements.id, id));
  revalidatePath("/");
  revalidatePath("/panel/avisos");
}

export async function eliminarAvisoAction(formData: FormData) {
  await requireRole("admin");
  const id = Number(formData.get("avisoId"));
  await db.delete(announcements).where(eq(announcements.id, id));
  revalidatePath("/");
  revalidatePath("/panel/avisos");
}

/* ---------------------------- Gestión de usuarios ---------------------------- */

export async function crearUsuarioAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const nombre = texto(formData, "nombre");
  const email = texto(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rol = texto(formData, "rol") || "estudiante";

  if (nombre.length < 5) return { error: "Escribe el nombre completo." };
  if (!email.includes("@")) return { error: "Correo no válido." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

  const existe = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existe.length > 0) return { error: "Ese correo ya está registrado." };

  await db.insert(users).values({
    nombre,
    email,
    passwordHash: hashPassword(password),
    rol,
    matricula: texto(formData, "matricula") || null,
    especialidad: texto(formData, "especialidad") || null,
  });

  revalidatePath("/panel/usuarios");
  return { ok: `Cuenta creada para ${nombre}.` };
}

export async function cambiarRolAction(formData: FormData) {
  await requireRole("admin");
  const userId = Number(formData.get("userId"));
  const rol = texto(formData, "rol");
  if (!["admin", "docente", "estudiante"].includes(rol)) return;
  await db.update(users).set({ rol }).where(eq(users.id, userId));
  revalidatePath("/panel/usuarios");
}

export async function alternarActivoAction(formData: FormData) {
  const admin = await requireRole("admin");
  const userId = Number(formData.get("userId"));
  const activo = formData.get("activo") === "true";
  if (userId === admin.id) return;
  await db.update(users).set({ activo: !activo }).where(eq(users.id, userId));
  revalidatePath("/panel/usuarios");
}
