"use server";

import { revalidatePath } from "next/cache";
import {
  deshabilitarFormato,
  habilitarFormato,
  veTodoElCatalogo,
} from "@/lib/formatos/acceso";
import { requireUser } from "@/lib/guards";
import { crearNotificacionSegura } from "@/lib/comunicacion-datos";

/**
 * Concede o retira a los alumnos de un semestre el acceso a un formato.
 * Sólo docencia y administración pueden ejecutarla.
 */
export async function alternarAccesoFormatoAction(formData: FormData) {
  const user = await requireUser();
  if (!veTodoElCatalogo(user.rol)) return;

  const codigo = String(formData.get("codigo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "llenable");
  const modulo = Number(formData.get("modulo"));
  const semestre = Number(formData.get("semestre"));
  const habilitar = String(formData.get("habilitar") ?? "") === "1";

  if (!codigo || !Number.isFinite(modulo) || !Number.isFinite(semestre)) return;
  if (semestre < 2 || semestre > 6) return;

  if (habilitar) {
    await habilitarFormato({ codigo, tipo, modulo, semestre, docenteId: user.id });
  } else {
    await deshabilitarFormato(codigo, semestre);
  }

  revalidatePath("/panel/formatos");
  revalidatePath(`/panel/formatos/${codigo}`);
  revalidatePath("/panel");
}

/**
 * Habilita o retira de una sola vez todos los formatos de un módulo para su
 * semestre correspondiente. Atajo para abrir un módulo completo al grupo.
 */
export async function alternarModuloCompletoAction(formData: FormData) {
  const user = await requireUser();
  if (!veTodoElCatalogo(user.rol)) return;

  const semestre = Number(formData.get("semestre"));
  const modulo = Number(formData.get("modulo"));
  const habilitar = String(formData.get("habilitar") ?? "") === "1";
  const codigos = String(formData.get("codigos") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const tipos = String(formData.get("tipos") ?? "")
    .split(",")
    .map((c) => c.trim());

  if (!Number.isFinite(semestre) || !Number.isFinite(modulo) || codigos.length === 0) return;

  for (const [i, codigo] of codigos.entries()) {
    if (habilitar) {
      await habilitarFormato({
        codigo,
        tipo: tipos[i] ?? "llenable",
        modulo,
        semestre,
        docenteId: user.id,
      });
    } else {
      await deshabilitarFormato(codigo, semestre);
    }
  }

  if (habilitar) {
    // Aviso informativo para la bitácora del propio docente.
    await crearNotificacionSegura({
      userId: user.id,
      titulo: "Formatos habilitados",
      contenido: `Habilitaste ${codigos.length} formato(s) del módulo ${modulo} para ${semestre}° semestre.`,
      tipo: "sistema",
    });
  }

  revalidatePath("/panel/formatos");
  revalidatePath("/panel");
}
