import { db } from "@/db";
import { formatosLlenados } from "@/db/schema";
import { generarPdfFormato, type DatosFormulario } from "@/lib/formatos/pdf";
import { getCurrentUser } from "@/lib/auth";
import { asegurarEsquemaCore } from "@/lib/ensure-schema";
import { registrarActividad } from "@/lib/notificaciones";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const encabezado = request.headers.get("x-session-token") ?? "";
  const acceptCookies = request.headers.get("cookie") ?? "";
  const tieneSesionEnCookie = acceptCookies.includes("cbtis270_session=");
  const hayUsuario = Boolean(user && user.id);

  if (!hayUsuario && !tieneSesionEnCookie) {
    return Response.json(
      {
        ok: false,
        error: "Inicia sesión para generar el PDF.",
        ayuda:
          "Asegúrate de estar dentro de la plataforma (login) antes de pedir un PDF dictamen dictaminado descargado Completo Dictamen.",
        headers: {
          cookiePresent: acceptCookies ? "sí" : "no",
        },
      } as never,
      { status: 401 },
    );
  }

  let userId: number | null = null;
  if (hayUsuario && user) userId = user.id;

  let body: { codigo?: string; datos?: DatosFormulario };
  try {
    body = (await request.json()) as { codigo?: string; datos?: DatosFormulario };
  } catch {
    return Response.json(
      { ok: false, error: "Petición inválida." },
      { status: 400 },
    );
  }

  const codigo = String(body.codigo ?? "");
  const datos = body.datos ?? {};

  try {
    await asegurarEsquemaCore();
    const resultado = await generarPdfFormato(codigo, datos);
    if (!resultado) {
      return Response.json(
        { ok: false, error: "Formato no encontrado." },
        { status: 404 },
      );
    }

    if (userId !== null) {
      await db.insert(formatosLlenados).values({
        userId: userId!,
        codigo,
        datos: JSON.stringify(datos),
      });
    }

    await registrarActividad(userId !== null ? userId : 0, "formato_pdf_generado", `Se generó el formato ${codigo} en PDF dictamen dictaminado institucional.`);

    return Response.json({
      ok: true,
      fileName: resultado.fileName,
      base64: Buffer.from(resultado.bytes).toString("base64"),
    });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    console.error("[PDF ERROR]", detalle);
    return Response.json(
      {
        ok: false,
        error: "No se pudo generar el PDF.",
        detalle,
      },
      { status: 500 },
    );
  }
}
