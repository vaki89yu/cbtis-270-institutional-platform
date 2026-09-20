import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { esCorreoInstitucional } from "@/lib/email";
import { getGoogleCredentials, origenPublico } from "@/lib/google";
import { notificarDocentesInicioSesion, registrarActividad } from "@/lib/notificaciones";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    redirect("/google?error=config");
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const savedState = jar.get("google_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    redirect("/login?google=state");
  }

  const credenciales = await getGoogleCredentials();
  if (!credenciales) {
    redirect("/google?error=config");
  }

  const redirectUri = `${origenPublico(request)}/api/auth/google/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: credenciales.clientId,
      client_secret: credenciales.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) redirect("/login?google=token");
  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenData.access_token) redirect("/login?google=token");

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileResponse.ok) redirect("/login?google=perfil");

  const profile = (await profileResponse.json()) as {
    email?: string;
    name?: string;
    email_verified?: boolean;
  };
  const email = profile.email?.toLowerCase() ?? "";

  if (!profile.email_verified || !esCorreoInstitucional(email)) {
    redirect("/login?google=correo");
  }

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];

  jar.delete("google_oauth_state");

  if (!user) {
    jar.set("google_verified_email", email, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 20 * 60,
      secure: process.env.NODE_ENV === "production",
    });
    const params = new URLSearchParams({
      googleEmail: email,
      googleVerified: "1",
      googleMode: "1",
    });
    if (profile.name) params.set("googleName", profile.name);
    redirect(`/registro?${params.toString()}`);
  }
  if (!user.activo) redirect("/login?google=inactivo");

  await createSession(user.id);
  await registrarActividad(user.id, "inicio_sesion_google", "Acceso con cuenta Google real.");
  if (user.rol === "estudiante") await notificarDocentesInicioSesion(user.id);
  redirect("/panel");
}
