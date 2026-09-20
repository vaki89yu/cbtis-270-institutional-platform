"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendances,
  attendanceJustifications,
  courses,
  enrollments,
  users,
} from "@/db/schema";
import { requireRole, requireUser } from "@/lib/guards";
import { crearNotificacion, registrarActividad } from "@/lib/notificaciones";

export type ActionState = { error?: string; ok?: string };

/** Pase de lista masivo para una clase y fecha dada */
export async function registrarAsistenciaLoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("docente", "admin");
  const courseId = Number(formData.get("courseId"));
  const fechaStr = String(formData.get("fecha") ?? "").trim();

  if (!Number.isFinite(courseId) || !fechaStr) {
    return { error: "Selecciona una fecha válida para el pase de lista." };
  }

  const [curso] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!curso) return { error: "Aula no encontrada." };
  if (user.rol !== "admin" && curso.docenteId !== user.id) {
    return { error: "No tienes permisos sobre este grupo." };
  }

  const fechaBase = new Date(fechaStr + "T12:00:00Z");

  // Obtener alumnos inscritos
  const inscritos = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId));

  let guardadas = 0;
  for (const { studentId } of inscritos) {
    const estado = String(formData.get(`estado_${studentId}`) ?? "presente");
    const observacion = String(formData.get(`obs_${studentId}`) ?? "").trim() || null;

    if (!["presente", "retardo", "falta", "justificado"].includes(estado)) continue;

    // Insertar o actualizar registro del día
    await db
      .insert(attendances)
      .values({
        courseId,
        studentId,
        fecha: fechaBase,
        estado,
        observacion,
      })
      .onConflictDoUpdate({
        target: [attendances.courseId, attendances.studentId, attendances.fecha],
        set: { estado, observacion },
      });

    guardadas++;
  }

  await registrarActividad(
    user.id,
    "pase_lista",
    `Pase de lista registrado para ${curso.nombre} (${guardadas} alumnos, fecha ${fechaStr}).`,
  );

  revalidatePath(`/panel/asistencias`);
  revalidatePath(`/panel/clases/${courseId}`);
  return { ok: `Asistencia guardada correctamente para ${guardadas} alumnos.` };
}

/** Alumno solicita justificante escolar o médico */
export async function solicitarJustificanteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const fechaStr = String(formData.get("fechaFalta") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();
  const documentoUrl = String(formData.get("documentoUrl") ?? "").trim();

  if (!Number.isFinite(courseId) || !fechaStr || motivo.length < 5) {
    return { error: "Completa la fecha y explica el motivo del justificante." };
  }

  const [curso] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!curso) return { error: "Asignatura no válida." };

  const fechaFalta = new Date(fechaStr + "T12:00:00Z");

  await db.insert(attendanceJustifications).values({
    studentId: user.id,
    courseId,
    fechaFalta,
    motivo,
    documentoUrl: documentoUrl || null,
    estado: "pendiente",
  });

  // Notificar al docente
  await crearNotificacion(
    curso.docenteId,
    "Nueva solicitud de justificante",
    `${user.nombre} envió un justificante para la clase ${curso.nombre} del día ${fechaStr}.`,
    "justificante",
  );

  await registrarActividad(
    user.id,
    "solicitud_justificante",
    `Justificante solicitado para ${curso.nombre}, fecha ${fechaStr}.`,
  );

  revalidatePath("/panel/asistencias");
  return { ok: "Tu justificante fue enviado al docente responsable para revisión." };
}

/** Docente aprueba o rechaza justificante */
export async function resolverJustificanteAction(formData: FormData) {
  const user = await requireRole("docente", "admin");
  const justId = Number(formData.get("justificationId"));
  const resolucion = String(formData.get("resolucion") ?? "");
  const nota = String(formData.get("notaRevision") ?? "").trim();

  if (!Number.isFinite(justId) || !["aprobado", "rechazado"].includes(resolucion)) return;

  const [just] = await db
    .select({
      just: attendanceJustifications,
      docenteId: courses.docenteId,
      cursoNombre: courses.nombre,
    })
    .from(attendanceJustifications)
    .innerJoin(courses, eq(courses.id, attendanceJustifications.courseId))
    .where(eq(attendanceJustifications.id, justId))
    .limit(1);

  if (!just) return;
  if (user.rol !== "admin" && just.docenteId !== user.id) return;

  await db
    .update(attendanceJustifications)
    .set({
      estado: resolucion,
      notaRevision: nota || null,
      revisadoPorId: user.id,
    })
    .where(eq(attendanceJustifications.id, justId));

  // Si se aprueba, actualizar la asistencia de ese día a "justificado"
  if (resolucion === "aprobado") {
    await db
      .insert(attendances)
      .values({
        courseId: just.just.courseId,
        studentId: just.just.studentId,
        fecha: just.just.fechaFalta,
        estado: "justificado",
        observacion: "Justificante escolar aprobado por el docente.",
      })
      .onConflictDoUpdate({
        target: [attendances.courseId, attendances.studentId, attendances.fecha],
        set: { estado: "justificado", observacion: "Justificante escolar aprobado por el docente." },
      });
  }

  // Notificar al estudiante
  await crearNotificacion(
    just.just.studentId,
    `Justificante ${resolucion === "aprobado" ? "Aprobado ✅" : "Rechazado ❌"}`,
    `Tu docente revisó el justificante para ${just.cursoNombre}. Estatus: ${resolucion}. ${nota ? `Nota: ${nota}` : ""}`,
    "justificante_resuelto",
  );

  revalidatePath("/panel/asistencias");
}
