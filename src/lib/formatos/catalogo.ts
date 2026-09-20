import type { ReactNode } from "react";

export type CampoTipo = "texto" | "textoLargo" | "numero" | "fecha" | "telefono" | "correo" | "tabla";

export type Campo = {
  id: string;
  etiqueta: string;
  tipo: CampoTipo;
  requerido?: boolean;
  placeholder?: string;
  ancho?: 1 | 2 | 3;
  /** Para campos de tipo tabla: columnas de la tabla */
  columnas?: string[];
  filasTabla?: number;
};

export type Seccion = {
  titulo: string;
  campos: Campo[];
};

export type FormatoDinamico = {
  codigo: string;
  titulo: string;
  categoria: string;
  descripcion: string;
  fileName: string;
  /** Módulo al que pertenece (1..5) */
  modulo: number;
  referenciaNormativa: string;
  secciones: Seccion[];
  /** Si el formato es una tabla principal (kardex, pedimento, etc.) */
  tablaPrincipal?: Campo;
  instrucciones: string[];
  firmas: string[];
};

const F = {
  alumno: { id: "alumno", etiqueta: "Nombre del alumno", tipo: "texto", requerido: true, ancho: 2 },
  matricula: { id: "matricula", etiqueta: "Matrícula / No. de control", tipo: "texto", requerido: true, ancho: 1 },
  grupo: { id: "grupo", etiqueta: "Grupo (E / F)", tipo: "texto", requerido: true, ancho: 1 },
  semestre: { id: "semestre", etiqueta: "Semestre", tipo: "numero", requerido: true, ancho: 1 },
  turno: { id: "turno", etiqueta: "Turno", tipo: "texto", requerido: true, ancho: 1 },
  docente: { id: "docente", etiqueta: "Docente responsable", tipo: "texto", requerido: true, ancho: 2 },
  fecha: { id: "fecha", etiqueta: "Fecha de elaboración", tipo: "fecha", requerido: true, ancho: 1 },
  submodulo: { id: "submodulo", etiqueta: "Submódulo / asignatura", tipo: "texto", requerido: true, ancho: 2 },
  aula: { id: "aula", etiqueta: "Aula / área de práctica", tipo: "texto", ancho: 1 },
} as const satisfies Record<string, Campo>;

const INSTITUCIONAL = {
  alumno: F.alumno,
  matricula: F.matricula,
  grupo: F.grupo,
  semestre: F.semestre,
  turno: F.turno,
  docente: F.docente,
  fecha: F.fecha,
  submodulo: F.submodulo,
  aula: F.aula,
};

/* =========================================================
   MÓDULO I — Gestiona la adquisición de mercancías y servicios
   ========================================================= */
