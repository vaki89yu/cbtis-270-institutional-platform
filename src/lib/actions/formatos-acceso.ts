"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  COOKIE_AMBITO,
  ambitoDocente,
  deshabilitarFormato,
  habilitarFormato,
  listarHabilitaciones,
  veTodoElCatalogo,
} from "@/lib/formatos/acceso";
import { requireUser } from "@/lib/guards";

/** Cookie efímera con el resultado de la última acción, para avisar en pantalla. */
const COOKIE_AVISO = "cbtis270_formatos_aviso";

async function avisar(texto: string, tipo: "ok" | "error") {
  const jar = await cookies();
  jar.set(COOKIE_AVISO, encodeURIComponent(`${tipo}|${texto}`), {
    path: "/panel/formatos",
    maxAge: 15,
    sameSite: "lax",
  });
}

/**
 * Concede o retira el acceso a un formato.
 *
 * El destinatario NO se elige formato por formato: es el ámbito que el docente
 * declaró en su registro (módulo, semestre y grupo o grupos responsables). El
 * alumno lo verá sólo si su semestre, su grupo y su docente tutor coinciden.
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
  if (ambito.incompleto || !ambito.semestre) {
    await avisar(
      "Primero confirma el semestre y el grupo al que le das clase para poder habilitar formatos.",
      "error",
    );
    revalidatePath("/panel/formatos");
    return;
  }

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

  // Releer para confirmar que el cambio quedó guardado de verdad.
  const vigentes = await listarHabilitaciones();
  const quedo = ambito.grupos.every((grupo) =>
    vigentes.some(
      (h) =>
        h.codigo === codigo &&
        h.docenteId === ambito.docenteId &&
        h.semestre === ambito.semestre &&
        h.grupo === grupo,
    ),
  );
  const destino = `${ambito.semestre}° ${ambito.grupos.join(" y ")}`;

  if (habilitar && quedo) {
    await avisar(`${codigo} habilitado para ${destino}.`, "ok");
  } else if (!habilitar && !quedo) {
    await avisar(`${codigo} ya no está disponible para ${destino}.`, "ok");
  } else {
    await avisar(
      `No se pudo guardar el cambio de ${codigo}. La plataforma está en modo demo sin base de datos.`,
      "error",
    );
  }

  revalidatePath("/panel/formatos");
  revalidatePath(`/panel/formatos/${codigo}`);
  revalidatePath("/panel");
}

/**
 * Guarda el semestre y los grupos a los que el docente da clase cuando su
 * perfil de registro no está disponible. Queda en una cookie del docente y
 * sirve de ámbito para todas las habilitaciones que haga.
 */
export async function confirmarAmbitoDocenteAction(formData: FormData) {
  const user = await requireUser();
  if (!veTodoElCatalogo(user.rol)) return;

  const semestre = Number(formData.get("semestre"));
  const modulo = Number(formData.get("modulo"));
  const grupos = formData
    .getAll("grupos")
    .map((g) => String(g).trim().toUpperCase())
    .filter(Boolean);
  const turno = String(formData.get("turno") ?? "").trim();

  if (!Number.isFinite(semestre) || semestre < 1 || semestre > 6 || grupos.length === 0) {
    await avisar("Elige el semestre y al menos un grupo.", "error");
    revalidatePath("/panel/formatos");
    return;
  }

  const jar = await cookies();
  jar.set(
    COOKIE_AMBITO,
    encodeURIComponent(
      JSON.stringify({
        semestre,
        grupos,
        modulo: Number.isFinite(modulo) ? modulo : null,
        turno: turno || null,
      }),
    ),
    {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax",
    },
  );

  await avisar(
    `Listo: tus habilitaciones se aplicarán a ${semestre}° ${grupos.join(" y ")}.`,
    "ok",
  );
  revalidatePath("/panel/formatos");
  revalidatePath("/panel");
}
