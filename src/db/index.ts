import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Limpia los errores típicos al pegar la cadena de conexión en Vercel:
 * comillas alrededor, saltos de línea, el prefijo `DATABASE_URL=`, el comando
 * `psql` completo o el parámetro `channel_binding` que node-postgres no acepta.
 */
export function normalizarCadenaConexion(valor: string): string {
  let url = (valor || "").trim();
  if (!url) return "";

  url = url.replace(/^psql\s+/i, "").trim();
  url = url.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
  // Comillas simples o dobles envolviendo el valor
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  // Saltos de línea o espacios intermedios que rompen la URL
  url = url.replace(/\s+/g, "");
  if (url.startsWith("postgres://")) url = `postgresql://${url.slice("postgres://".length)}`;
  return url;
}

const databaseUrl = normalizarCadenaConexion(process.env.DATABASE_URL || "");

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaDbAvailable?: boolean;
};

let pool: Pool;

if (!databaseUrl) {
  console.warn("[DB] DATABASE_URL no configurado - usando modo demo sin base de datos");
  // Pool dummy que fallará al conectar pero no rompe la importación
  pool = new Pool({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    connectionTimeoutMillis: 1000,
    idleTimeoutMillis: 1000,
  });
  // Evitar que errores de conexión no manejados crasheen el proceso
  pool.on("error", () => {});
  globalForDb.__arenaDbAvailable = false;
} else {
  // Neon, Supabase, Render y en general cualquier Postgres administrado exigen
  // TLS. node-postgres NO lo activa solo, así que lo encendemos salvo que la
  // conexión sea local.
  const esLocal = /@(localhost|127\.0\.0\.1)/i.test(databaseUrl);
  const sslDesactivado = /sslmode=disable/i.test(databaseUrl);
  const ssl = esLocal || sslDesactivado ? undefined : { rejectUnauthorized: false };

  pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
      ssl,
      connectionTimeoutMillis: 10000,
      max: 5,
    });
  pool.on("error", (err) => {
    console.warn("[DB] Pool error (modo demo activo):", err.message);
  });
  globalForDb.__arenaDbAvailable = true;
}

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export { pool };

// Helper para saber si la DB está disponible
export function isDbConfigured(): boolean {
  return !!databaseUrl && (globalForDb.__arenaDbAvailable ?? true);
}

// Drizzle instance - siempre se crea, pero las queries fallarán si no hay DB
// y serán capturadas en los callers
export const db = drizzle(pool);

// Wrapper seguro para operaciones de DB que retorna null si falla
export async function safeDbOperation<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn("[DB] Operación falló, usando fallback demo:", (error as Error).message?.slice(0, 200));
    return fallback;
  }
}