const MOD1: FormatoDinamico[] = [
  {
    codigo: "FOR-LOG-M1-01",
    titulo: "Solicitud de Cotización a Proveedores",
    categoria: "Adquisición de Mercancías y Servicios",
    modulo: 1,
    descripcion:
      "Formato para solicitar formalmente cotización a al menos tres proveedores, comparar condiciones y sustentar la decisión de compra.",
    fileName: "FOR-LOG-M1-01_Solicitud-de-Cotizacion_CBTIS270",
    referenciaNormativa: "NOM-004-SE-2021 · Documentación comercial nacional",
    secciones: [
      {
        titulo: "Datos del solicitante",
        campos: [INSTITUCIONAL.alumno, INSTITUCIONAL.matricula, INSTITUCIONAL.grupo, INSTITUCIONAL.semestre, INSTITUCIONAL.turno, INSTITUCIONAL.docente, INSTITUCIONAL.fecha],
      },
      {
        titulo: "Identificación de la compra",
        campos: [
          { id: "folioSolicitud", etiqueta: "Folio de solicitud", tipo: "texto", requerido: true, placeholder: "SOL-2026-001", ancho: 1 },
          { id: "fechaRequerida", etiqueta: "Fecha requerida de entrega", tipo: "fecha", requerido: true, ancho: 1 },
          { id: "articulo", etiqueta: "Bien o servicio a cotizar", tipo: "textoLargo", requerido: true, placeholder: "Describe la especificación técnica completa", ancho: 3 },
          { id: "cantidad", etiqueta: "Cantidad", tipo: "numero", requerido: true, ancho: 1 },
          { id: "unidad", etiqueta: "Unidad de medida", tipo: "texto", requerido: true, placeholder: "PIEZA / KG / LITRO", ancho: 1 },
          { id: "incoterms", etiqueta: "INCOTERMS aplicable", tipo: "texto", placeholder: "EXW / FOB / CIF", ancho: 1 },
        ],
      },
      {
        titulo: "Comparativo de proveedores (mínimo 3)",
        campos: [
          { id: "prov1", etiqueta: "Proveedor 1 · nombre y contacto", tipo: "texto", requerido: true, ancho: 2 },
          { id: "precio1", etiqueta: "Precio unitario prov. 1", tipo: "numero", ancho: 1 },
          { id: "prov2", etiqueta: "Proveedor 2 · nombre y contacto", tipo: "texto", ancho: 2 },
          { id: "precio2", etiqueta: "Precio unitario prov. 2", tipo: "numero", ancho: 1 },
          { id: "prov3", etiqueta: "Proveedor 3 · nombre y contacto", tipo: "texto", ancho: 2 },
          { id: "precio3", etiqueta: "Precio unitario prov. 3", tipo: "numero", ancho: 1 },
          { id: "tiempoEntrega", etiqueta: "Tiempo de entrega cotizado", tipo: "texto", ancho: 1 },
          { id: "garantia", etiqueta: "Garantía ofrecida", tipo: "texto", ancho: 1 },
          { id: "condicionesPago", etiqueta: "Condiciones de pago", tipo: "texto", placeholder: "30 días / contado / crédito", ancho: 1 },
        ],
      },
      {
        titulo: "Análisis y decisión",
        campos: [
          { id: "proveedorSeleccionado", etiqueta: "Proveedor seleccionado y justificación técnica", tipo: "textoLargo", requerido: true, ancho: 3 },
          { id: "criterios", etiqueta: "Criterios de evaluación aplicados", tipo: "textoLargo", placeholder: "Precio, calidad, tiempo de entrega, servicio postventa, solvencia", ancho: 3 },
        ],
      },
    ],
    instrucciones: [
      "Cotiza siempre con un mínimo de tres proveedores para asegurar competencia.",
      "Compara precio unitario, costo de flete, tiempo de entrega y garantía, no sólo el precio.",
      "Solicita la ficha técnica del producto antes de cerrar la compra.",
      "Documenta la justificación: será tu evidencia del submódulo de adquisiciones.",
    ],
    firmas: ["Alumno que elabora", "Docente responsable", "Jefe de compras", "Control escolar CBTIS 270"],
  },
  {
    codigo: "FOR-LOG-M1-02",
    titulo: "Requisición de Mercancías y Servicios",
    categoria: "Adquisición de Mercancías y Servicios",
    modulo: 1,
    descripcion:
      "Formato interno para solicitar mercancías o servicios al departamento de compras, indicando prioridad, justificación y centro de costo.",
    fileName: "FOR-LOG-M1-02_Requisicion-de-Mercancias_CBTIS270",
    referenciaNormativa: "Control interno de adquisiciones · CBTIS 270",
    secciones: [
      {
        titulo: "Datos del solicitante",
        campos: [INSTITUCIONAL.alumno, INSTITUCIONAL.matricula, INSTITUCIONAL.grupo, INSTITUCIONAL.semestre, INSTITUCIONAL.turno, INSTITUCIONAL.docente, INSTITUCIONAL.fecha],
      },
      {
        titulo: "Detalle de la requisición",
        campos: [
          { id: "folioRequisicion", etiqueta: "Folio de requisición", tipo: "texto", requerido: true, placeholder: "REQ-2026-____", ancho: 1 },
          { id: "prioridad", etiqueta: "Prioridad", tipo: "texto", requerido: true, placeholder: "Urgente / Alta / Normal", ancho: 1 },
          { id: "centroCosto", etiqueta: "Centro de costo / área", tipo: "texto", placeholder: "Almacén Escuela · Edificio C", ancho: 1 },
          { id: "justificacion", etiqueta: "Justificación de la necesidad", tipo: "textoLargo", requerido: true, ancho: 3 },
        ],
      },
      {
        titulo: "Partidas solicitadas",
        campos: [
          { id: "tablaPartidas", etiqueta: "Partidas", tipo: "tabla", columnas: ["No.", "Clave / SKU", "Descripción", "Unidad", "Cantidad", "Observaciones"], filasTabla: 8, ancho: 3 },
        ],
      },
    ],
    instrucciones: [
      "Toda requisición debe estar justificada; no se compran insumos sin sustento académico u operativo.",
      "La prioridad urgente requiere autorización del docente responsable.",
      "Verifica la existencia en almacén antes de solicitar, para evitar compras duplicadas.",
    ],
    firmas: ["Solicitante", "Docente responsable", "Jefe de compras", "Dirección CBTIS 270"],
  },
];

