import nodemailer from "nodemailer";

export function esCorreoInstitucional(email: string) {
  // En esta etapa el acceso con Google/correo queda abierto a cualquier cuenta válida.
  // Más adelante se puede volver a cerrar por dominio  si la DGPT lo solicita.
  const normalizado = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizado);
}

export function generarOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function enmascararCorreo(email: string) {
  const [usuario, dominio] = email.split("@");
  if (!usuario || !dominio) return email;
  const visible = usuario.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(2, usuario.length - 2))}@${dominio}`;
}

export async function enviarCorreo({
  para,
  asunto,
  html,
  texto,
}: {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? "Logística CBTIS 270 <no-reply@cetis270.edu.mx>";

  if (!host || !user || !pass) {
    console.log(`[MODO PRUEBAS EMAIL] Para: ${para} | Asunto: ${asunto} | ${texto}`);
    return { sent: false, reason: "SMTP no configurado" };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to: para, subject: asunto, text: texto, html });
  return { sent: true };
}

export function plantillaOtp(codigo: string) {
  return {
    asunto: "Código de verificación · Logística CBTIS 270",
    texto: `Tu código de verificación para la plataforma de Logística CBTIS 270 es: ${codigo}. Expira en 10 minutos.`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f4f6f5;padding:24px">
        <div style="max-width:520px;margin:auto;background:white;border-radius:18px;padding:28px;border:1px solid #d7e5dd">
          <h1 style="color:#0b5c3f;margin:0 0 8px">CBTIS 270 · Logística</h1>
          <p style="color:#445;margin:0 0 18px">Usa este código para verificar tu correo:</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#08301f;background:#ecfdf3;border-radius:14px;padding:18px;text-align:center">${codigo}</div>
          <p style="font-size:13px;color:#667;margin-top:18px">El código expira en 10 minutos. Si tú no solicitaste este registro, ignora este mensaje.</p>
        </div>
      </div>
    `,
  };
}
