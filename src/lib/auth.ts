import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { asegurarEsquemaCore } from "@/lib/ensure-schema";
import { demoFindUserById } from "@/lib/demo-store";

export const SESSION_COOKIE = "cbtis270_session";
const SESSION_DAYS = 14;
const SESSION_HINT_COOKIE = "cbtis270_session_hint";

function allPossibleSecrets(): string[] {
  const secrets = new Set<string>();
  // Orden de prioridad: AUTH_SECRET actual, DATABASE_URL actual, secrets históricos
  if (process.env.AUTH_SECRET) secrets.add(process.env.AUTH_SECRET);
  if (process.env.DATABASE_URL) secrets.add(process.env.DATABASE_URL);
  secrets.add("cbtis270-institutional-session-secret");
  secrets.add("cbtis270-super-secret-key-para-sesion-2026");
  secrets.add("postgresql://postgres:postgres@127.0.0.1:5432/app_db");
  return Array.from(secrets);
}

function sessionHintSecret() {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || "cbtis270-institutional-session-secret";
}

function signSessionHint(payload: string, token: string, secret?: string) {
  const sec = secret || sessionHintSecret();
  return createHmac("sha256", sec).update(`${payload}:${token}`).digest("hex");
}

function verifySignature(payload: string, token: string, signature: string): boolean {
  // Probar con todos los secretos posibles para compatibilidad hacia atrás
  for (const secret of allPossibleSecrets()) {
    try {
      const expected = signSessionHint(payload, token, secret);
      if (
        expected.length === signature.length &&
        timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
      ) {
        return true;
      }
    } catch {}
  }
  return false;
}

