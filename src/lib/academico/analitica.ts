/**
 * Analítica por reactivo de los cuestionarios autocalificables.
 *
 * Sale de datos que la plataforma ya guarda: `quiz_attempts.respuestas` dice
 * qué opción eligió cada alumno en cada posición, así que se puede calcular el
 * porcentaje de acierto por reactivo y —lo más útil para el docente— cuál
 * distractor se está "tragando" al grupo.
 *
 * Todo se calcula en el servidor: ni las respuestas correctas ni los enunciados
 * nuevos viajan al navegador del alumno por esta vía.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";
import { reactivosExtraDeVarias } from "@/lib/academico/banco-reactivos";
import { CUESTIONARIOS, type Cuestionario } from "@/lib/academico/cuestionarios";
import { resultadosPorDocente, type IntentoGuardado } from "@/lib/academico/evaluaciones";
import { demoIntentosDeTodos } from "@/lib/demo-store";

export type ReactivoAnalitica = {
  posicion: number;
  id: string;
  enunciado: string;
  opciones: string[];
  correcta: number;
  extra: boolean;
  /** Intentos que contestaron esta posición */
  intentos: number;
  aciertos: number;
  /** 0–100 */
  porcentaje: number;
  /** Veces que se eligió cada opción; -1 = en blanco */
  distribucion: number[];
  /** Opción incorrecta más elegida (la que más confunde), si existe */
  distractorTop: { indice: number; texto: string; veces: number } | null;
};

export type AnaliticaCuestionario = {
  clave: string;
  titulo: string;
  modulo: number;
  parcial: number;
  intentos: number;
  alumnos: number;
  promedio: number | null;
  porcentajeAcierto: number | null;
  reactivos: ReactivoAnalitica[];
};

export type Analitica = {
  global: {
    intentos: number;
    alumnos: number;
    promedio: number | null;
    porcentajeAcierto: number | null;
    reactivosEvaluados: number;
  };
  porCuestionario: AnaliticaCuestionario[];
  /** Reactivos con más error en todo el alcance consultado */
  masDificiles: Array<ReactivoAnalitica & { clave: string; titulo: string }>;
};

const MAX_INTENTOS_ANALISIS = 3000;

function parseRespuestas(texto: string | null | undefined): number[] {
  if (!texto) return [];
  try {
    const valor = JSON.parse(texto);
    if (!Array.isArray(valor)) return [];
    return valor.map((v) => (Number.isInteger(Number(v)) ? Number(v) : -1));
  } catch {
    return [];
  }
}

