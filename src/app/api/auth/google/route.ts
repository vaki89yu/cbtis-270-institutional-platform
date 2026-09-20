import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { getGoogleCredentials, origenPublico } from "@/lib/google";

export async function GET(request: Request) {
  const credenciales = await getGoogleCredentials();
  if (!credenciales) {
    redirect("/google");
  }

  const origin = origenPublico(request);
  const state = randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
    secure: process.env.NODE_ENV === "production",
  });

  const redirectUri = `${origin}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: credenciales.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
    include_granted_scopes: "true",
  });

  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
