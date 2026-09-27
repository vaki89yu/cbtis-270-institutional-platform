/**
 * Material de lectura y apoyo precargado del plan de estudios de Logística.
 *
 * Misma filosofía que las actividades: el docente no captura nada, entra al
 * aula y sólo activa el material que va a usar hoy. Al activarlo, el grupo lo
 * ve en su aula.
 */

export type TipoMaterial = "apunte" | "guia" | "video" | "enlace" | "caso";

export type MaterialPrecargado = {
  /** Clave estable, se guarda en materials.origen */
  clave: string;
  modulo: number;
  submodulo: string;
  titulo: string;
  descripcion: string;
  tipo: TipoMaterial;
  /** Lectura estimada o duración del video */
  duracion: string;
  url?: string;
};

export const ETIQUETA_MATERIAL: Record<TipoMaterial, string> = {
  apunte: "Apunte",
  guia: "Guía de llenado",
  video: "Video",
  enlace: "Enlace oficial",
  caso: "Caso práctico",
};

export const MATERIALES_PRECARGADOS: MaterialPrecargado[] = [
  /* ------------------------ MÓDULO I · 2° semestre ------------------------ */
  {
    clave: "M1-L1",
    modulo: 1,
    submodulo: "Introducción a la logística",
    titulo: "Qué es la cadena de suministro y por qué Juárez vive de ella",
    descripcion:
      "Conceptos base: logística, cadena de suministro, eslabones, valor agregado y costo logístico. Ejemplos con maquiladoras y cruces por el puente Zaragoza.",
    tipo: "apunte",
    duracion: "15 min de lectura",
  },
  {
    clave: "M1-L2",
    modulo: 1,
    submodulo: "Flujo de materiales e información",
    titulo: "Guía de llenado: requisición y orden de compra (FOR-LOG-02)",
    descripcion:
      "Campo por campo del formato: datos del proveedor, partidas, precio unitario, subtotal, IVA, condiciones de pago y firmas de autorización.",
    tipo: "guia",
    duracion: "10 min",
    url: "/panel/formatos/FOR-LOG-02",
  },
  {
    clave: "M1-L3",
    modulo: 1,
    submodulo: "Compras y proveedores",
    titulo: "Cómo evaluar y comparar proveedores",
    descripcion:
      "Criterios de selección: precio, tiempo de entrega, calidad, garantía, capacidad y solvencia. Matriz de ponderación con ejemplo resuelto.",
    tipo: "apunte",
    duracion: "12 min de lectura",
  },
  {
    clave: "M1-L4",
    modulo: 1,
    submodulo: "Compras y proveedores",
    titulo: "Caso: la orden de compra que llegó tarde",
    descripcion:
      "Una distribuidora perdió un contrato por un error en la orden de compra. Identifica las tres fallas del proceso y propón el control que las evita.",
    tipo: "caso",
    duracion: "20 min en equipo",
  },

  /* ----------------------- MÓDULO II · 3° semestre ----------------------- */
  {
    clave: "M2-L1",
    modulo: 2,
    submodulo: "Almacenes y control de inventarios",
    titulo: "Tipos de almacén y distribución del espacio (layout)",
    descripcion:
      "Almacén de materia prima, producto en proceso y terminado. Zonas de recepción, acomodo, picking y embarque. Reglas de señalización y pasillos.",
    tipo: "apunte",
    duracion: "15 min de lectura",
  },
  {
    clave: "M2-L2",
    modulo: 2,
    submodulo: "Almacenes y control de inventarios",
    titulo: "Guía de llenado: Kardex de almacén (FOR-LOG-01)",
    descripcion:
      "Entradas, salidas, existencia y costo. Métodos PEPS y promedio ponderado con ejercicio resuelto paso a paso.",
    tipo: "guia",
    duracion: "18 min",
    url: "/panel/formatos/FOR-LOG-01",
  },
  {
    clave: "M2-L3",
    modulo: 2,
    submodulo: "Seguridad e higiene en el almacén",
    titulo: "Equipo de protección personal y manejo de montacargas",
    descripcion:
      "EPP obligatorio (casco, chaleco, calzado, guantes), señalización, capacidad de carga, inspección previa al uso y las cinco causas más comunes de accidente.",
    tipo: "apunte",
    duracion: "12 min de lectura",
  },
  {
    clave: "M2-L4",
    modulo: 2,
    submodulo: "Seguridad e higiene en el almacén",
    titulo: "NOM-006-STPS: manejo y almacenamiento de materiales",
    descripcion:
      "Norma oficial mexicana que rige las condiciones de seguridad en el manejo de materiales. Consúltala para el checklist de montacargas.",
    tipo: "enlace",
    duracion: "consulta",
    url: "https://www.dof.gob.mx/nota_detalle.php?codigo=5359717&fecha=11/09/2014",
  },

  /* ----------------------- MÓDULO III · 4° semestre ----------------------- */
  {
    clave: "M3-L1",
    modulo: 3,
    submodulo: "Transporte y distribución",
    titulo: "Modos de transporte y cuándo conviene cada uno",
    descripcion:
      "Autotransporte, ferroviario, marítimo, aéreo y multimodal. Costo, tiempo, capacidad y tipo de mercancía. Comparativo aplicado a la frontera norte.",
    tipo: "apunte",
    duracion: "15 min de lectura",
  },
  {
    clave: "M3-L2",
    modulo: 3,
    submodulo: "Documentación del transporte",
    titulo: "Guía de llenado: Carta Porte (FOR-LOG-03)",
    descripcion:
      "Complemento Carta Porte del SAT: remitente, destinatario, mercancía, clave de producto, peso, distancia y datos del autotransporte.",
    tipo: "guia",
    duracion: "20 min",
    url: "/panel/formatos/FOR-LOG-03",
  },
  {
    clave: "M3-L3",
    modulo: 3,
    submodulo: "Documentación del transporte",
    titulo: "Complemento Carta Porte · portal oficial del SAT",
    descripcion:
      "Documentación vigente, catálogos de claves y preguntas frecuentes del complemento obligatorio para el traslado de mercancías.",
    tipo: "enlace",
    duracion: "consulta",
    url: "http://omawww.sat.gob.mx/tramitesyservicios/Paginas/complemento_carta_porte.htm",
  },
  {
    clave: "M3-L4",
    modulo: 3,
    submodulo: "Rutas y entregas",
    titulo: "Caso: rediseñar la ruta de reparto de una panadería",
    descripcion:
      "Doce puntos de entrega en Juárez, una camioneta y seis horas. Ordena la ruta, calcula kilómetros y justifica el ahorro en combustible.",
    tipo: "caso",
    duracion: "25 min en equipo",
  },

  /* ----------------------- MÓDULO IV · 5° semestre ----------------------- */
  {
    clave: "M4-L1",
    modulo: 4,
    submodulo: "Comercio exterior",
    titulo: "Importación y exportación: actores y documentos",
    descripcion:
      "Exportador, importador, agente aduanal, transportista y aduana. Factura comercial, lista de empaque, certificado de origen y pedimento.",
    tipo: "apunte",
    duracion: "18 min de lectura",
  },
  {
    clave: "M4-L2",
    modulo: 4,
    submodulo: "Comercio exterior",
    titulo: "Guía de llenado: pedimento A1 (FOR-LOG-05)",
    descripcion:
      "Estructura del pedimento, clave de documento, régimen, valor en aduana, fracción arancelaria, IGI, DTA e IVA con ejemplo numérico.",
    tipo: "guia",
    duracion: "25 min",
    url: "/panel/formatos/FOR-LOG-05",
  },
  {
    clave: "M4-L3",
    modulo: 4,
    submodulo: "Comercio exterior",
    titulo: "INCOTERMS 2020 explicados con ejemplos",
    descripcion:
      "EXW, FCA, FOB, CIF, DAP y DDP: dónde termina la responsabilidad del vendedor, quién paga el flete y quién asume el riesgo.",
    tipo: "apunte",
    duracion: "15 min de lectura",
  },
  {
    clave: "M4-L4",
    modulo: 4,
    submodulo: "Costos logísticos",
    titulo: "Guía de llenado: costeo de fletes (FOR-LOG-04)",
    descripcion:
      "Costo fijo, costo variable por kilómetro, casetas, combustible, operador y margen. Cómo llegar a la tarifa que se le cotiza al cliente.",
    tipo: "guia",
    duracion: "20 min",
    url: "/panel/formatos/FOR-LOG-04",
  },

  /* ----------------------- MÓDULO V · 6° semestre ----------------------- */
  {
    clave: "M5-L1",
    modulo: 5,
    submodulo: "Calidad y mejora continua",
    titulo: "Indicadores logísticos (KPI) que sí se usan",
    descripcion:
      "Entregas a tiempo, exactitud de inventario, rotación, costo por pedido y nivel de servicio. Cómo se calculan y qué decisión dispara cada uno.",
    tipo: "apunte",
    duracion: "15 min de lectura",
  },
  {
    clave: "M5-L2",
    modulo: 5,
    submodulo: "Calidad y mejora continua",
    titulo: "5S aplicadas al almacén escolar",
    descripcion:
      "Clasificar, ordenar, limpiar, estandarizar y disciplina. Recorrido de diagnóstico con evidencia fotográfica antes y después.",
    tipo: "guia",
    duracion: "12 min",
  },
  {
    clave: "M5-L3",
    modulo: 5,
    submodulo: "Integración y prácticas profesionales",
    titulo: "Cómo presentarte en una entrevista del sector logístico",
    descripcion:
      "Currículum de un pasante, vocabulario técnico esperado, preguntas frecuentes y qué valoran las empresas de la industria maquiladora.",
    tipo: "apunte",
    duracion: "10 min de lectura",
  },
  {
    clave: "M5-L4",
    modulo: 5,
    submodulo: "Integración y prácticas profesionales",
    titulo: "Caso integrador: de la orden de compra a la entrega al cliente",
    descripcion:
      "Un pedido completo recorriendo los cinco módulos: compra, almacén, transporte, cruce fronterizo y entrega. Arma el expediente documental entero.",
    tipo: "caso",
    duracion: "sesión completa",
  },
];

export function materialesDelModulo(modulo: number | null): MaterialPrecargado[] {
  if (!modulo) return MATERIALES_PRECARGADOS;
  return MATERIALES_PRECARGADOS.filter((m) => m.modulo === modulo);
}

export function materialPorClave(clave: string): MaterialPrecargado | undefined {
  return MATERIALES_PRECARGADOS.find((m) => m.clave === clave);
}
