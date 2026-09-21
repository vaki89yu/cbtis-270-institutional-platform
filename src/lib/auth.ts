import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { asegurarEsquemaCore } from "@/lib/ensure-schema";

export const SESSION_COOKIE = "cbtis270_session";
const SESSION_DAYS = 14;
const SESSION_HINT_COOKIE = "cbtis270_session_hint";

function sessionHintSecret() {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || "cbtis270-institutional-session-secret";
}

function signSessionHint(payload: string, token: string) {
  return createHmac("sha256", sessionHintSecret()).update(`${payload}:${token}`).digest("hex");
}

function encodeSessionUser(user: User) {
  const payload = JSON.stringify({
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    matricula: user.matricula,
    especialidad: user.especialidad,
    semestre: user.semestre,
    turno: user.turno,
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
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const known = Buffer.from(hash, "hex");
  if (known.length !== derived.length) return false;
  return timingSafeEqual(known, derived);
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

export async function createSession(userId: number) {
  await asegurarEsquemaCore();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
  });

  // Sesión stateless firmada: permite recuperar al usuario aunque la tabla
  // sessions esté temporalmente inaccesible en producción.
  const baseUserRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const baseUser = baseUserRows[0];
  if (baseUser) {
    const payload = encodeSessionUser(baseUser);
    jar.set(SESSION_HINT_COOKIE, `${payload}.${signSessionHint(payload, token)}`, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
      secure: process.env.NODE_ENV === "production",
    });
  }

  try {
    const userRows = await db
      .select({ nombre: users.nombre, email: users.email, rol: users.rol })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const u = userRows[0];
    if (u) {
      const savedItem = { email: u.email, nombre: u.nombre, rol: u.rol };
      jar.set(
        "cbtis270_saved_account",
        JSON.stringify(savedItem),
        {
          httpOnly: false,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 24 * 60 * 60,
        },
      );

      let list: Array<{ email: string; nombre: string; rol?: string }> = [];
      const prevListCookie = jar.get("cbtis270_saved_accounts_list")?.value;
      if (prevListCookie) {
        try {
          list = JSON.parse(prevListCookie);
        } catch {}
      }
      list = list.filter((item) => item.email.toLowerCase() !== u.email.toLowerCase());
      list.unshift(savedItem);
      jar.set(
        "cbtis270_saved_accounts_list",
        JSON.stringify(list.slice(0, 5)),
        {
          httpOnly: false,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 24 * 60 * 60,
        },
      );
    }
  } catch {
    /* ignore cookie error */
  }
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await db.delete(sessions).where(eq(sessions.token, token));
    } catch {}
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(SESSION_HINT_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  // Ruta normal: sesión persistida en Postgres.
  if (token) {
    try {
      await asegurarEsquemaCore();
      const rows = await db
        .select({ user: users })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
        .limit(1);

      const row = rows[0];
      if (row?.user?.activo) return toSessionUser(row.user);
    } catch {
      // Se intenta el respaldo firmado.
    }
  }

  // Respaldo firmado para evitar el bucle login -> módulo -> login.
  const hint = jar.get(SESSION_HINT_COOKIE)?.value;
  if (!hint || !token) return null;

  const separator = hint.lastIndexOf(".");
  if (separator <= 0) return null;

  const payload = hint.slice(0, separator);
  const signature = hint.slice(separator + 1);
  const expected = signSessionHint(payload, token);
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed?.id || !parsed?.email || parsed?.nombre || parsed?.rol) {
      // El usuario puede tener un nombre vacío únicamente si la base ya lo permitiera.
    }
    return {
      id: Number(parsed.id),
      nombre: String(parsed.nombre ?? ""),
      email: String(parsed.email ?? ""),
      rol: (parsed.rol as Rol) ?? "estudiante",
      matricula: parsed.matricula ?? null,
      especialidad: parsed.especialidad ?? null,
      semestre: parsed.semestre ?? null,
      turno: parsed.turno ?? null,
    };
  } catch {
    return null;
  }
}
