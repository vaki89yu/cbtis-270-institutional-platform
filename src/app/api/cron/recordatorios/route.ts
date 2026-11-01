import { getCurrentUser } from "@/lib/auth";
import { ejecutarRecordatorios } from "@/lib/recordatorios";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

/**
 * Cron diario de recordatorios.
 *
 * Autorización:
 *  - Vercel Cron manda `Authorization: Bearer $CRON_SECRET` automáticamente.
 *  - Sin `CRON_SECRET` configurado, sólo dirección puede ejecutarlo a mano
 *    (útil para probar en el preview antes de crear la variable).
 *
 * Parámetros opcionales:
 *  - `tarea=diario`   → sólo avisos de 48 h y vencidas.
 *  - `tarea=semanal`  → sólo resumen para docentes.
 *  - `semanal=1`      → fuerza el resumen aunque no sea lunes.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET?.trim();
  const cabecera = request.headers.get("authorization");
  const porCron = Boolean(secreto) && cabecera === `Bearer ${secreto}`;

  let porAdmin = false;
  if (!porCron) {
    const user = await getCurrentUser();
    porAdmin = user?.rol === "admin";
  }

  if (!porCron && !porAdmin) {
    if (!secreto) {
      return Response.json(
        {
          ok: false,
          error:
            "CRON_SECRET no está configurado en este entorno. Define la variable en Vercel o entra como dirección para ejecutarlo a mano.",
        },
        { status: 503 },
      );
    }
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const tarea = (url.searchParams.get("tarea") ?? "todo").toLowerCase();
  const soloDiario = tarea === "diario";
  const esLunes = new Date().getUTCDay() === 1;
  const semanal =
    tarea === "semanal" || url.searchParams.get("semanal") === "1" || (!soloDiario && esLunes);

  const resultado = await ejecutarRecordatorios({
    semanal,
    soloDiario,
    soloSemanal: tarea === "semanal" && url.searchParams.get("semanal") !== "0",
  });

  return Response.json(
    { ...resultado, via: porCron ? "cron" : "admin", semanal },
    { status: resultado.sinBaseDeDatos ? 503 : 200 },
  );
}
