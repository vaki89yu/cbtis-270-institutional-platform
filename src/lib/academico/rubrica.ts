/**
 * Rúbrica institucional de cuatro criterios. Cada uno vale 25 puntos sobre la
 * escala de 100 con la que se califican las evidencias. El docente marca los
 * criterios que cumplió el alumno y la calificación se arma sola.
 */

export type CriterioRubrica = {
  clave: string;
  titulo: string;
  descripcion: string;
  puntos: number;
};

export const RUBRICA: CriterioRubrica[] = [
  {
    clave: "contenido",
    titulo: "Contenido técnico correcto",
    descripcion: "Los datos, cálculos y conceptos de logística son correctos.",
    puntos: 40,
  },
  {
    clave: "formato",
    titulo: "Formato y documentación",
    descripcion: "Usó el formato oficial, completo y con todos sus campos.",
    puntos: 25,
  },
  {
    clave: "puntualidad",
    titulo: "Entrega puntual",
    descripcion: "Entregó dentro de la fecha establecida.",
    puntos: 20,
  },
  {
    clave: "presentacion",
    titulo: "Presentación y limpieza",
    descripcion: "Ortografía, orden y presentación profesional.",
    puntos: 15,
  },
];

/** Suma de los criterios marcados. */
export function calificacionPorRubrica(criterios: string[]): number {
  return RUBRICA.filter((c) => criterios.includes(c.clave)).reduce((a, c) => a + c.puntos, 0);
}

/** Texto de retroalimentación automática con lo que faltó. */
export function retroalimentacionPorRubrica(criterios: string[]): string {
  const faltantes = RUBRICA.filter((c) => !criterios.includes(c.clave));
  if (faltantes.length === 0) return "Excelente: cumpliste todos los criterios de la rúbrica.";
  return `Falta mejorar: ${faltantes.map((f) => f.titulo.toLowerCase()).join(", ")}.`;
}
