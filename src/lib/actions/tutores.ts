"use server";

/**
 * Acciones del enlace de consulta para tutores.
 *
 * El enlace se muestra una sola vez: se guarda el hash y el token en claro sólo
 * viaja en una cookie httpOnly de tres minutos para pintarlo en el expediente.
 */

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, enrollments, studentProfiles } from "@/db/schema";
import { COOKIE_ENLACE_TUTOR, crearEnlaceTutor, plantillaEnlaceTutor, revocarEnlaceTutor } from "@/lib/tutores";
import { enviarCorreo } from "@/lib/email";
import { registrarAuditoria } from "@/lib/auditoria";
import { requireRole } from "@/lib/guards";
import { expedienteCompletoEstudiante } from "@/lib/consultas";
import type { SessionUser } from "@/lib/auth";

export type EstadoEnlaceTutor = { error?: string; ok?: string };

/** Admin ve todo; el docente sólo a su tutorado o a los alumnos de sus aulas. */
async function puedeConsultarAlumno(user: SessionUser, studentId: number): Promise<boolean> {
  if (user.rol === "admin") return true;
  if (user.rol !== "docente") return false;
  try {
    const [perfil] = await db
      .select({ tutorDocenteId: studentProfiles.tutorDocenteId })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, studentId))
      .limit(1);
    if (perfil?.tutorDocenteId === user.id) return true;

    const [inscrito] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(and(eq(enrollments.studentId, studentId), eq(courses.docenteId, user.id)))
      .limit(1);
    return Boolean(inscrito);
  } catch {
    // Sin base de datos (preview) se permite al docente probar el flujo.
    return true;
  }
}

export async function crearEnlaceTutorAction(
  _estado: EstadoEnlaceTutor,
  formData: FormData,
): Promise<EstadoEnlaceTutor> {
  const user = await requireRole("docente", "admin");
  const studentId = Number(formData.get("studentId"));
  if (!Number.isFinite(studentId)) return { error: "Alumno inválido." };

  if (!(await puedeConsultarAlumno(user, studentId))) {
    return { error: "No tienes acceso al expediente de este alumno." };
  }

  const etiqueta = String(formData.get("etiqueta") ?? "Tutor").trim() || "Tutor";
  const dias = Number(formData.get("dias") ?? 7);
  const correoTutor = String(formData.get("emailTutor") ?? "").trim().toLowerCase();

  if (correoTutor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoTutor)) {
    return { error: "El correo del tutor no es válido." };
  }

  const resultado = await crearEnlaceTutor({
    studentId,
    etiqueta,
    dias,
    email: correoTutor || null,
    actor: { id: user.id, nombre: user.nombre },
  });
  if (!resultado.ok) return { error: resultado.error };

  // El token se muestra una vez; la cookie caduca en 3 minutos.
  try {
    const jar = await cookies();
    jar.set(COOKIE_ENLACE_TUTOR, `${resultado.token}|${studentId}`, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 180,
      secure: process.env.NODE_ENV === "production",
    });
  } catch {
    // Si no se puede escribir la cookie, el enlace queda creado igual.
  }

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "enlace_tutor_creado",
    entidad: "tutor_link",
    entidadId: resultado.enlace.id,
    detalle: `Alumno #${studentId} · ${etiqueta} · ${dias} día(s)${correoTutor ? ` · correo ${correoTutor}` : ""}`,
  });

  // Envío opcional por correo: la liga sólo puede mandarse en este momento,
  // porque en la base únicamente queda el hash del token.
  let mensajeCorreo = "";
  if (correoTutor) {
    try {
      const cabeceras = await headers();
      const host = cabeceras.get("x-forwarded-host") ?? cabeceras.get("host") ?? "localhost:3000";
      const protocolo = cabeceras.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      const url = `${protocolo}://${host}/consulta/${resultado.token}`;
      const expediente = await expedienteCompletoEstudiante(studentId);
      const correo = plantillaEnlaceTutor({
        etiqueta,
        alumno: expediente?.alumno.nombre ?? `alumno #${studentId}`,
        url,
        expiraEn: resultado.enlace.expiraEn,
      });
      const envio = await enviarCorreo({
        para: correoTutor,
        asunto: correo.asunto,
        texto: correo.texto,
        html: correo.html,
      });
      if (envio.sent) {
        mensajeCorreo = ` y enviado a ${correoTutor}`;
        await registrarAuditoria({
          userId: user.id,
          actor: user.nombre,
          accion: "enlace_tutor_enviado",
          entidad: "tutor_link",
          entidadId: resultado.enlace.id,
          detalle: `Alumno #${studentId} · ${correoTutor}`,
        });
      } else {
        mensajeCorreo = ". El correo no salió (SMTP sin configurar): copia la liga y compártela";
      }
    } catch (error) {
      mensajeCorreo = `. No se pudo enviar el correo (${(error as Error).message?.slice(0, 60)}): copia la liga`;
    }
  }

  revalidatePath(`/panel/expedientes/${studentId}`);
  return { ok: `Enlace creado${mensajeCorreo}. Cópialo ahora: por seguridad no se vuelve a mostrar.` };
}

export async function revocarEnlaceTutorAction(formData: FormData) {
  const user = await requireRole("docente", "admin");
  const id = Number(formData.get("id"));
  const studentId = Number(formData.get("studentId"));
  if (!Number.isFinite(id) || !Number.isFinite(studentId)) return;

  if (!(await puedeConsultarAlumno(user, studentId))) return;

  const revocado = await revocarEnlaceTutor(id, studentId);
  if (!revocado) return;

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "enlace_tutor_revocado",
    entidad: "tutor_link",
    entidadId: id,
    detalle: `Alumno #${studentId}`,
  });

  revalidatePath(`/panel/expedientes/${studentId}`);
}
