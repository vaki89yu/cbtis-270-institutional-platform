import { db } from "@/db";
import { formatosLlenados } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { registrarActividad } from "@/lib/notificaciones";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Inicia sesión para guardar." }, { status: 401 });
  }

  let body: { codigo?: string; datos?: Record<string, string | string[]> };
  try {
    body = (await request.json()) as { codigo?: string; datos?: Record<string, string | string[]> };
  } catch {
    return Response.json({ ok: false, error: "Petición inválida." }, { status: 400 });
  }

  const codigo = String(body.codigo ?? "");
  if (!codigo) {
    return Response.json({ ok: false, error: "Formato no especificado." }, { status: 400 });
  }

  try {
    await db.insert(formatosLlenados).values({
      userId: user.id,
      codigo,
      datos: JSON.stringify(body.datos ?? {}),
    });
    await registrarActividad(user.id, "formato_guardado", `Formato ${codigo} guardado en la plataforma.`);
    return Response.json({ ok: true, message: "Formato guardado en tu expediente." });
  } catch {
    return Response.json({ ok: false, error: "No se pudo guardar el formato." }, { status: 500 });
  }
}
