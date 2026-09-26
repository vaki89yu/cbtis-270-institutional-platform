import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico de la conexión a PostgreSQL.
 * Nunca revela usuario ni contraseña: sólo el host y el mensaje de error.
 */
export async function GET() {
  const url = process.env.DATABASE_URL || "";

  let host: string | null = null;
  let baseDeDatos: string | null = null;
  try {
    const parsed = new URL(url);
    host = parsed.host;
    baseDeDatos = parsed.pathname.replace(/^\//, "") || null;
  } catch {
    host = null;
  }

  if (!url) {
    return Response.json(
      {
        ok: false,
        configurado: false,
        motivo: "La variable DATABASE_URL no existe en este despliegue.",
      },
      { status: 500 },
    );
  }

  try {
    const inicio = Date.now();
    await db.execute(sql`select 1`);
    const tablas = await db.execute(
      sql`select count(*)::int as total from information_schema.tables where table_schema = 'public'`,
    );
    return Response.json({
      ok: true,
      configurado: true,
      host,
      baseDeDatos,
      ms: Date.now() - inicio,
      tablasPublicas: (tablas.rows?.[0] as { total?: number } | undefined)?.total ?? null,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        configurado: true,
        host,
        baseDeDatos,
        error: (error as Error).message?.slice(0, 300) ?? "desconocido",
      },
      { status: 500 },
    );
  }
}