/* =========================================================
   MÓDULO II — Organiza el flujo de mercancías en almacén
   ========================================================= */
const MOD2: FormatoDinamico[] = [
  {
    codigo: "FOR-LOG-M2-01",
    titulo: "Reporte de Recepción y Acomodo de Mercancía",
    categoria: "Almacén e Inventarios",
    modulo: 2,
    descripcion:
      "Comprobante de recepción de mercancía en el Almacén Escuela, con verificación de cantidades, estado físico y ubicación asignada.",
    fileName: "FOR-LOG-M2-01_Recepcion-y-Acomodo_CBTIS270",
    referenciaNormativa: "NOM-030-SCFI-2006 · Información comercial",
    secciones: [
      {
        titulo: "Datos del operador",
        campos: [INSTITUCIONAL.alumno, INSTITUCIONAL.matricula, INSTITUCIONAL.grupo, INSTITUCIONAL.semestre, INSTITUCIONAL.turno, INSTITUCIONAL.docente, INSTITUCIONAL.fecha, INSTITUCIONAL.aula],
      },
      {
        titulo: "Datos del embarque recibido",
        campos: [
          { id: "ordenCompra", etiqueta: "Orden de compra / remisión", tipo: "texto", requerido: true, placeholder: "OC-2026-____", ancho: 1 },
          { id: "proveedor", etiqueta: "Proveedor", tipo: "texto", requerido: true, ancho: 2 },
          { id: "guia", etiqueta: "No. de guía / B.L.", tipo: "texto", ancho: 1 },
          { id: "transportista", etiqueta: "Transportista / operador", tipo: "texto", ancho: 1 },
          { id: "placas", etiqueta: "Placas de la unidad", tipo: "texto", ancho: 1 },
          { id: "sello", etiqueta: "No. de sello de seguridad", tipo: "texto", ancho: 1 },
        ],
      },
      {
        titulo: "Verificación de la mercancía",
        campos: [
          { id: "tablaVerificacion", etiqueta: "Verificación", tipo: "tabla", columnas: ["No.", "SKU", "Descripción", "Solicitado", "Recibido", "Diferencia", "Estado físico"], filasTabla: 8, ancho: 3 },
          { id: "bultos", etiqueta: "No. de bultos recibidos", tipo: "numero", ancho: 1 },
          { id: "pesoTotal", etiqueta: "Peso total (kg)", tipo: "numero", ancho: 1 },
          { id: "danio", etiqueta: "¿Mercancía dañada o incompleta?", tipo: "textoLargo", placeholder: "Describe la anomalía y el folio de la evidencia fotográfica", ancho: 3 },
        ],
      },
      {
        titulo: "Ubicación asignada en almacén",
        campos: [
          { id: "rack", etiqueta: "Rack / pasillo", tipo: "texto", requerido: true, placeholder: "Rack A", ancho: 1 },
          { id: "nivel", etiqueta: "Nivel", tipo: "texto", requerido: true, placeholder: "Nivel 1", ancho: 1 },
          { id: "posicion", etiqueta: "Posición / bin", tipo: "texto", requerido: true, placeholder: "Bin 04", ancho: 1 },
          { id: "metodoAcomodo", etiqueta: "Método de acomodo aplicado", tipo: "texto", placeholder: "ABC / FEFO / FIFO", ancho: 1 },
        ],
      },
    ],
    instrucciones: [
      "Verifica cantidad y estado físico ANTES de firmar la recepción.",
      "Registra toda diferencia contra la orden de compra; es la base del ajuste de inventario.",
      "El acomodo debe respetar la clasificación ABC y la rotación del producto.",
      "Toma evidencia fotográfica de cualquier daño antes de retirar la mercancía del muelle.",
    ],
    firmas: ["Alumno operador", "Docente responsable", "Jefe de almacén", "Control escolar CBTIS 270"],
  },
  {
    codigo: "FOR-LOG-M2-02",
    titulo: "Formato de Kardex de Existencias (PEPS / UEPS / Promedio)",
    categoria: "Almacén e Inventarios",
    modulo: 2,
    descripcion:
      "Kardex llenable dentro de la plataforma para controlar entradas, salidas, existencia y saldo valuado por método PEPS, UEPS o Promedio.",
    fileName: "FOR-LOG-M2-02_Kardex-de-Existencias_CBTIS270",
    referenciaNormativa: "NIF C-4 · Inventarios",
    secciones: [
      {
        titulo: "Datos generales del inventario",
        campos: [
          INSTITUCIONAL.alumno,
          INSTITUCIONAL.matricula,
          INSTITUCIONAL.grupo,
          INSTITUCIONAL.semestre,
          INSTITUCIONAL.turno,
          INSTITUCIONAL.docente,
          INSTITUCIONAL.fecha,
        ],
      },
      {
        titulo: "Identificación del producto",
        campos: [
          { id: "sku", etiqueta: "SKU / Clave del producto", tipo: "texto", requerido: true, placeholder: "MAT-ALM-1001", ancho: 1 },
          { id: "producto", etiqueta: "Descripción del producto", tipo: "texto", requerido: true, ancho: 2 },
          { id: "unidad", etiqueta: "Unidad de medida", tipo: "texto", requerido: true, ancho: 1 },
          { id: "metodo", etiqueta: "Método de valuación", tipo: "texto", requerido: true, placeholder: "PEPS / UEPS / PROMEDIO", ancho: 1 },
          { id: "almacen", etiqueta: "Almacén", tipo: "texto", placeholder: "Almacén Escuela · Edificio C", ancho: 1 },
          { id: "existenciaMin", etiqueta: "Existencia mínima", tipo: "numero", ancho: 1 },
        ],
      },
      {
        titulo: "Movimientos del periodo",
        campos: [
          { id: "tablaMovimientos", etiqueta: "Movimientos", tipo: "tabla", columnas: ["No.", "Fecha", "Documento", "Concepto", "Tipo", "Entradas", "Salidas", "Existencia", "P. Unitario", "Importe", "Saldo"], filasTabla: 12, ancho: 3 },
        ],
      },
      {
        titulo: "Cierre del periodo",
        campos: [
          { id: "entradasTotal", etiqueta: "Total de entradas", tipo: "numero", ancho: 1 },
          { id: "salidasTotal", etiqueta: "Total de salidas", tipo: "numero", ancho: 1 },
          { id: "existenciaFinal", etiqueta: "Existencia final", tipo: "numero", requerido: true, ancho: 1 },
          { id: "saldoFinal", etiqueta: "Saldo valuado final", tipo: "numero", ancho: 1 },
          { id: "observaciones", etiqueta: "Observaciones del conteo", tipo: "textoLargo", ancho: 3 },
        ],
      },
    ],
    instrucciones: [
      "Registra los movimientos de forma cronológica y sin renglones en blanco.",
      "PEPS: las salidas se valúan con las entradas más antiguas (First In, First Out).",
      "UEPS: las salidas se valúan con las entradas más recientes.",
      "Promedio: recalcule el precio con (saldo + importe entrada) ÷ (existencia + cantidad entrada).",
      "Al cierre verifica: Existencia final = Entradas totales − Salidas totales.",
    ],
    firmas: ["Alumno que elabora", "Docente responsable", "Jefe de almacén", "Control escolar CBTIS 270"],
  },
];

