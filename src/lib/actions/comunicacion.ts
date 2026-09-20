"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { internalMessages, notifications, studentProfiles, teacherProfiles, users } from "@/db/schema";
import { requireUser } from "@/lib/guards";
import { crearNotificacion, registrarActividad } from "@/lib/notificaciones";

export async function marcarNotificacionLeidaAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("notificationId"));
  if (!Number.isFinite(id)) return;
  await db
    .update(notifications)
    .set({ leida: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  revalidatePath("/panel/notificaciones");
}

export async function marcarTodasLeidasAction() {
  const user = await requireUser();
  await db.update(notifications).set({ leida: true }).where(eq(notifications.userId, user.id));
  revalidatePath("/panel/notificaciones");
  revalidatePath("/panel");
}

async function puedeEnviarA(fromUserId: number, fromRol: string, toUserId: number) {
  if (fromRol === "admin") return true;

  const destino = await db.select().from(users).where(eq(users.id, toUserId)).limit(1);
  if (!destino[0]) return false;

  if (fromRol === "docente") {
    const perfilDocente = await db
      .select()
      .from(teacherProfiles)
      .where(eq(teacherProfiles.userId, fromUserId))
      .limit(1);
    const perfilAlumno = await db
      .select({ alumno: users, perfil: studentProfiles })
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(eq(users.id, toUserId))
      .limit(1);
    const docente = perfilDocente[0];
    const alumno = perfilAlumno[0];
    if (!docente || !alumno || alumno.alumno.rol !== "estudiante") return false;
    return (
      docente.turnoResponsable === alumno.alumno.turno &&
      docente.semestreResponsable === alumno.alumno.semestre &&
      (!docente.grupoResponsable ||
        docente.grupoResponsable === "Todos" ||
        docente.grupoResponsable === alumno.perfil?.grupo)
    );
  }

  // El alumno puede contestar a docentes o jefatura.
  return destino[0].rol === "docente" || destino[0].rol === "admin";
}

export async function enviarMensajeAction(formData: FormData) {
  const user = await requireUser();
  const toUserId = Number(formData.get("toUserId"));
  const asunto = String(formData.get("asunto") ?? "").trim();
  const contenido = String(formData.get("contenido") ?? "").trim();

  if (!Number.isFinite(toUserId) || asunto.length < 3 || contenido.length < 3) return;
  const permitido = await puedeEnviarA(user.id, user.rol, toUserId);
  if (!permitido) return;

  await db.insert(internalMessages).values({
    fromUserId: user.id,
    toUserId,
    asunto,
    contenido,
  });

  await crearNotificacion(
    toUserId,
    "Nuevo mensaje interno",
    `${user.nombre} te envió un mensaje: ${asunto}`,
    "mensaje",
  );
  await registrarActividad(user.id, "mensaje_enviado", `Mensaje enviado a usuario ${toUserId}: ${asunto}`);

  revalidatePath("/panel/mensajes");
  revalidatePath("/panel/notificaciones");
}

export async function marcarMensajeLeidoAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("messageId"));
  if (!Number.isFinite(id)) return;
  await db
    .update(internalMessages)
    .set({ leido: true })
    .where(and(eq(internalMessages.id, id), eq(internalMessages.toUserId, user.id)));
  revalidatePath("/panel/mensajes");
}