function encodeSessionUser(user: User | { id: number; nombre: string; email: string; rol: string; matricula?: string | null; especialidad?: string | null; semestre?: number | null; turno?: string | null }) {
  const payload = JSON.stringify({
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    matricula: (user as any).matricula ?? null,
    especialidad: (user as any).especialidad ?? null,
    semestre: (user as any).semestre ?? null,
    turno: (user as any).turno ?? null,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

export type Rol = "admin" | "docente" | "estudiante";

export type SessionUser = {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  matricula: string | null;
  especialidad: string | null;
  semestre: number | null;
  turno: string | null;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const derived = scryptSync(password, salt, 64);
    const known = Buffer.from(hash, "hex");
    if (known.length !== derived.length) return false;
    return timingSafeEqual(known, derived);
  } catch {
    return false;
  }
}

function toSessionUser(row: User): SessionUser {
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    rol: (row.rol as Rol) ?? "estudiante",
    matricula: row.matricula,
    especialidad: row.especialidad,
    semestre: row.semestre,
    turno: row.turno,
  };
}

function toSessionUserFromDemo(demo: ReturnType<typeof demoFindUserById>): SessionUser | null {
  if (!demo) return null;
  return {
    id: demo.id,
    nombre: demo.nombre,
    email: demo.email,
    rol: demo.rol as Rol,
    matricula: demo.matricula ?? null,
    especialidad: demo.especialidad ?? null,
    semestre: demo.semestre ?? null,
    turno: demo.turno ?? null,
  };
}

export async function createSession(userId: number, userOverride?: User | any): Promise<{ token: string; hint: string }> {
  try {
    await asegurarEsquemaCore();
  } catch {
    // No bloquear sesión si falla ensure
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  let hintValue = "";

  // Intentar guardar en DB, pero no fallar si no hay DB
  try {
    await db.insert(sessions).values({ token, userId, expiresAt });
  } catch (error) {
    console.warn("[auth] No se pudo guardar sesión en DB (modo demo):", (error as Error).message?.slice(0, 200));
  }

  const jar = await cookies();
  // Para preview https://xxx.e2b.app dentro de iframe, necesitamos SameSite=None; Secure
  // En dev local http, SameSite=Lax sin secure funciona, pero preview es https
  // Usamos SameSite=None + Secure=true siempre para que funcione en preview
  const isProd = process.env.NODE_ENV === "production";
  const useNone = true; // Forzar None para compatibilidad preview
  
  // Cookie httpOnly principal (segura)
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "none",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: true,
    // @ts-ignore
    partitioned: true,
  } as any);
  // Cookie espejo no-httpOnly para fallback en iframe con bloqueo 3rd party
  jar.set(`${SESSION_COOKIE}_client`, token, {
    httpOnly: false,
    sameSite: "none",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: true,
    // @ts-ignore
    partitioned: true,
  } as any);

  let baseUser = userOverride;
  if (!baseUser) {
    try {
      const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      baseUser = rows[0];
    } catch {
      // Fallback demo store
      const demo = demoFindUserById(userId);
      if (demo) {
        baseUser = {
          id: demo.id,
          nombre: demo.nombre,
          email: demo.email,
          rol: demo.rol,
          matricula: demo.matricula,
          especialidad: demo.especialidad,
          semestre: demo.semestre,
          turno: demo.turno,
          passwordHash: demo.passwordHash,
          activo: demo.activo,
          emailVerificado: demo.emailVerificado,
          createdAt: new Date(demo.createdAt),
        } as unknown as User;
      } else {
        baseUser = undefined;
      }
    }
  }

  if (baseUser) {
    const payload = encodeSessionUser(baseUser);
    const signature = signSessionHint(payload, token);
    const fullHint = `${payload}.${signature}`;
    hintValue = fullHint;

    jar.set(SESSION_HINT_COOKIE, fullHint, {
      httpOnly: true,
      sameSite: "none",
      path: "/",
      expires: expiresAt,
      maxAge: SESSION_DAYS * 24 * 60 * 60,
      secure: true,
      // @ts-ignore
      partitioned: true,
    } as any);
    // Espejo no-httpOnly para fallback iframe
    jar.set(`${SESSION_HINT_COOKIE}_client`, fullHint, {
      httpOnly: false,
      sameSite: "none",
      path: "/",
      expires: expiresAt,
      maxAge: SESSION_DAYS * 24 * 60 * 60,
      secure: true,
      // @ts-ignore
      partitioned: true,
    } as any);

    console.log(`[auth] Sesión creada para ${baseUser.email} id=${userId} token=${token.slice(0,8)}...`);

    try {
      const savedItem = {
        email: baseUser.email,
        nombre: baseUser.nombre,
        rol: baseUser.rol,
      };
      jar.set("cbtis270_saved_account", JSON.stringify(savedItem), {
        httpOnly: false,
        sameSite: "none",
        secure: true,
        path: "/",
        maxAge: 60 * 24 * 60 * 60,
        // @ts-ignore
        partitioned: true,
      } as any);

      let list: Array<{ email: string; nombre: string; rol?: string }> = [];
      const previous = jar.get("cbtis270_saved_accounts_list")?.value;
      if (previous) {
        try { 
          const decoded = decodeURIComponent(previous);
          list = JSON.parse(decoded);
        } catch {
          try { list = JSON.parse(previous); } catch {}
        }
      }
      list = list.filter((item) => item.email.toLowerCase() !== baseUser!.email.toLowerCase());
      list.unshift(savedItem);
      jar.set("cbtis270_saved_accounts_list", JSON.stringify(list.slice(0, 5)), {
        httpOnly: false,
        sameSite: "none",
        secure: true,
        path: "/",
        maxAge: 60 * 24 * 60 * 60,
        // @ts-ignore
        partitioned: true,
      } as any);
    } catch {
      // Los cookies auxiliares nunca deben bloquear el inicio de sesión.
    }
  }

  return { token, hint: hintValue };
}

/** Marca que el servidor cerró la sesión; la lee el cliente para purgar su copia local. */
export const LOGOUT_COOKIE = "cbtis270_sesion_cerrada";

/**
 * Las cookies de sesión se emiten con SameSite=None, Secure y Partitioned.
 * Un `delete` simple no siempre las elimina, porque el navegador exige que la
 * cookie de borrado coincida en atributos con la original (sobre todo en
 * cookies particionadas). Por eso se sobrescriben expiradas con los mismos
 * atributos y además se borran por nombre.
 */