/* =========================================================
   MÓDULO III — Gestiona el tráfico de mercancías de importación y exportación
   ========================================================= */
const MOD3: FormatoDinamico[] = [
  {
    codigo: "FOR-LOG-M3-01",
    titulo: "Carta Porte · Complemento de Traslado",
    categoria: "Comercio Exterior y Tráfico de Mercancías",
    modulo: 3,
    descripcion:
      "Formato llenable con los campos del Complemento Carta Porte del SAT, incluyendo ubicaciones, mercancías y figura de transporte.",
    fileName: "FOR-LOG-M3-01_Carta-Porte_CBTIS270",
    referenciaNormativa: "RMF 2026 · Ficha 2.2.24 · Anexo 20 SAT",
    secciones: [
      {
        titulo: "Datos del responsable",
        campos: [INSTITUCIONAL.alumno, INSTITUCIONAL.matricula, INSTITUCIONAL.grupo, INSTITUCIONAL.semestre, INSTITUCIONAL.turno, INSTITUCIONAL.docente, INSTITUCIONAL.fecha],
      },
      {
        titulo: "Información general del traslado",
        campos: [
          { id: "uuidCfdi", etiqueta: "UUID del CFDI relacionado", tipo: "texto", placeholder: "UUID de 36 caracteres", ancho: 3 },
          { id: "transInternacional", etiqueta: "¿Es traslado internacional?", tipo: "texto", placeholder: "Sí / No", ancho: 1 },
          { id: "regimen", etiqueta: "Régimen aduanero", tipo: "texto", placeholder: "Definitivo", ancho: 1 },
          { id: "viaEntrada", etiqueta: "Vía de entrada / salida", tipo: "texto", placeholder: "Carretera", ancho: 1 },
          { id: "distancia", etiqueta: "Distancia total (km)", tipo: "numero", requerido: true, ancho: 1 },
        ],
      },
      {
        titulo: "Ubicación de origen",
        campos: [
          { id: "origenCp", etiqueta: "Código postal de origen", tipo: "texto", requerido: true, placeholder: "32575", ancho: 1 },
          { id: "origenDir", etiqueta: "Domicilio de origen", tipo: "texto", requerido: true, ancho: 2 },
          { id: "fechaSalida", etiqueta: "Fecha y hora de salida", tipo: "texto", requerido: true, placeholder: "2026-03-05T08:00:00", ancho: 2 },
        ],
      },
      {
        titulo: "Ubicación de destino",
        campos: [
          { id: "destinoCp", etiqueta: "Código postal de destino", tipo: "texto", requerido: true, placeholder: "31000", ancho: 1 },
          { id: "destinoDir", etiqueta: "Domicilio de destino", tipo: "texto", requerido: true, ancho: 2 },
          { id: "fechaLlegada", etiqueta: "Fecha y hora de llegada estimada", tipo: "texto", requerido: true, ancho: 2 },
        ],
      },
      {
        titulo: "Mercancías trasladadas",
        campos: [
          { id: "tablaMercancias", etiqueta: "Mercancías", tipo: "tabla", columnas: ["No.", "Clave SAT", "Descripción", "Cantidad", "Clave unidad", "Peso (kg)", "Valor"], filasTabla: 6, ancho: 3 },
          { id: "pesoBruto", etiqueta: "Peso bruto total (kg)", tipo: "numero", requerido: true, ancho: 1 },
          { id: "numBultos", etiqueta: "Número de bultos", tipo: "numero", ancho: 1 },
        ],
      },
      {
        titulo: "Medio de transporte y operador",
        campos: [
          { id: "rfcTransportista", etiqueta: "RFC del transportista", tipo: "texto", requerido: true, placeholder: "ABC120456XYZ", ancho: 1 },
          { id: "licencia", etiqueta: "No. de licencia federal", tipo: "texto", requerido: true, ancho: 1 },
          { id: "tipoPermiso", etiqueta: "Tipo de permiso SCT", tipo: "texto", placeholder: "TPAF01", ancho: 1 },
          { id: "placa", etiqueta: "Placa de la unidad", tipo: "texto", requerido: true, ancho: 1 },
          { id: "configVehicular", etiqueta: "Configuración vehicular", tipo: "texto", placeholder: "C2", ancho: 1 },
          { id: "aseguradora", etiqueta: "Aseguradora y póliza", tipo: "texto", ancho: 1 },
        ],
      },
    ],
    instrucciones: [
      "El Carta Porte debe emitirse al momento del traslado; no se admite su emisión posterior.",
      "Las claves de producto y unidad deben corresponder a los catálogos c_ClaveProdServ y c_ClaveUnidad del SAT.",
      "El peso declarado debe coincidir con el CFDI origen; la diferencia es causa de observación.",
      "Conserva el sello de seguridad y su número; el cambio de sello invalida el traslado.",
    ],
    firmas: ["Operador", "Coordinador de tráfico", "Docente responsable", "Alumno que elabora"],
  },
  {
    codigo: "FOR-LOG-M3-02",
    titulo: "Solicitud y Expediente de Importación",
    categoria: "Comercio Exterior y Tráfico de Mercancías",
    modulo: 3,
    descripcion:
      "Checklist y solicitud para integrar el expediente de importación, incluyendo fracciones arancelarias y documentos requeridos.",
    fileName: "FOR-LOG-M3-02_Expediente-de-Importacion_CBTIS270",
    referenciaNormativa: "TIGIE · Reglamento de la Ley Aduanera",
    secciones: [
      {
        titulo: "Datos del interesado",
        campos: [INSTITUCIONAL.alumno, INSTITUCIONAL.matricula, INSTITUCIONAL.grupo, INSTITUCIONAL.semestre, INSTITUCIONAL.turno, INSTITUCIONAL.docente, INSTITUCIONAL.fecha],
      },
      {
        titulo: "Información de la operación",
        campos: [
          { id: "aduana", etiqueta: "Aduana de despacho", tipo: "texto", requerido: true, placeholder: "240 · Ciudad Juárez", ancho: 1 },
          { id: "incoterms", etiqueta: "INCOTERMS", tipo: "texto", requerido: true, placeholder: "FOB / CIF / EXW", ancho: 1 },
          { id: "paisOrigen", etiqueta: "País de origen", tipo: "texto", requerido: true, ancho: 1 },
          { id: "paisVendedor", etiqueta: "País del vendedor", tipo: "texto", ancho: 1 },
          { id: "moneda", etiqueta: "Moneda", tipo: "texto", placeholder: "USD", ancho: 1 },
          { id: "tipoCambio", etiqueta: "Tipo de cambio aplicado", tipo: "numero", ancho: 1 },
          { id: "pesoBruto", etiqueta: "Peso bruto (kg)", tipo: "numero", ancho: 1 },
          { id: "pesoNeto", etiqueta: "Peso neto (kg)", tipo: "numero", ancho: 1 },
          { id: "medioTransporte", etiqueta: "Medio de transporte", tipo: "texto", placeholder: "Carretero / Marítimo / Aéreo", ancho: 1 },
        ],
      },
      {
        titulo: "Fracciones arancelarias declaradas",
        campos: [
          { id: "tablaFracciones", etiqueta: "Fracciones", tipo: "tabla", columnas: ["No.", "Fracción TIGIE", "Descripción", "UMT", "Cantidad", "Valor en aduana"], filasTabla: 6, ancho: 3 },
        ],
      },
      {
        titulo: "Documentos integrados al expediente",
        campos: [
          { id: "chkFactura", etiqueta: "Factura comercial del proveedor extranjero", tipo: "texto", placeholder: "Sí / No / N/A", ancho: 1 },
          { id: "chkPacking", etiqueta: "Lista de empaque (packing list)", tipo: "texto", ancho: 1 },
          { id: "chkBl", etiqueta: "Conocimiento de embarque (B/L / AWB)", tipo: "texto", ancho: 1 },
          { id: "chkOrigen", etiqueta: "Certificado de origen (T-MEC / CPTPP)", tipo: "texto", ancho: 1 },
          { id: "chkPermisos", etiqueta: "Permisos de la dependencia reguladora", tipo: "texto", ancho: 1 },
          { id: "chkPago", etiqueta: "Comprobante de pago de contribuciones", tipo: "texto", ancho: 1 },
        ],
      },
    ],
    instrucciones: [
      "Cada fracción arancelaria debe verificarse contra la TIGIE vigente; un dígito mal capturado cambia la tasa.",
      "El valor en aduana se integra con: valor de la mercancía + flete + seguro.",
      "Las dependencias reguladoras (SE, SADER, COFEPRIS, SEMARNAT) aplican según la fracción.",
      "El expediente debe conservarse al menos 5 años para cualquier requerimiento de auditoría.",
    ],
    firmas: ["Alumno que elabora", "Docente responsable", "Agente aduanal", "Control escolar CBTIS 270"],
  },
];

