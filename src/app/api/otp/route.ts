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
  let email = "";

  try {
    const body = (await request.json()) as { email?: string };
    email = String(body.email ?? "").trim().toLowerCase();

    if (!email || !esCorreoInstitucional(email)) {
      return Response.json(
        { ok: false, error: "Escribe un correo válido." },
        { status: 400 },
      );
    }

    const codigo = generarOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    // Respaldo de sesión: permite verificar el código aunque falle temporalmente la BD.
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
    }

    try {
      const envio = await enviarOtpReal({
        email,
        codigo,
        origin: originFrom(request),
      });

      if (envio.sent) {
        return Response.json({
          ok: true,
          sent: true,
          modo: "real",
          message: envio.message,
        });
      }

      return Response.json({
        ok: true,
        sent: false,
        modo: "demo",
        codigo,
        message:
          envio.message ||
          "Modo demostración: usa el código que aparece abajo para continuar.",
      });
    } catch (mailError) {
      console.error("OTP delivery error:", mailError);
      return Response.json({
        ok: true,
        sent: false,
        modo: "demo",
        codigo,
        message:
          "Modo demostración: el envío por correo no está disponible. Usa el código que aparece abajo para continuar.",
      });
    }
  } catch (error) {
    console.error("OTP route error:", error);

    // El código ya fue generado antes de los servicios externos siempre que fue posible.
    // Si el fallo ocurrió antes, generamos uno nuevo y lo dejamos disponible en la cookie.
    try {
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
        message:
          "Modo demostración: usa el código que aparece abajo para continuar.",
      });
    } catch (fallbackError) {
      console.error("OTP fallback error:", fallbackError);
      return Response.json(
        {
          ok: false,
          error: "No se pudo procesar la solicitud. Intenta nuevamente.",
        },
        { status: 500 },
      );
    }
  }
}
