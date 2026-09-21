import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { enviarCorreo, plantillaOtp } from "@/lib/email";

async function getDeliverySettings() {
  const envResend = process.env.RESEND_API_KEY;
  try {
    const rows = await db.select().from(platformSettings).limit(1);
    const row = rows[0];
    return { resendApiKey: envResend || row?.resendApiKey || "" };
  } catch {
    return { resendApiKey: envResend || "" };
  }
}

async function enviarResend(para: string, codigo: string, apiKey: string) {
  const plantilla = plantillaOtp(codigo);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.SMTP_FROM || "CBTIS 270 Logística <onboarding@resend.dev>",
      // Nota: en modo pruebas Resend solo entrega al dueño de la cuenta
      // (jvaca6304@gmail.com). Para enviar a cualquier destinatario hay que
      // verificar un dominio en resend.com/domains.
      to: [para],
      subject: plantilla.asunto,
      html: plantilla.html,
      text: plantilla.texto,
    }),
  });
  return res.ok;
}

async function enviarFormSubmit(para: string, codigo: string, origin: string) {
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(para)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: origin,
      Referer: `${origin}/`,
    },
    body: JSON.stringify({
      name: "CBTIS 270 · Logística",
      _subject: "Código de verificación CBTIS 270",
      _template: "box",
      _captcha: "false",
      mensaje: `Tu código de verificación de la plataforma de Logística es: ${codigo}. Expira en 10 minutos. Si no lo pediste, ignora este correo.`,
    }),
  });
    const json = (await res.json().catch(() => ({}))) as { success?: string | boolean; message?: string };
    const success = json.success === true || json.success === "true";
    const activation = String(json.message ?? "").toLowerCase().includes("activation");
    return { ok: success || activation, activation };
  } catch (error) {
    console.error("FormSubmit OTP error:", error);
    return { ok: false, activation: false };
  }
}

export type ResultadoOtp = {
  sent: boolean;
  /** "real" = llegó por correo. "demo" = se muestra en pantalla (sin proveedor configurado). */
  modo: "real" | "demo";
  message: string;
  codigo?: string;
};

export async function enviarOtpReal({
  email,
  codigo,
  origin,
}: {
  email: string;
  codigo: string;
  origin: string;
}): Promise<ResultadoOtp> {
  const settings = await getDeliverySettings();

  if (settings.resendApiKey) {
    try {
      const ok = await enviarResend(email, codigo, settings.resendApiKey);
      if (ok) {
        return { sent: true, modo: "real", message: `Código enviado a ${email}. Revisa bandeja de entrada y spam.` };
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
    }
  }

  let smtp: { sent: boolean } = { sent: false };
  try {
    smtp = await enviarCorreo({ para: email, ...plantillaOtp(codigo) });
  } catch (error) {
    console.error("SMTP OTP error:", error);
  }
  if (smtp.sent) {
    return { sent: true, modo: "real", message: `Código enviado a ${email}. Revisa bandeja de entrada y spam.` };
  }

  const form = await enviarFormSubmit(email, codigo, origin);
  if (form.ok && !form.activation) {
    return { sent: true, modo: "real", message: `Código enviado a ${email}. Revisa bandeja de entrada y spam.` };
  }

  // Sin proveedor de correo configurado: modo demo, el código se muestra en pantalla.
  return {
    sent: false,
    modo: "demo",
    codigo,
    message:
      "Modo demostración: el envío por correo aún no está configurado. Usa el código que aparece abajo.",
  };
}
