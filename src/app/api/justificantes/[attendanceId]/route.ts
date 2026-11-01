import { getCurrentUser } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { generarJustificantePdf } from "@/lib/formatos/justificante";
import { datosJustificante } from "@/lib/justificantes";
import { puedeVerDocumentoAlumno } from "@/lib/permisos-documentos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Justificante de inasistencia en PDF, con los mismos permisos que el expediente. */
export async function GET(
  _request: Request,
  contexto: { params: Promise<{ attendanceId: string }> },
) {
  const { attendanceId: idTexto } = await contexto.params;
  const asistenciaId = Number(idTexto);

  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Inicia sesión para descargar el justificante." }, { status: 401 });
  }
  if (!Number.isFinite(asistenciaId) || asistenciaId <= 0) {
    return Response.json({ ok: false, error: "Registro de asistencia inválido." }, { status: 400 });
  }

  let datos;
  try {
    datos = await datosJustificante(asistenciaId);
  } catch (error) {
    console.warn("[justificantes] Sin base de datos:", (error as Error).message?.slice(0, 140));
    return Response.json(
      { ok: false, error: "El justificante necesita la base de datos del plantel. Intenta más tarde." },
      { status: 503 },
    );
  }

  if (!datos) {
    return Response.json({ ok: false, error: "Registro no encontrado." }, { status: 404 });
  }

  if (!(await puedeVerDocumentoAlumno(user, datos.alumno.id))) {
    return Response.json({ ok: false, error: "No tienes permiso para este justificante." }, { status: 403 });
  }

  const bytes = await generarJustificantePdf(datos);

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "justificante_generado",
    entidad: "attendance",
    entidadId: asistenciaId,
    detalle: `Alumno #${datos.alumno.id} · ${datos.curso.clave} · ${datos.estado} · folio ${datos.folio}`,
  });

  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="CBTIS270-justificante-${datos.alumno.matricula ?? asistenciaId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
