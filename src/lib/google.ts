import { db } from "@/db";
import { platformSettings } from "@/db/schema";

export function origenPublico(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) return `https://${forwardedHost.split(",")[0].trim()}`;
  const host = request.headers.get("host");
  if (host && !host.startsWith("0.0.0.0") && !host.startsWith("127.0.0.1")) {
    const proto = host.includes("localhost") ? "http" : "https";
    return `${proto}://${host}`;
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function esClientIdGoogle(clientId: string) {
  return /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(clientId);
}

export async function getGoogleCredentials() {
  const envId = process.env.GOOGLE_CLIENT_ID?.trim();
  const envSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (envId && envSecret && esClientIdGoogle(envId)) {
    return { clientId: envId, clientSecret: envSecret, source: "env" as const };
  }

  try {
    const rows = await db.select().from(platformSettings).limit(1);
    const row = rows[0];
    if (row?.googleClientId && row.googleClientSecret && esClientIdGoogle(row.googleClientId)) {
      return {
        clientId: row.googleClientId,
        clientSecret: row.googleClientSecret,
        source: "db" as const,
      };
    }
  } catch {
    /* tabla aún no existe */
  }

  return null;
}
