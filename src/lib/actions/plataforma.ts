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
  studentProfiles,
  submissions,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { calificacionPorRubrica, retroalimentacionPorRubrica } from "@/lib/academico/rubrica";
import { registrarAuditoria } from "@/lib/auditoria";
import { requireRole, requireUser } from "@/lib/guards";

export type ActionState = { error?: string; ok?: string };

function texto(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function safeDb<T>(fn: () => Promise<T>, fallback: T, logPrefix = "[plataforma]"): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn(`${logPrefix} DB error (modo demo):`, (error as Error).message?.slice(0, 200));
    return fallback;
  }
}

async function docenteDeLaClase(courseId: number, userId: number, rol: string) {
  return safeDb(
    async () => {
      const rows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
      const course = rows[0];
      if (!course) return null;
      if (rol === "admin" || course.docenteId === userId) return course;
      return null;
    },
    null,
  );
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
  const grupo = texto(formData, "grupo") || "E";
  const turno = texto(formData, "turno") || "Matutino";
  const aula = texto(formData, "aula");
  const color = texto(formData, "color") || "#1D5BD5";
  const semestre = Number(formData.get("semestre") ?? 2);
  const modulo = Number(formData.get("modulo"));
  const dias = formData.getAll("dias").map((d) => String(d)).join(",");
  const horaInicio = texto(formData, "horaInicio");
  const horaFin = texto(formData, "horaFin");

  if (nombre.length < 3) return { error: "El nombre de la asignatura es muy corto." };
  if (clave.length < 3) return { error: "Escribe una clave para la clase (ej. LOG-201)." };

  const repetida = await safeDb(
    () => db.select({ id: courses.id }).from(courses).where(eq(courses.clave, clave)).limit(1),
    [] as any,
  );
  if (repetida.length > 0) return { error: "Ya existe una clase con esa clave." };

  const result = await safeDb(
    () =>
      db.insert(courses).values({
        nombre,
        clave,
        descripcion: descripcion || null,
        especialidad: especialidad || null,
        semestre: Number.isFinite(semestre) ? semestre : 2,
        grupo,
        turno,
        aula: aula || null,
        modulo: Number.isFinite(modulo) && modulo > 0 ? modulo : null,
        dias: dias || null,
        horaInicio: horaInicio || null,
        horaFin: horaFin || null,
        color,
        docenteId: user.id,
      }).returning({ id: courses.id }),
    null,
  );

  // Inscribir de una vez a los alumnos cuyo registro coincide con el aula
  const nuevoId = Array.isArray(result) ? result[0]?.id : null;
  if (nuevoId) {
    try {
      const { sincronizarGrupoDelAula } = await import("@/lib/academico/aula");
      await sincronizarGrupoDelAula(nuevoId);
    } catch {}
  }

  if (!result) {
    return { error: "No se pudo crear la clase sin base de datos. Configura DATABASE_URL para modo completo." };
  }

  revalidatePath("/panel/clases");
  revalidatePath("/panel");
  return { ok: `Clase "${nombre}" creada correctamente.` };
}

export async function inscribirseAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  if (user.rol !== "estudiante" || !Number.isFinite(courseId)) return;

  await safeDb(async () => {
    const yaInscrito = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.courseId, courseId), eq(enrollments.studentId, user.id)))
      .limit(1);

    if (yaInscrito.length === 0) {
      await db.insert(enrollments).values({ courseId, studentId: user.id });
    }
  }, undefined);

  revalidatePath("/panel/clases");
  revalidatePath(`/panel/clases/${courseId}`);
}

export async function darseDeBajaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  if (!Number.isFinite(courseId)) return;
  await safeDb(
    () =>
      db
        .delete(enrollments)
        .where(and(eq(enrollments.courseId, courseId), eq(enrollments.studentId, user.id))),
    undefined,
  );
  revalidatePath("/panel/clases");
}

export async function eliminarClaseAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const course = await docenteDeLaClase(courseId, user.id, user.rol);
  if (!course) return;
  await safeDb(() => db.delete(courses).where(eq(courses.id, courseId)), undefined);
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

  await safeDb(
    () =>
      db.insert(materials).values({
        courseId,
        titulo,
        descripcion: texto(formData, "descripcion") || null,
        tipo: texto(formData, "tipo") || "apunte",
        url: texto(formData, "url") || null,
      }),
    undefined,
  );
  revalidatePath(`/panel/clases/${courseId}`);
}

