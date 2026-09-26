/**
 * Catálogo precargado de actividades del plan de estudios de Logística.
 *
 * El docente no captura nada: entra al aula, ve las actividades que
 * corresponden al módulo que imparte y sólo las activa. Al activarlas, el
 * grupo las ve y puede entregar su evidencia.
 */

export type TipoEvidencia = "documento" | "formato" | "practica" | "examen";

export type ActividadPrecargada = {
  /** Clave estable, se guarda en assignments.origen */
  clave: string;
  modulo: number;
  submodulo: string;
  titulo: string;
  instrucciones: string;
  puntos: number;
  parcial: number;
  evidencia: TipoEvidencia;
  /** Formato de la biblioteca que acompaña a la actividad, si aplica */
  formatoCodigo?: string;
  /** Días sugeridos desde hoy para la fecha de entrega */
  diasEntrega: number;
};

export const ACTIVIDADES_PRECARGADAS: ActividadPrecargada[] = [
  /* ------------------------ MÓDULO I · 2° semestre ------------------------ */
  {
    clave: "M1-A1",
    modulo: 1,
    submodulo: "Introducción a la logística",
    titulo: "Mapa de la cadena de suministro de una empresa juarense",
    instrucciones:
      "Elige una maquiladora o distribuidora de Ciudad Juárez. Dibuja su cadena de suministro completa: proveedores, entrada de insumos, transformación, almacén, distribución y cliente final. Señala en qué punto ocurre el cruce fronterizo.",
    puntos: 100,
    parcial: 1,
    evidencia: "documento",
    diasEntrega: 7,
  },
  {
    clave: "M1-A2",
    modulo: 1,
    submodulo: "Flujo de materiales e información",
    titulo: "Requisición y orden de compra de un pedido real",
    instrucciones:
      "Con el formato FOR-LOG-02 elabora la requisición y la orden de compra de un pedido de 3 productos. Incluye proveedor, condiciones de pago, tiempo de entrega y el cálculo del IVA.",
    puntos: 100,
    parcial: 1,
    evidencia: "formato",
    formatoCodigo: "FOR-LOG-02",
    diasEntrega: 10,
  },
  {
    clave: "M1-A3",
    modulo: 1,
    submodulo: "Flujo de materiales e información",
    titulo: "Cuadro comparativo de tres proveedores",
    instrucciones:
      "Cotiza el mismo producto con tres proveedores. Compara precio, tiempo de entrega, garantía y forma de pago, y justifica con datos a cuál le comprarías.",
    puntos: 100,
    parcial: 2,
    evidencia: "documento",
    diasEntrega: 14,
  },

  /* ----------------------- MÓDULO II · 3° semestre ----------------------- */
  {
    clave: "M2-A1",
    modulo: 2,
    submodulo: "Recepción y acomodo",
    titulo: "Checklist de recepción de mercancía en andén",
    instrucciones:
      "Documenta paso a paso la recepción de un embarque: cita, verificación documental, descarga, conteo, revisión de daños y acomodo. Anexa fotografías o croquis del acomodo propuesto.",
    puntos: 100,
    parcial: 1,
    evidencia: "practica",
    diasEntrega: 7,
  },
  {
    clave: "M2-A2",
    modulo: 2,
    submodulo: "Control de inventarios y conteo cíclico",
    titulo: "Kardex por PEPS y por costo promedio",
    instrucciones:
      "Con el formato FOR-LOG-01 registra 10 movimientos de un artículo (entradas y salidas) y calcula el inventario final por PEPS y por promedio ponderado. Explica por qué difieren los resultados.",
    puntos: 100,
    parcial: 2,
    evidencia: "formato",
    formatoCodigo: "FOR-LOG-01",
    diasEntrega: 12,
  },
  {
    clave: "M2-A3",
    modulo: 2,
    submodulo: "Recepción y acomodo",
    titulo: "Inspección pre-operacional de montacargas",
    instrucciones:
      "Aplica el checklist FOR-LOG-06 a un montacargas del taller o de una empresa. Reporta hallazgos, clasifícalos por riesgo y propone las acciones correctivas.",
    puntos: 100,
    parcial: 3,
    evidencia: "formato",
    formatoCodigo: "FOR-LOG-06",
    diasEntrega: 10,
  },

  /* ----------------------- MÓDULO III · 4° semestre ---------------------- */
  {
    clave: "M3-A1",
    modulo: 3,
    submodulo: "Rutas y modos de transporte",
    titulo: "Carta porte de un embarque Juárez - Chihuahua",
    instrucciones:
      "Llena el formato FOR-LOG-03 con los datos de un embarque real o simulado. Verifica claves del SAT de producto, unidad y tipo de permiso SCT.",
    puntos: 100,
    parcial: 1,
    evidencia: "formato",
    formatoCodigo: "FOR-LOG-03",
    diasEntrega: 9,
  },
  {
    clave: "M3-A2",
    modulo: 3,
    submodulo: "Abastecimiento y proveedores",
    titulo: "Comparativo de modos de transporte",
    instrucciones:
      "Para un mismo embarque de 2 toneladas compara transporte terrestre, ferroviario y aéreo: costo, tiempo, riesgo y documentación requerida. Concluye cuál conviene y por qué.",
    puntos: 100,
    parcial: 2,
    evidencia: "documento",
    diasEntrega: 12,
  },

  /* ----------------------- MÓDULO IV · 5° semestre ----------------------- */
  {
    clave: "M4-A1",
    modulo: 4,
    submodulo: "Aduanas e INCOTERMS",
    titulo: "Pedimento de importación A1 comentado",
    instrucciones:
      "Con el formato FOR-LOG-05 elabora un pedimento A1 simplificado. Identifica fracción arancelaria, valor en aduana, DTA, IVA e IGI, y explica cada campo en el margen.",
    puntos: 100,
    parcial: 1,
    evidencia: "formato",
    formatoCodigo: "FOR-LOG-05",
    diasEntrega: 10,
  },
  {
    clave: "M4-A2",
    modulo: 4,
    submodulo: "Aduanas e INCOTERMS",
    titulo: "Caso práctico de INCOTERMS 2020",
    instrucciones:
      "Analiza tres operaciones de comercio exterior y determina el INCOTERM aplicable. Señala dónde se transmite el riesgo y quién paga flete, seguro y despacho.",
    puntos: 100,
    parcial: 2,
    evidencia: "documento",
    diasEntrega: 12,
  },
  {
    clave: "M4-A3",
    modulo: 4,
    submodulo: "Logística inversa y KPI",
    titulo: "Tablero de KPI logísticos",
    instrucciones:
      "Calcula y grafica cinco indicadores: entregas a tiempo, exactitud de inventario, rotación, costo por pedido y devoluciones. Interpreta cada resultado.",
    puntos: 100,
    parcial: 3,
    evidencia: "documento",
    diasEntrega: 15,
  },

  /* ------------------------ MÓDULO V · 6° semestre ----------------------- */
  {
    clave: "M5-A1",
    modulo: 5,
    submodulo: "Tecnologías aplicadas a la cadena de suministro",
    titulo: "Matriz de costeo de fletes y selección de ruta",
    instrucciones:
      "Con el formato FOR-LOG-04 costea tres rutas alternas para el mismo embarque: combustible, casetas, operador, seguro y tiempo. Recomienda la ruta óptima con números.",
    puntos: 100,
    parcial: 1,
    evidencia: "formato",
    formatoCodigo: "FOR-LOG-04",
    diasEntrega: 10,
  },
  {
    clave: "M5-A2",
    modulo: 5,
    submodulo: "Proyecto integrador de logística",
    titulo: "Proyecto integrador: rediseño de la cadena de suministro",
    instrucciones:
      "En equipo, diagnostica la cadena de suministro de una empresa local, detecta tres problemas, propone la mejora con costos y presenta el plan de implementación.",
    puntos: 100,
    parcial: 3,
    evidencia: "documento",
    diasEntrega: 21,
  },
];

export function actividadesDelModulo(modulo: number | null | undefined) {
  if (!modulo) return [];
  return ACTIVIDADES_PRECARGADAS.filter((a) => a.modulo === modulo);
}

export function actividadPorClave(clave: string) {
  return ACTIVIDADES_PRECARGADAS.find((a) => a.clave === clave) ?? null;
}

export const ETIQUETA_EVIDENCIA: Record<TipoEvidencia, string> = {
  documento: "Documento o reporte",
  formato: "Formato institucional",
  practica: "Práctica en almacén",
  examen: "Evaluación escrita",
};
