import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { enrollments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { avanzarSimulacion, embarquePorId, estadoDeRastreo, registrarPosicionReal } from "@/lib/academico/rastreo";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

/**
 * ¿Puede este usuario seguir este embarque?
 * Admin y docentes siempre (los escenarios son material didáctico del plantel);
 * el operador asignado siempre; el alumno, si el escenario se vinculó a un aula,
 * sólo cuando está inscrito en ella.
 */
async function puedeVer(shipmentId: number, userId: number, rol: string): Promise<boolean> {
  if (rol === "admin" || rol === "docente") return true;

  const fila = await embarquePorId(shipmentId);
  if (!fila) return false;
  const emb = fila.embarque;
  if (emb.docenteId === userId || emb.operadorId === userId) return true;
  if (!emb.courseId) return true;

  const [inscrito] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, emb.courseId), eq(enrollments.studentId, userId)))
    .limit(1);
  return Boolean(inscrito);
}

/**
 * GET: estado actual del embarque. Si va en modo simulado, cada consulta lo hace
 * avanzar según el tiempo transcurrido: así el recorrido avanza solo mientras
 * alguien tiene la pantalla abierta, sin necesidad de un proceso en segundo plano.
 */
export async function GET(_request: Request, { params }: Contexto) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Inicia sesión." }, { status: 401 });

  const { id } = await params;
  const shipmentId = Number(id);
  if (!Number.isFinite(shipmentId)) {
    return Response.json({ ok: false, error: "Embarque no válido." }, { status: 400 });
  }

  const fila = await embarquePorId(shipmentId);
  if (!fila) return Response.json({ ok: false, error: "Embarque no encontrado." }, { status: 404 });
  if (!(await puedeVer(shipmentId, user.id, user.rol))) {
    return Response.json({ ok: false, error: "Este embarque no es de tu grupo." }, { status: 403 });
  }

  const emb = fila.embarque;
  try {
    const estado = emb.modo === "simulado" ? await avanzarSimulacion(emb) : estadoDeRastreo(emb);
    return Response.json({ ok: true, modo: emb.modo, folio: emb.folio, ...estado });
  } catch (error) {
    return Response.json(
      { ok: false, error: "No se pudo leer la posición.", detalle: (error as Error).message?.slice(0, 150) },
      { status: 500 },
    );
  }
}

/**
 * POST: el operador asignado comparte la ubicación real de su celular.
 * Sólo la puede enviar el operador del embarque, su docente o un administrador.
 */
export async function POST(request: Request, { params }: Contexto) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Inicia sesión." }, { status: 401 });

  const { id } = await params;
  const shipmentId = Number(id);
  if (!Number.isFinite(shipmentId)) {
    return Response.json({ ok: false, error: "Embarque no válido." }, { status: 400 });
  }

  const fila = await embarquePorId(shipmentId);
  if (!fila) return Response.json({ ok: false, error: "Embarque no encontrado." }, { status: 404 });

  const emb = fila.embarque;
  const esOperador = emb.operadorId === user.id;
  const esResponsable = user.rol === "admin" || emb.docenteId === user.id;
  if (!esOperador && !esResponsable) {
    return Response.json(
      { ok: false, error: "Sólo el operador asignado puede compartir la ubicación de este embarque." },
      { status: 403 },
    );
  }

  let body: { lat?: number; lng?: number; velocidad?: number };
  try {
    body = (await request.json()) as { lat?: number; lng?: number; velocidad?: number };
  } catch {
    return Response.json({ ok: false, error: "Petición inválida." }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return Response.json({ ok: false, error: "Coordenadas fuera de rango." }, { status: 400 });
  }

  try {
    const estado = await registrarPosicionReal({
      emb,
      lat,
      lng,
      velocidad: Number.isFinite(Number(body.velocidad)) ? Number(body.velocidad) : 0,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
    });
    return Response.json({ ok: true, ...estado });
  } catch (error) {
    return Response.json(
      { ok: false, error: "No se pudo guardar la posición.", detalle: (error as Error).message?.slice(0, 150) },
      { status: 500 },
    );
  }
}
