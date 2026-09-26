"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  attendanceSessions,
  attendances,
  courses,
  submissions,
} from "@/db/schema";
import { actividadPorClave } from "@/lib/academico/actividades";
import { sincronizarGrupoDelAula } from "@/lib/academico/aula";
import { crearNotificacionSegura } from "@/lib/comunicacion-datos";
import { requireUser } from "@/lib/guards";

async function aulaDelDocente(courseId: number, userId: number, rol: string) {
  const [curso] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!curso) return null;
  if (rol !== "admin" && curso.docenteId !== userId) return null;
  return curso;
}

function refrescar(courseId: number) {
  revalidatePath(`/panel/clases/${courseId}`);
  revalidatePath("/panel/clases");
  revalidatePath("/panel/asistencias");
  revalidatePath("/panel/tareas");
  revalidatePath("/panel");
}

/* ------------------------------ PASE DE LISTA ------------------------------ */

/** El docente abre el pase de lista: a partir de ahí el alumno puede registrarse. */
export async function abrirPaseDeListaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso) return;

  // Cerrar cualquier pase anterior que siga abierto
  await db
    .update(attendanceSessions)
    .set({ abierta: false, cerradaEn: new Date() })
    .where(and(eq(attendanceSessions.courseId, courseId), eq(attendanceSessions.abierta, true)));

  const tema = String(formData.get("tema") ?? "").trim();
  const tolerancia = Number(formData.get("tolerancia") ?? 10);

  await db.insert(attendanceSessions).values({
    courseId,
    fecha: new Date(),
    tema: tema || null,
    abierta: true,
    toleranciaMin: Number.isFinite(tolerancia) ? tolerancia : 10,
    abiertaPorId: user.id,
  });

  await sincronizarGrupoDelAula(courseId);
  refrescar(courseId);
}

/** El docente cierra el pase de lista y marca falta a quien no se registró. */
export async function cerrarPaseDeListaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const sessionId = Number(formData.get("sessionId"));
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso || !Number.isFinite(sessionId)) return;

  const [sesion] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId))
    .limit(1);
  if (!sesion) return;

  const { alumnosDelAula } = await import("@/lib/academico/aula");
  const alumnos = await alumnosDelAula(courseId);
  const registrados = await db
    .select({ studentId: attendances.studentId })
    .from(attendances)
    .where(eq(attendances.sessionId, sessionId));
  const set = new Set(registrados.map((r) => r.studentId));

  const faltantes = alumnos.filter((a) => !set.has(a.id));
  if (faltantes.length > 0) {
    await db
      .insert(attendances)
      .values(
        faltantes.map((a) => ({
          courseId,
          studentId: a.id,
          fecha: sesion.fecha,
          estado: "falta",
          origen: "docente",
          sessionId,
        })),
      )
      .onConflictDoNothing();
  }

  await db
    .update(attendanceSessions)
    .set({ abierta: false, cerradaEn: new Date() })
    .where(eq(attendanceSessions.id, sessionId));

  refrescar(courseId);
}

/** El alumno registra su propia asistencia mientras el pase de lista está abierto. */
export async function marcarMiAsistenciaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const sessionId = Number(formData.get("sessionId"));
  if (!Number.isFinite(courseId) || !Number.isFinite(sessionId)) return;

  const [sesion] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId))
    .limit(1);
  if (!sesion || !sesion.abierta || sesion.courseId !== courseId) return;

  // Debe estar inscrito al aula
  const { alumnosDelAula } = await import("@/lib/academico/aula");
  const alumnos = await alumnosDelAula(courseId);
  if (!alumnos.some((a) => a.id === user.id)) return;

  // Retardo si llegó después de la tolerancia
  const minutos = Math.floor((Date.now() - new Date(sesion.fecha).getTime()) / 60000);
  const estado = minutos > sesion.toleranciaMin ? "retardo" : "presente";

  await db
    .insert(attendances)
    .values({
      courseId,
      studentId: user.id,
      fecha: sesion.fecha,
      estado,
      origen: "alumno",
      sessionId,
      observacion: `Registrada por el alumno a los ${minutos} min de iniciada la clase`,
    })
    .onConflictDoNothing();

  const [curso] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (curso) {
    await crearNotificacionSegura({
      userId: curso.docenteId,
      titulo: estado === "retardo" ? "Asistencia con retardo" : "Asistencia registrada",
      contenido: `${user.nombre} se registró en ${curso.nombre} (${curso.aula ?? "aula"}) como ${estado}.`,
      tipo: "asistencia",
    });
  }

  refrescar(courseId);
}