/* =========================================================
   MÓDULO IV — Gestiona la distribución física de mercancías
   ========================================================= */
const MOD4: FormatoDinamico[] = [
  {
    codigo: "FOR-LOG-M4-01",
    titulo: "Programación de Ruta de Distribución",
    categoria: "Distribución Física",
    modulo: 4,
    descripcion:
      "Formato para planear la ruta de entrega, el orden de paradas, el cálculo de kilómetros y la tarifa final de distribución.",
    fileName: "FOR-LOG-M4-01_Programacion-de-Ruta_CBTIS270",
    referenciaNormativa: "NOM-SCT-2-2017 · Unidades de transporte terrestre",
    secciones: [
      {
        titulo: "Datos del planeador",
        campos: [INSTITUCIONAL.alumno, INSTITUCIONAL.matricula, INSTITUCIONAL.grupo, INSTITUCIONAL.semestre, INSTITUCIONAL.turno, INSTITUCIONAL.docente, INSTITUCIONAL.fecha],
      },
      {
        titulo: "Información del servicio",
        campos: [
          { id: "folioRuta", etiqueta: "Folio de la ruta", tipo: "texto", requerido: true, placeholder: "RUT-2026-001", ancho: 1 },
          { id: "tipoServicio", etiqueta: "Tipo de servicio", tipo: "texto", placeholder: "Última milla / consolidado / dedicado", ancho: 1 },
          { id: "origen", etiqueta: "Origen (CEDIS)", tipo: "texto", requerido: true, placeholder: "Almacén Escuela CBTIS 270", ancho: 2 },
          { id: "unidad", etiqueta: "Tipo de unidad", tipo: "texto", requerido: true, placeholder: "Caja seca 48 pies", ancho: 1 },
          { id: "capacidad", etiqueta: "Capacidad (kg)", tipo: "numero", ancho: 1 },
          { id: "rendimiento", etiqueta: "Rendimiento (km/L)", tipo: "numero", ancho: 1 },
        ],
      },
      {
        titulo: "Orden de paradas",
        campos: [
          { id: "tablaParadas", etiqueta: "Paradas", tipo: "tabla", columnas: ["Orden", "Cliente", "Dirección", "Bultos", "Peso (kg)", "Ventana de entrega"], filasTabla: 8, ancho: 3 },
        ],
      },
      {
        titulo: "Cálculo de la ruta",
        campos: [
          { id: "kmTotales", etiqueta: "Kilómetros totales", tipo: "numero", requerido: true, ancho: 1 },
          { id: "litros", etiqueta: "Litros de diésel estimados", tipo: "numero", ancho: 1 },
          { id: "casetas", etiqueta: "Costo de casetas", tipo: "numero", ancho: 1 },
          { id: "horas", etiqueta: "Horas de operación", tipo: "numero", ancho: 1 },
          { id: "costoTotal", etiqueta: "Costo total del flete", tipo: "numero", ancho: 1 },
          { id: "costoTonelada", etiqueta: "Costo por tonelada", tipo: "numero", ancho: 1 },
        ],
      },
    ],
    instrucciones: [
      "Secuencia las paradas minimizando kilómetros, respetando las ventanas de entrega.",
      "El rendimiento del vehículo cambia con carga, topografía y clima; usa datos reales.",
      "Verifica restricciones de circulación por peso y dimensiones en la zona urbana.",
      "Compara el costo por tonelada contra la tarifa de mercado antes de cerrar el servicio.",
    ],
    firmas: ["Alumno que elabora", "Docente responsable", "Coordinador de tráfico", "Control escolar CBTIS 270"],
  },
];

