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

function sessionHintSecret() {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || "cbtis270-institutional-session-secret";
}

function signSessionHint(payload: string, token: string) {
  return createHmac("sha256", sessionHintSecret()).update(`${payload}:${token}`).digest("hex");
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

export async function createSession(userId: number, userOverride?: User | any) {
  try {
    await asegurarEsquemaCore();
  } catch {
    // No bloquear sesión si falla ensure
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  // Intentar guardar en DB, pero no fallar si no hay DB
  try {
    await db.insert(sessions).values({ token, userId, expiresAt });
  } catch (error) {
    console.warn("[auth] No se pudo guardar sesión en DB (modo demo):", (error as Error).message?.slice(0, 200));
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
  });

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
    jar.set(SESSION_HINT_COOKIE, `${payload}.${signSessionHint(payload, token)}`, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
      secure: process.env.NODE_ENV === "production",
    });

    try {
      const savedItem = {
        email: baseUser.email,
        nombre: baseUser.nombre,
        rol: baseUser.rol,
      };
      jar.set("cbtis270_saved_account", JSON.stringify(savedItem), {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 24 * 60 * 60,
      });

      let list: Array<{ email: string; nombre: string; rol?: string }> = [];
      const previous = jar.get("cbtis270_saved_accounts_list")?.value;
      if (previous) {
        try { list = JSON.parse(previous); } catch {}
      }
      list = list.filter((item) => item.email.toLowerCase() !== baseUser!.email.toLowerCase());
      list.unshift(savedItem);
      jar.set("cbtis270_saved_accounts_list", JSON.stringify(list.slice(0, 5)), {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 24 * 60 * 60,
      });
    } catch {
      // Los cookies auxiliares nunca deben bloquear el inicio de sesión.
    }
  }
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await db.delete(sessions).where(eq(sessions.token, token));
    } catch {
      // Ignorar si no hay DB
    }
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(SESSION_HINT_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const hint = jar.get(SESSION_HINT_COOKIE)?.value;

  // Prioridad 1: hint cookie (funciona sin DB)
  if (hint && token) {
    try {
      const separator = hint.lastIndexOf(".");
      if (separator > 0) {
        const payload = hint.slice(0, separator);
        const signature = hint.slice(separator + 1);
        const expected = signSessionHint(payload, token);

        if (
          expected.length === signature.length &&
          timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
        ) {
          const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
          if (parsed?.id && parsed?.email && parsed?.rol) {
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
      }
    } catch {}
  }

  if (!token) return null;

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
    if (row?.user?.activo) return toSessionUser(row.user);
  } catch {
    // Si falla DB, intentar demo store por si el token es de demo
    // En modo demo, el hint ya debió resolver, pero por si acaso
    try {
      // No tenemos mapping token->user en demo, pero el hint ya cubre
      // Intentar buscar usuario demo por token no es posible, retornar null
    } catch {}
  }

  return null;
}
