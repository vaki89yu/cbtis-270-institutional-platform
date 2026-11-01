import { getCurrentUser } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { generarReporteGrupoPdf } from "@/lib/formatos/reporte-grupo";
import { puedeAdministrarAula } from "@/lib/permisos-aula";
import { datosReporteGrupo } from "@/lib/reportes-grupo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Reporte de grupo en PDF. Sólo dirección y los docentes del aula. */
export async function GET(
  _request: Request,
  contexto: { params: Promise<{ courseId: string }> },
) {
  const { courseId: idTexto } = await contexto.params;
  const courseId = Number(idTexto);

  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Inicia sesión para descargar el reporte." }, { status: 401 });
  }
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return Response.json({ ok: false, error: "Aula inválida." }, { status: 400 });
  }
  if (!(await puedeAdministrarAula(user, courseId))) {
    return Response.json({ ok: false, error: "No tienes permiso para este aula." }, { status: 403 });
  }

  let datos;
  try {
    datos = await datosReporteGrupo(courseId);
  } catch (error) {
    console.warn("[reportes/grupo] Sin base de datos:", (error as Error).message?.slice(0, 140));
    return Response.json(
      { ok: false, error: "El reporte necesita la base de datos del plantel. Intenta más tarde." },
      { status: 503 },
    );
  }

  if (!datos) {
    return Response.json({ ok: false, error: "Aula no encontrada." }, { status: 404 });
  }

  const bytes = await generarReporteGrupoPdf(datos);

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "reporte_grupo_generado",
    entidad: "course",
    entidadId: courseId,
    detalle: `${datos.curso.clave}: ${datos.filas.length} alumno(s) · ${datos.pendientesTotales} entrega(s) pendiente(s) · folio ${datos.folio}`,
  });

  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="CBTIS270-reporte-${datos.curso.clave}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
