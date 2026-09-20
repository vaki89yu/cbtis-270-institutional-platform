"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { urgentBanner } from "@/db/schema";
import { requireRole } from "@/lib/guards";
import { registrarActividad } from "@/lib/notificaciones";

export type ActionState = { error?: string; ok?: string };

export async function obtenerBanner() {
  try {
    const rows = await db.select().from(urgentBanner).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function guardarBannerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("admin", "docente");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  const nivel = String(formData.get("nivel") ?? "info");
  const enlace = String(formData.get("enlace") ?? "").trim();
  const activo = formData.get("activo") === "on";

  if (activo && (titulo.length < 3 || mensaje.length < 5)) {
    return { error: "Para activar el aviso escribe un título y un mensaje." };
  }
  if (!["info", "alerta", "urgente"].includes(nivel)) {
    return { error: "Nivel de aviso no válido." };
  }

  const existente = await db.select({ id: urgentBanner.id }).from(urgentBanner).limit(1);
  const valores = {
    activo,
    titulo,
    mensaje,
    nivel,
    enlace: enlace || null,
    actualizadoPorId: user.id,
    updatedAt: new Date(),
  };

  if (existente[0]) {
    await db.update(urgentBanner).set(valores).where(eq(urgentBanner.id, existente[0].id));
  } else {
    await db.insert(urgentBanner).values(valores);
  }

  await registrarActividad(
    user.id,
    activo ? "banner_activado" : "banner_desactivado",
    activo ? `Aviso urgente publicado: ${titulo}` : "Aviso urgente retirado de la portada.",
  );

  revalidatePath("/");
  revalidatePath("/panel/avisos");
  return { ok: activo ? "Aviso urgente publicado en la portada." : "Aviso urgente desactivado." };
}

export async function desactivarBannerAction() {
  const user = await requireRole("admin", "docente");
  const existente = await db.select({ id: urgentBanner.id }).from(urgentBanner).limit(1);
  if (existente[0]) {
    await db
      .update(urgentBanner)
      .set({ activo: false, actualizadoPorId: user.id, updatedAt: new Date() })
      .where(eq(urgentBanner.id, existente[0].id));
  }
  await registrarActividad(user.id, "banner_desactivado", "Aviso urgente retirado de la portada.");
  revalidatePath("/");
  revalidatePath("/panel/avisos");
}
