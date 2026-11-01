/**
 * Constancia de estudios y kardex académico.
 *
 * Junta los datos que ya usa el expediente (inscripción, calificaciones por
 * parcial y asistencia) en una estructura lista para dibujar el PDF. No escribe
 * nada: la generación del documento se registra aparte en la bitácora.
 */

import { expedienteCompletoEstudiante } from "@/lib/consultas";

export type CursoConstancia = {
  cursoId: number;
  nombre: string;
  clave: string;
  docente: string;
  modulo: number | null;
};

export type CalificacionConstancia = {
  cursoId: number;
  nombre: string;
  clave: string;
  docente: string;
  parciales: [number | null, number | null, number | null];
  actividades: number;
  promedio: number | null;
};

export type DatosConstancia = {
  alumno: {
    id: number;
    nombre: string;
    matricula: string | null;
    email: string;
    semestre: number | null;
    turno: string | null;
    especialidad: string | null;
  };
  grupo: string | null;
  numeroControl: string | null;
  tutorDocente: string | null;
  cursos: CursoConstancia[];
  calificaciones: CalificacionConstancia[];
  promedioGeneral: number | null;
  asistencia: {
    total: number;
    presentes: number;
    retardos: number;
    faltas: number;
    justificados: number;
    porcentaje: number;
  };
  emitidoEn: Date;
  folio: string;
};

export type TipoConstancia = "constancia" | "kardex";

export function tipoConstanciaValido(valor: string): valor is TipoConstancia {
  return valor === "constancia" || valor === "kardex";
}

function promedioDe(valores: number[]) {
  if (valores.length === 0) return null;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

/** Folio legible y estable por alumno, tipo y minuto de emisión. */
export function folioDe(tipo: TipoConstancia, studentId: number, fecha: Date) {
  const sello = fecha.toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return `CB270-${tipo === "kardex" ? "K" : "C"}${studentId}-${sello}`;
}

export async function datosConstancia(studentId: number): Promise<DatosConstancia | null> {
  const expediente = await expedienteCompletoEstudiante(studentId);
  if (!expediente) return null;

  const { alumno, perfil, tutor, cursos, tareas, asistencias } = expediente;

  const cursosConstancia: CursoConstancia[] = cursos.map(({ curso, docente }) => ({
    cursoId: curso.id,
    nombre: curso.nombre,
    clave: curso.clave,
    docente,
    modulo: curso.modulo ?? null,
  }));

  const calificaciones: CalificacionConstancia[] = cursosConstancia.map((curso) => {
    const delCurso = tareas.filter((t) => t.curso.id === curso.cursoId);
    const parciales: [number | null, number | null, number | null] = [null, null, null];

    for (const parcial of [1, 2, 3] as const) {
      const notas = delCurso
        .filter((t) => t.tarea.parcial === parcial && typeof t.entrega?.calificacion === "number")
        .map((t) => t.entrega?.calificacion as number);
      parciales[parcial - 1] = promedioDe(notas);
    }

    const todas = delCurso
      .filter((t) => typeof t.entrega?.calificacion === "number")
      .map((t) => t.entrega?.calificacion as number);

    return {
      cursoId: curso.cursoId,
      nombre: curso.nombre,
      clave: curso.clave,
      docente: curso.docente,
      parciales,
      actividades: todas.length,
      promedio: promedioDe(todas),
    };
  });

  const promedios = calificaciones.map((c) => c.promedio).filter((n): n is number => n !== null);

  const emitidoEn = new Date();

  return {
    alumno: {
      id: alumno.id,
      nombre: alumno.nombre,
      matricula: alumno.matricula,
      email: alumno.email,
      semestre: alumno.semestre,
      turno: alumno.turno,
      especialidad: alumno.especialidad,
    },
    grupo: perfil?.grupo ?? null,
    numeroControl: perfil?.numeroControlEscolar ?? perfil?.numeroControl ?? null,
    tutorDocente: tutor?.nombre ?? perfil?.tutorDocenteNombre ?? null,
    cursos: cursosConstancia,
    calificaciones,
    promedioGeneral: promedioDe(promedios),
    asistencia: {
      total: asistencias.total,
      presentes: asistencias.presentes,
      retardos: asistencias.retardos,
      faltas: asistencias.faltas,
      justificados: asistencias.justificados,
      porcentaje: asistencias.porcentaje,
    },
    emitidoEn,
    folio: folioDe("constancia", studentId, emitidoEn),
  };
}
