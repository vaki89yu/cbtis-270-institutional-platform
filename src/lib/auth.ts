import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { asegurarEsquemaCore } from "@/lib/ensure-schema";

export const SESSION_COOKIE = "cbtis270_session";
const SESSION_DAYS = 14;

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
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    await asegurarEsquemaCore();
  } catch {
    return null;
  }
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const rows = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    const row = rows[0];
    if (!row || !row.user.activo) return null;
    return toSessionUser(row.user);
  } catch {
    return null;
  }
}
