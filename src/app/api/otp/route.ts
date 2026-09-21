import { db } from "@/db";
import { otpCodes } from "@/db/schema";
import { asegurarEsquemaCore } from "@/lib/ensure-schema";
import { esCorreoInstitucional, generarOtp } from "@/lib/email";
import { enviarOtpReal } from "@/lib/verificacion";
import { cookies } from "next/headers";

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
    const expiresAt = Date.now() + 10 * 60 * 1000;

    // Guardar también una copia de respaldo en cookie para que el OTP siga
    // funcionando si Neon presenta un fallo temporal.
    const jar = await cookies();
    jar.set("otp_fallback", `${email}|${codigo}|${expiresAt}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });

    try {
      await asegurarEsquemaCore();
      await db.insert(otpCodes).values({
        email,
        code: codigo,
        purpose: "registro",
        expiresAt: new Date(expiresAt),
      });
    } catch (dbError) {
      console.error("OTP storage error:", dbError);
      // Continuamos: la cookie permite completar la verificación.

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
  } catch (error) {
    console.error("OTP route error:", error);
    // Último respaldo: nunca bloquear el registro por un fallo transitorio
    // de correo o base de datos.
    try {
      const body = (await request.clone().json()) as { email?: string };
      const email = String(body.email ?? "").trim().toLowerCase();
      const codigo = generarOtp();
      const jar = await cookies();
      jar.set("otp_fallback", `${email}|${codigo}|${Date.now() + 10 * 60 * 1000}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 10 * 60,
      });
      return Response.json({
        ok: true,
        sent: false,
        modo: "demo",
        codigo,
        message: "Modo demostración: usa el código que aparece abajo para continuar.",
      });
    } catch {
      return Response.json(
        { ok: false, error: "No se pudo procesar la solicitud. Intenta nuevamente." },
        { status: 500 },
      );
    }
  }
}