export async function eliminarMaterialAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const materialId = Number(formData.get("materialId"));
  const course = await docenteDeLaClase(courseId, user.id, user.rol);
  if (!course) return;
  await safeDb(() => db.delete(materials).where(eq(materials.id, materialId)), undefined);
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

  await safeDb(
    () =>
      db.insert(classSessions).values({
        courseId,
        tema,
        descripcion: texto(formData, "descripcion") || null,
        modalidad: texto(formData, "modalidad") || "Virtual",
        enlace: texto(formData, "enlace") || null,
        inicia: new Date(inicia),
        duracionMin: Number(formData.get("duracionMin") ?? 50) || 50,
      }),
    undefined,
  );
  revalidatePath(`/panel/clases/${courseId}`);
  revalidatePath("/panel");
}

export async function eliminarSesionAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const sesionId = Number(formData.get("sesionId"));
  const course = await docenteDeLaClase(courseId, user.id, user.rol);
  if (!course) return;
  await safeDb(() => db.delete(classSessions).where(eq(classSessions.id, sesionId)), undefined);
  revalidatePath(`/panel/clases/${courseId}`);
}

export async function publicarEnMuroAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const contenido = texto(formData, "contenido");
  if (!contenido) return;

  const permitido = await safeDb(
    async () =>
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
        .then((r) => r.length > 0)),
    true,
  );

  if (!permitido) return;

  await safeDb(
    () => db.insert(classPosts).values({ courseId, autorId: user.id, contenido }),
    undefined,
  );
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
  await safeDb(
    () =>
      db.insert(assignments).values({
        courseId,
        titulo,
        instrucciones: texto(formData, "instrucciones") || null,
        puntos: Number(formData.get("puntos") ?? 100) || 100,
        parcial: [1, 2, 3].includes(parcial) ? parcial : 1,
        fechaEntrega: new Date(fechaEntrega),
      }),
    undefined,
  );
  revalidatePath(`/panel/clases/${courseId}`);
  revalidatePath("/panel");
}

export async function eliminarTareaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const tareaId = Number(formData.get("tareaId"));
  const course = await docenteDeLaClase(courseId, user.id, user.rol);
  if (!course) return;
  await safeDb(() => db.delete(assignments).where(eq(assignments.id, tareaId)), undefined);
  revalidatePath(`/panel/clases/${courseId}`);
}

export async function entregarTareaAction(formData: FormData) {
  const user = await requireUser();
  const assignmentId = Number(formData.get("assignmentId"));
  const contenido = texto(formData, "contenido");
  const url = texto(formData, "url");
  if (!Number.isFinite(assignmentId) || (!contenido && !url)) return;

  await safeDb(async () => {
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
  }, undefined);

  revalidatePath(`/panel/tareas/${assignmentId}`);
  revalidatePath("/panel/calificaciones");
  revalidatePath("/panel");
}

export async function calificarEntregaAction(formData: FormData) {
  const user = await requireRole("docente", "admin");
  const submissionId = Number(formData.get("submissionId"));
  const assignmentId = Number(formData.get("assignmentId"));

  // Si el docente marcó criterios de la rúbrica, la calificación y la
  // retroalimentación se arman solas; si escribió un número, ese manda.
  const criterios = formData.getAll("rubrica").map((c) => String(c));
  const capturada = Number(formData.get("calificacion"));
  const usaRubrica = criterios.length > 0 && !Number.isFinite(capturada);
  const calificacion = usaRubrica ? calificacionPorRubrica(criterios) : capturada;
  const retroCapturada = texto(formData, "retroalimentacion");
  const retro =
    retroCapturada ||
    (criterios.length > 0 ? retroalimentacionPorRubrica(criterios) : "");

  const rows = await safeDb(
    () =>
      db
        .select({ docenteId: courses.docenteId })
        .from(assignments)
        .innerJoin(courses, eq(courses.id, assignments.courseId))
        .where(eq(assignments.id, assignmentId))
        .limit(1),
    [] as any,
  );

  if (rows.length === 0) return;
  if (user.rol !== "admin" && rows[0].docenteId !== user.id) return;

  await safeDb(
    () =>
      db
        .update(submissions)
        .set({
          calificacion: Number.isFinite(calificacion) ? calificacion : null,
          retroalimentacion: retro || null,
          calificadoEn: new Date(),
        })
        .where(eq(submissions.id, submissionId)),
    undefined,
  );

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "evidencia_calificada",
    entidad: "submission",
    entidadId: submissionId,
    detalle: `Calificación ${Number.isFinite(calificacion) ? calificacion : "—"}${
      usaRubrica ? " (por rúbrica)" : ""
    }`,
  });

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

  const inserted = await safeDb(
    () =>
      db.insert(announcements).values({
        titulo,
        contenido,
        categoria: texto(formData, "categoria") || "General",
        autorId: user.id,
        publicado: formData.get("publicado") === "on",
      }),
    null,
  );

  if (!inserted) {
    return { error: "No se pudo guardar el aviso sin base de datos." };
  }

  revalidatePath("/");
  revalidatePath("/panel/avisos");
  return { ok: "Aviso publicado en el portal institucional." };
}

