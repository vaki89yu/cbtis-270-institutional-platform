"use server";

import { revalidatePath } from "next/cache";
import {
  crearMensaje,
  crearNotificacionSegura,
  marcarMensajeLeido,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  puedeEnviarA,
} from "@/lib/comunicacion-datos";
import { requireUser } from "@/lib/guards";
import { registrarActividad } from "@/lib/notificaciones";

/**
 * Todas las acciones de comunicación pasan por la capa `comunicacion-datos`,
 * que intenta PostgreSQL y cae al almacén demo si no hay base de datos. Así el
 * apartado sigue funcionando en lugar de romper la página con un error 500.
 */

export async function marcarNotificacionLeidaAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("notificationId"));
  if (!Number.isFinite(id)) return;

  await marcarNotificacionLeida(id, user.id);
  revalidatePath("/panel/notificaciones");
  revalidatePath("/panel");
}

export async function marcarTodasLeidasAction() {
  const user = await requireUser();
  await marcarTodasNotificacionesLeidas(user.id);
  revalidatePath("/panel/notificaciones");
  revalidatePath("/panel");
}

export async function enviarMensajeAction(formData: FormData) {
  const user = await requireUser();
  const toUserId = Number(formData.get("toUserId"));
  const asunto = String(formData.get("asunto") ?? "").trim();
  const contenido = String(formData.get("contenido") ?? "").trim();

  if (!Number.isFinite(toUserId) || asunto.length < 3 || contenido.length < 3) return;

  const permitido = await puedeEnviarA(user, toUserId);
  if (!permitido) return;

  await crearMensaje({ fromUserId: user.id, toUserId, asunto, contenido });

  await crearNotificacionSegura({
    userId: toUserId,
    titulo: "Nuevo mensaje interno",
    contenido: `${user.nombre} te envió un mensaje: ${asunto}`,
    tipo: "mensaje",
  });

  try {
    await registrarActividad(
      user.id,
      "mensaje_enviado",
      `Mensaje enviado a usuario ${toUserId}: ${asunto}`,
    );
  } catch {
    // La bitácora es opcional: nunca debe impedir el envío del mensaje.
  }

  revalidatePath("/panel/mensajes");
  revalidatePath("/panel/notificaciones");
}

export async function marcarMensajeLeidoAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("messageId"));
  if (!Number.isFinite(id)) return;

  await marcarMensajeLeido(id, user.id);
  revalidatePath("/panel/mensajes");
}
