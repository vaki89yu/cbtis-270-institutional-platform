/**
 * Permisos para documentos oficiales de un alumno (constancia, kardex,
 * justificantes). Dirección ve todo; el docente sólo a quien tutoriza o a los
 * alumnos de sus aulas (titular o co-docente); el estudiante sólo los suyos.
 */

import type { SessionUser } from "@/lib/auth";
import { expedienteCompletoEstudiante } from "@/lib/consultas";
import { puedeAdministrarAula } from "@/lib/permisos-aula";

export async function puedeVerDocumentoAlumno(user: SessionUser, studentId: number): Promise<boolean> {
  if (!Number.isFinite(studentId) || studentId <= 0) return false;
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