export async function alternarAvisoAction(formData: FormData) {
  await requireRole("admin", "docente");
  const id = Number(formData.get("avisoId"));
  const publicado = formData.get("publicado") === "true";
  await safeDb(() => db.update(announcements).set({ publicado: !publicado }).where(eq(announcements.id, id)), undefined);
  revalidatePath("/");
  revalidatePath("/panel/avisos");
}

export async function eliminarAvisoAction(formData: FormData) {
  await requireRole("admin");
  const id = Number(formData.get("avisoId"));
  await safeDb(() => db.delete(announcements).where(eq(announcements.id, id)), undefined);
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

  const existe = await safeDb(
    () => db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1),
    [] as any,
  );
  if (existe.length > 0) return { error: "Ese correo ya está registrado." };

  const inserted = await safeDb(
    () =>
      db.insert(users).values({
        nombre,
        email,
        passwordHash: hashPassword(password),
        rol,
        matricula: texto(formData, "matricula") || null,
        especialidad: texto(formData, "especialidad") || null,
      }),
    null,
  );

  if (!inserted) {
    return { error: "No se pudo crear usuario sin base de datos." };
  }

  revalidatePath("/panel/usuarios");
  return { ok: `Cuenta creada para ${nombre}.` };
}

export async function cambiarRolAction(formData: FormData) {
  const admin = await requireRole("admin");
  const userId = Number(formData.get("userId"));
  const rol = texto(formData, "rol");
  if (!["admin", "docente", "estudiante"].includes(rol)) return;
  await safeDb(() => db.update(users).set({ rol }).where(eq(users.id, userId)), undefined);
  await registrarAuditoria({
    userId: admin.id,
    actor: admin.nombre,
    accion: "cambio_de_rol",
    entidad: "user",
    entidadId: userId,
    detalle: `Nuevo rol: ${rol}`,
  });
  revalidatePath("/panel/usuarios");
}

export async function alternarActivoAction(formData: FormData) {
  const admin = await requireRole("admin");
  const userId = Number(formData.get("userId"));
  const activo = formData.get("activo") === "true";
  if (userId === admin.id) return;
  await safeDb(() => db.update(users).set({ activo: !activo }).where(eq(users.id, userId)), undefined);
  revalidatePath("/panel/usuarios");
}

/** Reasigna el docente encargado de un alumno (mueve expediente, mensajes y aulas). */
export async function reasignarTutorAction(formData: FormData) {
  const admin = await requireRole("admin");
  const studentId = Number(formData.get("studentId"));
  const tutorDocenteId = Number(formData.get("tutorDocenteId"));
  if (!Number.isFinite(studentId) || !Number.isFinite(tutorDocenteId)) return;

  const [tutor] = await db
    .select({ id: users.id, nombre: users.nombre, rol: users.rol })
    .from(users)
    .where(eq(users.id, tutorDocenteId))
    .limit(1);
  if (!tutor || tutor.rol !== "docente") return;

  await safeDb(
    () =>
      db
        .update(studentProfiles)
        .set({ tutorDocenteId: tutor.id, tutorDocenteNombre: tutor.nombre })
        .where(eq(studentProfiles.userId, studentId)),
    undefined,
  );

  // Que las aulas se acomoden solas al docente nuevo
  try {
    const { sincronizarAulasDelAlumno } = await import("@/lib/academico/aula");
    await sincronizarAulasDelAlumno(studentId);
  } catch {}

  await registrarAuditoria({
    userId: admin.id,
    actor: admin.nombre,
    accion: "reasignacion_de_tutor",
    entidad: "user",
    entidadId: studentId,
    detalle: `Nuevo docente encargado: ${tutor.nombre}`,
  });

  revalidatePath("/panel/usuarios");
  revalidatePath("/panel/expedientes");
}

/** Restablece la contraseña de un usuario a un valor temporal. */
export async function restablecerPasswordAction(formData: FormData) {
  const admin = await requireRole("admin");
  const userId = Number(formData.get("userId"));
  const temporal = String(formData.get("temporal") ?? "").trim();
  if (!Number.isFinite(userId) || temporal.length < 6) return;

  await safeDb(
    () => db.update(users).set({ passwordHash: hashPassword(temporal) }).where(eq(users.id, userId)),
    undefined,
  );

  await registrarAuditoria({
    userId: admin.id,
    actor: admin.nombre,
    accion: "password_restablecida_por_admin",
    entidad: "user",
    entidadId: userId,
    detalle: "Se asignó una contraseña temporal",
  });

  revalidatePath("/panel/usuarios");
}
