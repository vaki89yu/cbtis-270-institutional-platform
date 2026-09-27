import { getCurrentUser } from "@/lib/auth";
import { calificarCuestionario, cuestionarioPorClave, veredicto } from "@/lib/academico/cuestionarios";
import { guardarIntento } from "@/lib/academico/evaluaciones";

export const dynamic = "force-dynamic";

/**
 * Califica un intento de cuestionario.
 *
 * Es el único punto donde las respuestas correctas se comparan: el navegador
 * manda sólo el índice que el alumno eligió en cada reactivo y recibe, ya
 * calificado, la explicación correspondiente.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Inicia sesión para responder el cuestionario." }, { status: 401 });
  }

  let body: { clave?: string; respuestas?: number[]; duracionSeg?: number; agotado?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Petición inválida." }, { status: 400 });
  }

  const clave = String(body.clave ?? "");
  const cuestionario = cuestionarioPorClave(clave);
  if (!cuestionario) {
    return Response.json({ ok: false, error: "Ese cuestionario no existe." }, { status: 404 });
  }

  const respuestas = Array.isArray(body.respuestas) ? body.respuestas.map((r) => Number(r)) : [];
  if (respuestas.length !== cuestionario.preguntas.length) {
    return Response.json(
      { ok: false, error: "Faltan reactivos por responder en el envío." },
      { status: 400 },
    );
  }

  const resultado = calificarCuestionario(clave, respuestas);
  if (!resultado) {
    return Response.json({ ok: false, error: "No se pudo calificar el intento." }, { status: 500 });
  }

  const duracionSeg = Number.isFinite(Number(body.duracionSeg)) ? Number(body.duracionSeg) : 0;

  try {
    await guardarIntento({
      clave,
      studentId: user.id,
      courseId: null,
      correctas: resultado.correctas,
      total: resultado.total,
      calificacion: resultado.calificacion,
      duracionSeg,
      respuestas,
      agotado: Boolean(body.agotado),
      alumnoNombre: user.nombre,
    });
  } catch {
    // Sin base de datos el intento no se guarda, pero la calificación sí se entrega.
  }

  return Response.json({
    ok: true,
    clave,
    correctas: resultado.correctas,
    total: resultado.total,
    calificacion: resultado.calificacion,
    detalle: resultado.detalle,
    veredicto: veredicto(resultado.calificacion),
  });
}
