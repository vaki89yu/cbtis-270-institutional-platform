import { db, normalizarCadenaConexion } from "@/db";
import { sql } from "drizzle-orm";
import { asegurarEsquemaCore } from "@/lib/ensure-schema";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico de la conexión a PostgreSQL.
 * Nunca revela usuario ni contraseña: sólo el host y el mensaje de error.
 */
export async function GET(request: Request) {
  const crudo = process.env.DATABASE_URL || "";
  const params = new URL(request.url).searchParams;
  const inicializar = params.get("init") === "1";
  const tablaConsultada = (params.get("tabla") ?? "").replace(/[^a-z_]/gi, "").slice(0, 60);
  const url = normalizarCadenaConexion(crudo);

  if (!crudo) {
    return Response.json(
      { ok: false, configurado: false, motivo: "La variable DATABASE_URL no existe en este despliegue." },
      { status: 500 },
    );
  }

  // Forma de la cadena, sin exponer credenciales
  const forma = {
    longitud: crudo.length,
    esquema: url.split("://")[0]?.slice(0, 20) ?? null,
    teniaEspacios: /\s/.test(crudo),
    teniaComillas: /^["']|["']$/.test(crudo.trim()),
    urlValida: (() => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    })(),
    final: url.slice(-40),
  };

  let host: string | null = null;
  let baseDeDatos: string | null = null;
  try {
    const parsed = new URL(url);
    host = parsed.host;
    baseDeDatos = parsed.pathname.replace(/^\//, "") || null;
  } catch {
    host = null;
  }

  try {
    const inicio = Date.now();
    await db.execute(sql`select 1`);
    // ?init=1 crea las tablas que falten (todo el DDL es idempotente)
    if (inicializar) await asegurarEsquemaCore();
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
      esquemaInicializado: inicializar,
      columnas: tablaConsultada
        ? (
            await db.execute(
              sql`select column_name from information_schema.columns
                  where table_schema = 'public' and table_name = ${tablaConsultada}
                  order by ordinal_position`,
            )
          ).rows.map((r) => (r as { column_name: string }).column_name)
        : undefined,
    });
  } catch (error) {
    const err = error as Error & { cause?: Error; code?: string };
    return Response.json(
      {
        ok: false,
        configurado: true,
        host,
        baseDeDatos,
        forma,
        error: err.message?.slice(0, 200) ?? "desconocido",
        causa: err.cause?.message?.slice(0, 300) ?? null,
        codigo: err.code ?? (err.cause as (Error & { code?: string }) | undefined)?.code ?? null,
      },
      { status: 500 },
    );
  }
}
