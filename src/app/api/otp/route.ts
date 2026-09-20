import { db } from "@/db";
import { otpCodes } from "@/db/schema";
import { asegurarEsquemaCore } from "@/lib/ensure-schema";
import { esCorreoInstitucional, generarOtp } from "@/lib/email";
import { enviarOtpReal } from "@/lib/verificacion";

export const dynamic = "force-dynamic";

function originFrom(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) return `https://${forwardedHost.split(",")[0].trim()}`;
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email || !esCorreoInstitucional(email)) {
      return Response.json({ ok: false, error: "Escribe un correo válido." }, { status: 400 });
    }

    const codigo = generarOtp();
    await asegurarEsquemaCore();
    await db.insert(otpCodes).values({
      email,
      code: codigo,
      purpose: "registro",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const envio = await enviarOtpReal({
      email,
      codigo,
      origin: originFrom(request),
    });

    if (envio.sent) {
      return Response.json({ ok: true, sent: true, modo: "real", message: envio.message });
    }

    // Modo demostración: sin proveedor de correo configurado.
    return Response.json({
      ok: true,
      sent: false,
      modo: "demo",
      codigo: envio.codigo,
      message: envio.message,
    });
  } catch {
    return Response.json(
      { ok: false, error: "No se pudo generar el código. Intenta nuevamente." },
      { status: 500 },
    );
  }
}