function promedio(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

/**
 * Intentos que puede analizar cada rol:
 *  - admin ve todo el plantel;
 *  - docente ve sólo a los alumnos inscritos en sus aulas;
 *  - estudiante no tiene acceso a esta vista (la página lo redirige antes).
 */
function intentosDemo(): IntentoGuardado[] {
  return demoIntentosDeTodos().map((intento) => ({
    ...intento,
    respuestas: JSON.stringify(intento.respuestas),
    createdAt: new Date(intento.createdAt),
  }));
}

export async function intentosParaAnalitica(actor: { id: number; rol: string }): Promise<IntentoGuardado[]> {
  try {
    if (actor.rol === "docente") {
      const { filas } = await resultadosPorDocente(actor.id);
      if (filas.length > 0) return filas.map((f) => f.intento);
    } else {
      const filas = await db
        .select()
        .from(quizAttempts)
        .orderBy(desc(quizAttempts.createdAt))
        .limit(MAX_INTENTOS_ANALISIS);
      if (filas.length > 0) return filas;
    }
  } catch {
    // Sin base de datos se analiza lo guardado en el almacén demo.
  }
  return intentosDemo();
}

/** Une catálogo + reactivos del docente para las claves pedidas. */
export async function cuestionariosParaAnalitica(
  claves?: string[],
): Promise<Map<string, Cuestionario>> {
  const objetivo = claves?.length
    ? CUESTIONARIOS.filter((c) => claves.includes(c.clave))
    : CUESTIONARIOS;
  const extras = await reactivosExtraDeVarias(objetivo.map((c) => c.clave));
  const mapa = new Map<string, Cuestionario>();
  for (const c of objetivo) {
    const propios = extras.get(c.clave) ?? [];
    mapa.set(c.clave, {
      ...c,
      preguntas: [
        ...c.preguntas,
        ...propios.map((r) => ({
          id: `X-${r.id}`,
          enunciado: r.enunciado,
          opciones: r.opciones,
          correcta: r.correcta,
          explicacion: r.explicacion,
          extra: true,
        })),
      ],
    });
  }
  return mapa;
}

function analizarReactivo(
  cuestionario: Cuestionario,
  posicion: number,
  intentos: IntentoGuardado[],
): ReactivoAnalitica {
  const pregunta = cuestionario.preguntas[posicion];
  const distribucion = new Array(pregunta.opciones.length).fill(0);
  let intentosContestados = 0;
  let aciertos = 0;

  for (const intento of intentos) {
    const respuestas = parseRespuestas(intento.respuestas);
    const elegida = respuestas[posicion];
    if (!Number.isInteger(elegida) || elegida < 0 || elegida >= pregunta.opciones.length) continue;
    intentosContestados += 1;
    distribucion[elegida] += 1;
    if (elegida === pregunta.correcta) aciertos += 1;
  }

  let distractorTop: ReactivoAnalitica["distractorTop"] = null;
  distribucion.forEach((veces, indice) => {
    if (indice === pregunta.correcta || veces === 0) return;
    if (!distractorTop || veces > distractorTop.veces) {
      distractorTop = { indice, texto: pregunta.opciones[indice], veces };
    }
  });

  return {
    posicion,
    id: pregunta.id,
    enunciado: pregunta.enunciado,
    opciones: pregunta.opciones,
    correcta: pregunta.correcta,
    extra: Boolean(pregunta.extra),
    intentos: intentosContestados,
    aciertos,
    porcentaje: intentosContestados === 0 ? 0 : Math.round((aciertos / intentosContestados) * 100),
    distribucion,
    distractorTop,
  };
}

/**
 * Calcula la analítica completa. `claves` limita el alcance; por omisión se
 * analizan los 15 cuestionarios.
 */
export async function analiticaDeCuestionarios(
  intentos: IntentoGuardado[],
  claves?: string[],
): Promise<Analitica> {
  const cuestionarios = await cuestionariosParaAnalitica(claves);

  const porCuestionario: AnaliticaCuestionario[] = [];
  const todosLosReactivos: Array<ReactivoAnalitica & { clave: string; titulo: string }> = [];

  // En la vista general sólo se listan cuestionarios con intentos; al pedir uno
  // concreto se muestra igual aunque esté en cero.
  const soloConDatos = !claves || claves.length === 0;

  for (const cuestionario of cuestionarios.values()) {
    const propios = intentos.filter((i) => i.cuestionarioClave === cuestionario.clave);
    if (soloConDatos && propios.length === 0) continue;

    const reactivos = cuestionario.preguntas.map((_, posicion) =>
      analizarReactivo(cuestionario, posicion, propios),
    );

    for (const reactivo of reactivos) {
      if (reactivo.intentos > 0) {
        todosLosReactivos.push({
          ...reactivo,
          clave: cuestionario.clave,
          titulo: cuestionario.titulo,
        });
      }
    }

    const contestados = reactivos.reduce((a, r) => a + r.intentos, 0);
    const aciertos = reactivos.reduce((a, r) => a + r.aciertos, 0);

    porCuestionario.push({
      clave: cuestionario.clave,
      titulo: cuestionario.titulo,
      modulo: cuestionario.modulo,
      parcial: cuestionario.parcial,
      intentos: propios.length,
      alumnos: new Set(propios.map((i) => i.studentId)).size,
      promedio: promedio(propios.map((i) => i.calificacion)),
      porcentajeAcierto: contestados === 0 ? null : Math.round((aciertos / contestados) * 100),
      reactivos,
    });
  }

  const globalContestados = porCuestionario.reduce(
    (a, c) => a + c.reactivos.reduce((b, r) => b + r.intentos, 0),
    0,
  );
  const globalAciertos = porCuestionario.reduce(
    (a, c) => a + c.reactivos.reduce((b, r) => b + r.aciertos, 0),
    0,
  );

  return {
    global: {
      intentos: porCuestionario.reduce((a, c) => a + c.intentos, 0),
      alumnos: new Set(intentos.map((i) => i.studentId)).size,
      promedio: promedio(intentos.map((i) => i.calificacion)),
      porcentajeAcierto:
        globalContestados === 0 ? null : Math.round((globalAciertos / globalContestados) * 100),
      reactivosEvaluados: todosLosReactivos.length,
    },
    porCuestionario,
    masDificiles: todosLosReactivos
      .filter((r) => r.intentos >= 2)
      .sort((a, b) => a.porcentaje - b.porcentaje || b.intentos - a.intentos)
      .slice(0, 10),
  };
}

/** Intentos de un solo cuestionario, ya filtrados por rol. */
export async function intentosDeCuestionario(
  actor: { id: number; rol: string },
  clave: string,
): Promise<IntentoGuardado[]> {
  const intentos = await intentosParaAnalitica(actor);
  return intentos.filter((i) => i.cuestionarioClave === clave);
}

/** Atajo: analítica de un cuestionario concreto para un rol dado. */
export async function analiticaDeUnCuestionario(actor: { id: number; rol: string }, clave: string) {
  const intentos = await intentosDeCuestionario(actor, clave);
  const data = await analiticaDeCuestionarios(intentos, [clave]);
  return data.porCuestionario[0] ?? null;
}