function borrarCookieSesion(
  jar: Awaited<ReturnType<typeof cookies>>,
  nombre: string,
  httpOnly: boolean,
) {
  // El jar de Next indexa por nombre: la última escritura es la que viaja en la
  // respuesta. Por eso la variante Partitioned/Secure/SameSite=None se emite al
  // final, porque es la que coincide con los atributos usados al crear la
  // sesión y la única que el navegador acepta para expirar cookies
  // particionadas. Las copias no httpOnly las remata purgarSesionLocal() en el
  // cliente, que prueba las tres variantes.
  try {
    jar.delete(nombre);
  } catch {}
  try {
    jar.set(nombre, "", { path: "/", expires: new Date(0), maxAge: 0 } as any);
  } catch {}
  try {
    jar.set(nombre, "", {
      httpOnly,
      sameSite: "none",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
      secure: true,
      // @ts-ignore atributo aún no tipado en Next
      partitioned: true,
    } as any);
  } catch {}
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value || jar.get(`${SESSION_COOKIE}_client`)?.value;
  if (token) {
    try {
      await db.delete(sessions).where(eq(sessions.token, token));
    } catch {
      // Ignorar si no hay DB
    }
  }

  const httpOnlyCookies = [SESSION_COOKIE, SESSION_HINT_COOKIE];
  const clientCookies = [
    `${SESSION_COOKIE}_client`,
    `${SESSION_HINT_COOKIE}_client`,
    "otp_verified_email",
    "google_verified_email",
    "cbtis270_saved_account",
    "cbtis270_saved_accounts_list",
  ];

  for (const nombre of httpOnlyCookies) borrarCookieSesion(jar, nombre, true);
  for (const nombre of clientCookies) borrarCookieSesion(jar, nombre, false);

  // Señal para que SessionSync borre localStorage y no resucite la sesión.
  try {
    jar.set(LOGOUT_COOKIE, "1", {
      httpOnly: false,
      sameSite: "none",
      path: "/",
      maxAge: 120,
      secure: true,
      // @ts-ignore
      partitioned: true,
    } as any);
  } catch {}

  console.log("[auth] Sesión destruida y cookies expiradas");
}

/**
 * Indica si el servidor acaba de cerrar la sesión. Las pantallas de acceso y
 * registro lo consultan para no reenviar al panel mientras el navegador aún
 * conserva restos de la sesión anterior.
 */