/** El docente corrige el estado de un alumno en el pase de lista. */
export async function ajustarAsistenciaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const sessionId = Number(formData.get("sessionId"));
  const studentId = Number(formData.get("studentId"));
  const estado = String(formData.get("estado") ?? "presente");
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso || !["presente", "retardo", "falta", "justificado"].includes(estado)) return;

  const [sesion] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId))
    .limit(1);
  if (!sesion) return;

  const [existente] = await db
    .select({ id: attendances.id })
    .from(attendances)
    .where(and(eq(attendances.sessionId, sessionId), eq(attendances.studentId, studentId)))
    .limit(1);

  if (existente) {
    await db
      .update(attendances)
      .set({ estado, origen: "docente" })
      .where(eq(attendances.id, existente.id));
  } else {
    await db
      .insert(attendances)
      .values({ courseId, studentId, fecha: sesion.fecha, estado, origen: "docente", sessionId })
      .onConflictDoNothing();
  }

  refrescar(courseId);
}

/* ------------------------------ ACTIVIDADES ------------------------------ */

/** Activa una actividad precargada del plan de estudios para el grupo. */
export async function activarActividadAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const clave = String(formData.get("clave") ?? "");
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  const plantilla = actividadPorClave(clave);
  if (!curso || !plantilla) return;

  const [yaExiste] = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(and(eq(assignments.courseId, courseId), eq(assignments.origen, clave)))
    .limit(1);

  if (yaExiste) {
    await db.update(assignments).set({ activa: true }).where(eq(assignments.id, yaExiste.id));
  } else {
    const entrega = new Date();
    entrega.setDate(entrega.getDate() + plantilla.diasEntrega);
    entrega.setHours(23, 59, 0, 0);
    await db.insert(assignments).values({
      courseId,
      titulo: plantilla.titulo,
      instrucciones: plantilla.instrucciones,
      puntos: plantilla.puntos,
      parcial: plantilla.parcial,
      activa: true,
      origen: clave,
      evidencia: plantilla.evidencia,
      fechaEntrega: entrega,
    });
  }

  // Avisar al grupo
  const { alumnosDelAula } = await import("@/lib/academico/aula");
  for (const alumno of await alumnosDelAula(courseId)) {
    await crearNotificacionSegura({
      userId: alumno.id,
      titulo: "Nueva actividad activada",
      contenido: `${curso.nombre}: ${plantilla.titulo}. Entra al aula para realizarla.`,
      tipo: "actividad",
    });
  }

  refrescar(courseId);
}

/** Oculta la actividad al grupo sin borrar las entregas ya hechas. */
export async function desactivarActividadAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const assignmentId = Number(formData.get("assignmentId"));
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso) return;

  await db
    .update(assignments)
    .set({ activa: false })
    .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)));
  refrescar(courseId);
}

/** El alumno entrega su evidencia. */
export async function entregarEvidenciaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const assignmentId = Number(formData.get("assignmentId"));
  const contenido = String(formData.get("contenido") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!Number.isFinite(assignmentId) || (!contenido && !url)) return;

  const [tarea] = await db
    .select()
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1);
  if (!tarea || !tarea.activa) return;

  const [existente] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, user.id)))
    .limit(1);

  if (existente) {
    await db
      .update(submissions)
      .set({ contenido: contenido || null, url: url || null, entregadoEn: new Date() })
      .where(eq(submissions.id, existente.id));
  } else {
    await db.insert(submissions).values({
      assignmentId,
      studentId: user.id,
      contenido: contenido || null,
      url: url || null,
    });
  }

  const [curso] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (curso) {
    await crearNotificacionSegura({
      userId: curso.docenteId,
      titulo: "Evidencia entregada",
      contenido: `${user.nombre} entregó "${tarea.titulo}" en ${curso.nombre}.`,
      tipo: "entrega",
    });
  }

  refrescar(courseId);
}

/** El docente califica una evidencia. */
export async function calificarEvidenciaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const submissionId = Number(formData.get("submissionId"));
  const calificacion = Number(formData.get("calificacion"));
  const retro = String(formData.get("retroalimentacion") ?? "").trim();
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso || !Number.isFinite(calificacion)) return;

  const [entrega] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (!entrega) return;

  await db
    .update(submissions)
    .set({
      calificacion: Math.max(0, Math.min(100, calificacion)),
      retroalimentacion: retro || null,
      calificadoEn: new Date(),
    })
    .where(eq(submissions.id, submissionId));

  await crearNotificacionSegura({
    userId: entrega.studentId,
    titulo: "Evidencia calificada",
    contenido: `Tu entrega en ${curso.nombre} obtuvo ${calificacion} puntos.`,
    tipo: "calificacion",
  });

  refrescar(courseId);
}

/** Vuelve a sincronizar la lista del grupo con los registros de los alumnos. */
export async function sincronizarGrupoAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso) return;
  await sincronizarGrupoDelAula(courseId);
  refrescar(courseId);
}
