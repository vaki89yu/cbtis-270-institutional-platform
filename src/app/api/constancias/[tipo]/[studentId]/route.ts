import { getCurrentUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { expedienteCompletoEstudiante } from "@/lib/consultas";
import { datosConstancia, folioDe, tipoConstanciaValido, type TipoConstancia } from "@/lib/constancias";
import { generarConstanciaEstudiosPdf, generarKardexPdf } from "@/lib/formatos/constancia";
import { puedeAdministrarAula } from "@/lib/permisos-aula";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Constancia de estudios y kardex académico en PDF.
 *
 * Permisos: el propio alumno, el docente encargado, cualquier docente del aula
 * (principal o co-docente) y dirección. Cualquier otra persona recibe 403 sin
 * datos del alumno.
 */
async function puedeDescargar(user: SessionUser, studentId: number): Promise<boolean> {
  if (user.rol === "admin") return true;
  if (user.rol === "estudiante") return user.id === studentId;
  if (user.rol !== "docente") return false;

  const expediente = await expedienteCompletoEstudiante(studentId);
  if (!expediente) return false;

  if (expediente.perfil?.tutorDocenteId === user.id) return true;
  for (const { curso } of expediente.cursos) {
    if (curso.docenteId === user.id) return true;
    if (await puedeAdministrarAula(user, curso.id)) return true;
  }
  return false;
}

export async function GET(
  _request: Request,
  contexto: { params: Promise<{ tipo: string; studentId: string }> },
) {
  const { tipo, studentId: idTexto } = await contexto.params;
  const studentId = Number(idTexto);

  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "Inicia sesión para descargar el documento." },
      { status: 401 },
    );
  }

  if (!tipoConstanciaValido(tipo)) {
    return Response.json(
      { ok: false, error: "Documento no disponible. Usa constancia o kardex." },
      { status: 404 },
    );
  }

  if (!Number.isFinite(studentId) || studentId <= 0) {
    return Response.json({ ok: false, error: "Alumno inválido." }, { status: 400 });
  }

  if (!(await puedeDescargar(user, studentId))) {
    return Response.json(
      { ok: false, error: "No tienes permiso para descargar este documento." },
      { status: 403 },
    );
  }

  const datos = await datosConstancia(studentId);
  if (!datos) {
    return Response.json({ ok: false, error: "Alumno no encontrado." }, { status: 404 });
  }

  datos.folio = folioDe(tipo as TipoConstancia, studentId, datos.emitidoEn);

  const bytes =
    tipo === "kardex" ? await generarKardexPdf(datos) : await generarConstanciaEstudiosPdf(datos);

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "constancia_generada",
    entidad: "student",
    entidadId: studentId,
    detalle: `${tipo === "kardex" ? "Kardex" : "Constancia de estudios"} · folio ${datos.folio}`,
  });

  const nombreArchivo = `CBTIS270-${tipo}-${datos.alumno.matricula ?? studentId}.pdf`;

  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