/* =========================================================
   MÓDULO V — Cotiza costos de la cadena de suministro
   ========================================================= */
const MOD5: FormatoDinamico[] = [
  {
    codigo: "FOR-LOG-M5-01",
    titulo: "Cotización de Costos de la Cadena de Suministro",
    categoria: "Cotización de Costos",
    modulo: 5,
    descripcion:
      "Cotización integral de la cadena de suministro: almacén, transporte, empaque, seguro y overhead, con cálculo de margen y precio final.",
    fileName: "FOR-LOG-M5-01_Cotizacion-de-Costos_CBTIS270",
    referenciaNormativa: "NIF C-9 · Provisiones, contingencias y compromisos",
    secciones: [
      {
        titulo: "Datos del cotizador",
        campos: [INSTITUCIONAL.alumno, INSTITUCIONAL.matricula, INSTITUCIONAL.grupo, INSTITUCIONAL.semestre, INSTITUCIONAL.turno, INSTITUCIONAL.docente, INSTITUCIONAL.fecha],
      },
      {
        titulo: "Servicio a cotizar",
        campos: [
          { id: "folioCotizacion", etiqueta: "Folio de cotización", tipo: "texto", requerido: true, placeholder: "COT-2026-001", ancho: 1 },
          { id: "cliente", etiqueta: "Cliente / empresa", tipo: "texto", requerido: true, ancho: 2 },
          { id: "alcance", etiqueta: "Alcance del servicio", tipo: "textoLargo", requerido: true, ancho: 3 },
          { id: "vigencia", etiqueta: "Vigencia de la cotización (días)", tipo: "numero", placeholder: "15", ancho: 1 },
        ],
      },
      {
        titulo: "Desglose de conceptos",
        campos: [
          { id: "tablaCostos", etiqueta: "Conceptos", tipo: "tabla", columnas: ["No.", "Concepto", "Unidad", "Cantidad", "Costo unitario", "Importe"], filasTabla: 8, ancho: 3 },
        ],
      },
      {
        titulo: "Integración del precio",
        campos: [
          { id: "costoDirecto", etiqueta: "Costo directo", tipo: "numero", requerido: true, ancho: 1 },
          { id: "overhead", etiqueta: "Overhead administrativo (%)", tipo: "numero", placeholder: "12", ancho: 1 },
          { id: "margen", etiqueta: "Margen de utilidad (%)", tipo: "numero", placeholder: "22", ancho: 1 },
          { id: "iva", etiqueta: "IVA (%)", tipo: "numero", placeholder: "16", ancho: 1 },
          { id: "total", etiqueta: "Total a cotizar", tipo: "numero", requerido: true, ancho: 1 },
        ],
      },
      {
        titulo: "Condiciones comerciales",
        campos: [
          { id: "condicionesPago", etiqueta: "Condiciones de pago", tipo: "texto", placeholder: "30 días / contado", ancho: 1 },
          { id: "tiempoEntrega", etiqueta: "Tiempo de entrega", tipo: "texto", ancho: 1 },
          { id: "incoterms", etiqueta: "INCOTERMS aplicable", tipo: "texto", placeholder: "EXW / FOB / CIF", ancho: 1 },
          { id: "exclusiones", etiqueta: "Exclusiones y supuestos", tipo: "textoLargo", ancho: 3 },
        ],
      },
    ],
    instrucciones: [
      "Integra todos los conceptos: transporte, almacenaje, empaque, seguro y mano de obra.",
      "El overhead administrativo recomendado es del 10% al 15% del costo directo.",
      "El margen de utilidad típico en logística varía entre 18% y 25%.",
      "Documenta las exclusiones: evita cobros adicionales no pactados con el cliente.",
    ],
    firmas: ["Alumno que elabora", "Docente responsable", "Dirección comercial", "Control escolar CBTIS 270"],
  },
];

export const FORMATOS_DINAMICOS: FormatoDinamico[] = [
  ...MOD1,
  ...MOD2,
  ...MOD3,
  ...MOD4,
  ...MOD5,
];

export const NOMBRE_MODULO: Record<number, string> = {
  1: "Módulo I · Gestiona la adquisición de mercancías y servicios",
  2: "Módulo II · Organiza el flujo de mercancías en almacén",
  3: "Módulo III · Gestiona el tráfico de mercancías de importación y exportación",
  4: "Módulo IV · Gestiona la distribución física de mercancías",
  5: "Módulo V · Cotiza costos de la cadena de suministro",
};

export function obtenerFormato(codigo: string): FormatoDinamico | undefined {
  return FORMATOS_DINAMICOS.find((f) => f.codigo === codigo);
}

export const CamposInstitucionales = INSTITUCIONAL;