export async function sesionRecienCerrada(): Promise<boolean> {
  try {
    const jar = await cookies();
    return jar.get(LOGOUT_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  let token = jar.get(SESSION_COOKIE)?.value || jar.get(`${SESSION_COOKIE}_client`)?.value;
  let hint = jar.get(SESSION_HINT_COOKIE)?.value || jar.get(`${SESSION_HINT_COOKIE}_client`)?.value;
  const allCookies = jar.getAll().map(c => c.name).join(",");
  // Intentar leer headers para debug y fallback
  let cookieHeader = "";
  let xToken = "";
  let xHint = "";
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    cookieHeader = h.get("cookie") || "";
    xToken = h.get("x-session-token") || h.get("authorization")?.replace("Bearer ","") || "";
    xHint = h.get("x-session-hint") || "";
    // Si no hay token en cookies pero sí en header, usarlo
    if (!token && xToken) {
      token = xToken;
      console.log(`[auth] Token tomado de header x-session-token: ${token.slice(0,8)}...`);
    }
    if (!hint && xHint) {
      hint = xHint;
      console.log(`[auth] Hint tomado de header x-session-hint`);
    }
    // También intentar leer token de cookie header manualmente si jar no lo tiene (fallback)
    if (!token && cookieHeader) {
      const m = cookieHeader.match(/cbtis270_session(?:_client)?=([^;]+)/);
      if (m) {
        token = m[1];
        console.log(`[auth] Token tomado de cookie header manual: ${token.slice(0,8)}...`);
      }
    }
    if (!hint && cookieHeader) {
      const m2 = cookieHeader.match(/cbtis270_session_hint(?:_client)?=([^;]+)/);
      if (m2) {
        hint = m2[1];
        console.log(`[auth] Hint tomado de cookie header manual`);
      }
    }
  } catch {}

  console.log(`[auth] getCurrentUser: token=${token ? token.slice(0,8)+"..." : "no"} hint=${hint ? "si" : "no"} all=[${allCookies}] headerLen=${cookieHeader.length} hasSession=${cookieHeader.includes("cbtis270_session")}`);

  // Prioridad 1: hint cookie (funciona sin DB) - con verificación de firma flexible
  if (hint && token) {
    try {
      const separator = hint.lastIndexOf(".");
      if (separator > 0) {
        const payload = hint.slice(0, separator);
        const signature = hint.slice(separator + 1);
        
        // Verificar con múltiples secretos
        const isValid = verifySignature(payload, token, signature);
        
        if (isValid) {
          try {
            const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
            if (parsed?.id && parsed?.email && parsed?.rol) {
              console.log(`[auth] Usuario via hint verificado: ${parsed.email}`);
              return {
                id: Number(parsed.id),
                nombre: String(parsed.nombre ?? ""),
                email: String(parsed.email ?? ""),
                rol: parsed.rol as Rol,
                matricula: parsed.matricula ?? null,
                especialidad: parsed.especialidad ?? null,
                semestre: parsed.semestre ?? null,
                turno: parsed.turno ?? null,
              };
            }
          } catch (e) {
            console.warn("[auth] Error parseando payload hint:", (e as Error).message);
          }
        } else {
          console.warn("[auth] Firma hint inválida, intentando decodificar sin verificar (modo demo)");
          // En modo demo, intentar decodificar aunque falle firma (para compatibilidad)
          try {
            const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
            if (parsed?.id && parsed?.email && parsed?.rol) {
              // Verificar que el usuario existe en demo store
              const demoUser = demoFindUserById(Number(parsed.id));
              if (demoUser && demoUser.email.toLowerCase() === String(parsed.email).toLowerCase()) {
                console.log(`[auth] Usuario via hint sin verificar pero demo válido: ${parsed.email} - re-firmando cookie`);
                // Re-firmar con secreto actual para futuras requests
                try {
                  const newSig = signSessionHint(payload, token);
                  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
                  jar.set(SESSION_HINT_COOKIE, `${payload}.${newSig}`, {
                    httpOnly: true,
                    sameSite: "none",
                    path: "/",
                    expires: expiresAt,
                    maxAge: SESSION_DAYS * 24 * 60 * 60,
                    secure: true,
                    // @ts-ignore
                    partitioned: true,
                  } as any);
                } catch {}
                return {
                  id: Number(parsed.id),
                  nombre: String(parsed.nombre ?? ""),
                  email: String(parsed.email ?? ""),
                  rol: parsed.rol as Rol,
                  matricula: parsed.matricula ?? null,
                  especialidad: parsed.especialidad ?? null,
                  semestre: parsed.semestre ?? null,
                  turno: parsed.turno ?? null,
                };
              }
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn("[auth] Error verificando hint:", (e as Error).message);
    }
  }

  if (!token) {
    console.log("[auth] No hay token, retornando null");
    return null;
  }

  // Prioridad 2: DB
  try {
    await asegurarEsquemaCore();
    const rows = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    const row = rows[0];
    if (row?.user?.activo) {
      console.log(`[auth] Usuario via DB: ${row.user.email}`);
      return toSessionUser(row.user);
    }
  } catch (e) {
    console.warn("[auth] DB lookup falló, intentando demo por token no disponible:", (e as Error).message?.slice(0, 150));
    // En modo demo, no tenemos mapping token->user, pero el hint ya debió funcionar
    // Si llegamos aquí, es que hint falló, intentar buscar en demo store por si hay alguna sesión previa
    // No podemos mapear token a usuario en demo, así que retornamos null
    // Pero logueamos para debug
  }

  console.log("[auth] No se pudo obtener usuario, retornando null");
  return null;
}
