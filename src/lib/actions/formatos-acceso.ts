"use server";

import { revalidatePath } from "next/cache";
import {
  ambitoDocente,
  deshabilitarFormato,
  habilitarFormato,
  veTodoElCatalogo,
} from "@/lib/formatos/acceso";
import { requireUser } from "@/lib/guards";

/**
 * Concede o retira el acceso a un formato.
 *
 * El destinatario NO se elige en el formulario: es el ámbito que el propio
 * docente declaró en su registro (su módulo, su semestre y su o sus grupos).
 * Así, el alumno lo verá únicamente si su semestre, su grupo y su docente
 * tutor coinciden con esa habilitación.
 */
export async function alternarAccesoFormatoAction(formData: FormData) {
  const user = await requireUser();
  if (!veTodoElCatalogo(user.rol)) return;

  const codigo = String(formData.get("codigo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "llenable");
  const modulo = Number(formData.get("modulo"));
  const habilitar = String(formData.get("habilitar") ?? "") === "1";
  if (!codigo || !Number.isFinite(modulo)) return;

  const ambito = await ambitoDocente(user);
  if (ambito.incompleto || !ambito.semestre) return;

  for (const grupo of ambito.grupos) {
    if (habilitar) {
      await habilitarFormato({
        codigo,
        tipo,
        modulo,
        semestre: ambito.semestre,
        grupo,
        turno: ambito.turno,
        docenteId: ambito.docenteId,
      });
    } else {
      await deshabilitarFormato(codigo, ambito.docenteId, ambito.semestre, grupo);
    }
  }

  revalidatePath("/panel/formatos");
  revalidatePath(`/panel/formatos/${codigo}`);
  revalidatePath("/panel");
}
