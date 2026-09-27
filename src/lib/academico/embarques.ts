/**
 * Catálogo precargado de escenarios de rastreo GPS.
 *
 * Misma filosofía que `actividades.ts` y `materiales.ts`: el docente no dibuja
 * rutas ni captura coordenadas. Elige un escenario —o todos los de un módulo— y
 * la plataforma crea el embarque con su folio, su ruta y sus eventos iniciales.
 *
 * Los 25 escenarios cubren los cinco módulos del plan de estudios DGETI de la
 * carrera técnica en Logística y usan rutas reales de la operación que se ve en
 * la región: el Almacén Escuela del CBTIS No. 270, el cruce Ciudad Juárez–El
 * Paso, la carretera federal 45 hacia Chihuahua y el centro del país, los
 * puertos de Veracruz, Altamira, Manzanillo y Lázaro Cárdenas, y la última milla
 * dentro de Ciudad Juárez.
 */

import { SUBMODULOS_DGETI } from "@/lib/academico/actividades";

export type ModoRastreo = "simulado" | "gps";

export type PuntoRuta = {
  nombre: string;
  lat: number;
  lng: number;
  /** Qué representa el punto dentro de la ruta */
  tipo: "origen" | "destino" | "checkpoint" | "paso";
  /** Nota corta que se muestra en la línea de tiempo al alcanzarlo */
  nota?: string;
};

export type EscenarioEmbarque = {
  /** Clave estable, se guarda en shipments.origen */
  clave: string;
  modulo: number;
  submodulo: string;
  titulo: string;
  descripcion: string;
  origen: string;
  destino: string;
  /** Mercancía que viaja */
  carga: string;
  /** Unidad de transporte */
  unidad: string;
  distanciaKm: number;
  /** Velocidad comercial real de la ruta, para el dato en pantalla */
  velocidadKmh: number;
  /** Modo que conviene usar en clase */
  modoSugerido: ModoRastreo;
  ruta: PuntoRuta[];
};

/* ============================ PUNTOS DE REFERENCIA ============================
   Coordenadas de los lugares que se repiten entre escenarios. */

const CBTIS270: PuntoRuta = {
  nombre: "CBTIS No. 270 · Ciudad Juárez",
  lat: 31.6904,
  lng: -106.4245,
  tipo: "destino",
  nota: "Almacén Escuela, Edificio C",
};

const PARQUE_RIO_BRAVO: PuntoRuta = {
  nombre: "Parque Industrial Río Bravo",
  lat: 31.6533,
  lng: -106.4689,
  tipo: "origen",
  nota: "Andén de carga del proveedor",
};

const CENTRO_JUAREZ: PuntoRuta = {
  nombre: "Centro de Ciudad Juárez",
  lat: 31.7333,
  lng: -106.4833,
  tipo: "paso",
};

const CEDIS_JUAREZ: PuntoRuta = {
  nombre: "CEDIS Ciudad Juárez",
  lat: 31.6833,
  lng: -106.4422,
  tipo: "origen",
  nota: "Centro de distribución, salida de ruta",
};

const PUENTE_CORDOVA: PuntoRuta = {
  nombre: "Puente Córdova–Américas",
  lat: 31.6789,
  lng: -106.3899,
  tipo: "checkpoint",
  nota: "Cruce fronterizo: revisión documental",
};

const EL_PASO: PuntoRuta = {
  nombre: "El Paso, Texas",
  lat: 31.7683,
  lng: -106.485,
  tipo: "origen",
  nota: "Bodega del exportador",
};

const CHIHUAHUA: PuntoRuta = {
  nombre: "Chihuahua, Chih.",
  lat: 28.6353,
  lng: -106.0889,
  tipo: "origen",
  nota: "CEDIS estatal",
};

const SUECO: PuntoRuta = {
  nombre: "Entronque El Sueco",
  lat: 28.9514,
  lng: -105.6197,
  tipo: "checkpoint",
  nota: "Punto de relevo de operador",
};

const AHUMADA: PuntoRuta = {
  nombre: "Villa Ahumada",
  lat: 30.6167,
  lng: -106.5167,
  tipo: "checkpoint",
  nota: "Parada de descanso obligatoria",
};

const SAMALAYUCA: PuntoRuta = {
  nombre: "Samalayuca",
  lat: 31.0931,
  lng: -106.6544,
  tipo: "checkpoint",
  nota: "Tramo de médanos, viento lateral",
};

const DELICIAS: PuntoRuta = {
  nombre: "Ciudad Delicias",
  lat: 28.1911,
  lng: -105.475,
  tipo: "checkpoint",
  nota: "Almacén de apoyo",
};

const PARRAL: PuntoRuta = {
  nombre: "Hidalgo del Parral",
  lat: 26.9333,
  lng: -105.6667,
  tipo: "destino",
  nota: "Bodega regional sur",
};

const TORREON: PuntoRuta = {
  nombre: "Torreón, Coah.",
  lat: 25.5428,
  lng: -103.4068,
  tipo: "origen",
  nota: "Proveedores de La Laguna",
};

const DURANGO: PuntoRuta = {
  nombre: "Durango, Dgo.",
  lat: 24.0277,
  lng: -104.6532,
  tipo: "checkpoint",
  nota: "Cruce de la Sierra Madre",
};

const ZACATECAS: PuntoRuta = {
  nombre: "Zacatecas, Zac.",
  lat: 22.7709,
  lng: -102.5832,
  tipo: "checkpoint",
  nota: "Verificación de pesos y dimensiones",
};

const SAN_LUIS: PuntoRuta = {
  nombre: "San Luis Potosí",
  lat: 22.1565,
  lng: -100.9855,
  tipo: "checkpoint",
  nota: "Caseta y revisión de Carta Porte",
};

const QUERETARO: PuntoRuta = {
  nombre: "Querétaro, Qro.",
  lat: 20.5888,
  lng: -100.3899,
  tipo: "checkpoint",
  nota: "Centro de consolidación del Bajío",
};

const CDMX: PuntoRuta = {
  nombre: "Ciudad de México",
  lat: 19.4326,
  lng: -99.1332,
  tipo: "destino",
  nota: "CEDIS Vallejo",
};

const PUEBLA: PuntoRuta = {
  nombre: "Puebla, Pue.",
  lat: 19.0414,
  lng: -98.2063,
  tipo: "checkpoint",
  nota: "Distribución secundaria",
};

const CORDOBA_VER: PuntoRuta = {
  nombre: "Córdoba, Ver.",
  lat: 18.9228,
  lng: -96.9369,
  tipo: "checkpoint",
  nota: "Descenso de la sierra, frenos revisados",
};

const PUERTO_VERACRUZ: PuntoRuta = {
  nombre: "Puerto de Veracruz",
  lat: 19.1899,
  lng: -96.1343,
  tipo: "destino",
  nota: "Recinto fiscalizado",
};

const MONTERREY: PuntoRuta = {
  nombre: "Monterrey, N.L.",
  lat: 25.6866,
  lng: -100.3161,
  tipo: "origen",
  nota: "Planta y CEDIS norte",
};

const SALTILLO: PuntoRuta = {
  nombre: "Saltillo, Coah.",
  lat: 25.4232,
  lng: -100.9924,
  tipo: "checkpoint",
  nota: "Cross-docking regional",
};

const NUEVO_LAREDO: PuntoRuta = {
  nombre: "Nuevo Laredo, Tamps.",
  lat: 27.4862,
  lng: -99.5069,
  tipo: "origen",
  nota: "Recinto fiscalizado estratégico",
};

const LAREDO_TX: PuntoRuta = {
  nombre: "Laredo, Texas",
  lat: 27.5064,
  lng: -99.5075,
  tipo: "destino",
  nota: "Aduana estadounidense",
};

const PIEDRAS_NEGRAS: PuntoRuta = {
  nombre: "Piedras Negras, Coah.",
  lat: 28.7,
  lng: -100.5236,
  tipo: "origen",
  nota: "Exportador nacional",
};

const EAGLE_PASS: PuntoRuta = {
  nombre: "Eagle Pass, Texas",
  lat: 28.7091,
  lng: -100.4995,
  tipo: "destino",
  nota: "Puente internacional Colombia",
};

const GUADALAJARA: PuntoRuta = {
  nombre: "Guadalajara, Jal.",
  lat: 20.6597,
  lng: -103.3496,
  tipo: "origen",
  nota: "CEDIS occidente",
};

const MANZANILLO: PuntoRuta = {
  nombre: "Puerto de Manzanillo",
  lat: 19.0606,
  lng: -104.3172,
  tipo: "origen",
  nota: "Terminal de contenedores",
};

const MORELIA: PuntoRuta = {
  nombre: "Morelia, Mich.",
  lat: 19.706,
  lng: -101.195,
  tipo: "checkpoint",
  nota: "Descanso y relevo",
};

const TOLUCA: PuntoRuta = {
  nombre: "Toluca, Edo. Méx.",
  lat: 19.2826,
  lng: -99.6557,
  tipo: "checkpoint",
  nota: "Inspección en La Marquesa",
};

const LAZARO_CARDENAS: PuntoRuta = {
  nombre: "Puerto Lázaro Cárdenas",
  lat: 17.956,
  lng: -102.2,
  tipo: "origen",
  nota: "Importación marítima de Asia",
};

const NUEVO_CASAS_GRANDES: PuntoRuta = {
  nombre: "Nuevo Casas Grandes",
  lat: 30.4,
  lng: -107.9,
  tipo: "checkpoint",
  nota: "Entrega parcial 1",
};

const CUAUHTEMOC: PuntoRuta = {
  nombre: "Cuauhtémoc, Chih.",
  lat: 28.4066,
  lng: -106.8642,
  tipo: "checkpoint",
  nota: "Entrega parcial 2",
};

const ALTAMIRA: PuntoRuta = {
  nombre: "Puerto de Altamira",
  lat: 22.4036,
  lng: -97.8916,
  tipo: "origen",
  nota: "Terminal del Golfo",
};

const COATZACOALCOS: PuntoRuta = {
  nombre: "Coatzacoalcos, Ver.",
  lat: 18.134,
  lng: -94.4352,
  tipo: "checkpoint",
  nota: "Corredor interoceánico",
};

const VILLAHERMOSA: PuntoRuta = {
  nombre: "Villahermosa, Tab.",
  lat: 17.9894,
  lng: -92.9477,
  tipo: "checkpoint",
  nota: "Relevo de operador",
};

const MERIDA: PuntoRuta = {
  nombre: "Mérida, Yuc.",
  lat: 20.9674,
  lng: -89.5926,
  tipo: "destino",
  nota: "Centro de reacondicionamiento",
};

/* ================================ ESCENARIOS ================================ */

const M1S1 = SUBMODULOS_DGETI[1][0];
const M1S2 = SUBMODULOS_DGETI[1][1];
const M2S1 = SUBMODULOS_DGETI[2][0];
const M2S2 = SUBMODULOS_DGETI[2][1];
const M2S3 = SUBMODULOS_DGETI[2][2];
const M3S1 = SUBMODULOS_DGETI[3][0];
const M3S2 = SUBMODULOS_DGETI[3][1];
const M4S1 = SUBMODULOS_DGETI[4][0];
const M4S2 = SUBMODULOS_DGETI[4][1];
const M5S1 = SUBMODULOS_DGETI[5][0];
const M5S2 = SUBMODULOS_DGETI[5][1];

/* ------------------------- MÓDULO I · Adquisiciones ------------------------- */
const MOD1: EscenarioEmbarque[] = [
  {
    clave: "EMB-M1-01",
    modulo: 1,
    submodulo: M1S1,
    titulo: "Insumos de empaque del proveedor juarense al Almacén Escuela",
    descripcion:
      "Compra local ya autorizada: el proveedor del Parque Industrial Río Bravo surte cajas, tarimas y película stretch al Almacén Escuela del CBTIS 270. Sirve para ver una entrega corta de principio a fin.",
    origen: "Parque Industrial Río Bravo, Ciudad Juárez",
    destino: "Almacén Escuela · CBTIS No. 270",
    carga: "400 cajas de cartón, 30 tarimas y 12 rollos de película stretch",
    unidad: "Camión de 3.5 t con caja seca",
    distanciaKm: 18,
    velocidadKmh: 35,
    modoSugerido: "gps",
    ruta: [
      PARQUE_RIO_BRAVO,
      { nombre: "Av. Manuel Gómez Morín", lat: 31.6722, lng: -106.4533, tipo: "paso" },
      CENTRO_JUAREZ,
      { nombre: "Eje vial Juan Gabriel", lat: 31.7058, lng: -106.4611, tipo: "checkpoint", nota: "Tráfico escolar, se pierde tiempo" },
      CBTIS270,
    ],
  },
  {
    clave: "EMB-M1-02",
    modulo: 1,
    submodulo: M1S2,
    titulo: "Compra nacional de papelería: Chihuahua a Ciudad Juárez",
    descripcion:
      "La orden de compra nacional más común del plantel: papelería y consumibles surtidos desde el CEDIS de Chihuahua por la carretera federal 45, con las paradas obligatorias del tramo.",
    origen: "CEDIS Chihuahua",
    destino: "Almacén Escuela · CBTIS No. 270",
    carga: "1.8 t de papelería y consumibles de oficina",
    unidad: "Camioneta de 1 t con caja refrigerada seca",
    distanciaKm: 372,
    velocidadKmh: 80,
    modoSugerido: "simulado",
    ruta: [CHIHUAHUA, SUECO, AHUMADA, SAMALAYUCA, CENTRO_JUAREZ, CBTIS270],
  },
  {
    clave: "EMB-M1-03",
    modulo: 1,
    submodulo: M1S2,
    titulo: "Importación temporal de componentes desde El Paso, Texas",
    descripcion:
      "Cotización internacional convertida en embarque: componentes cruzan por el puente Córdova–Américas con pedimento y llegan al almacén para su resguardo temporal.",
    origen: "Bodega del exportador, El Paso, Texas",
    destino: "Almacén Escuela · CBTIS No. 270",
    carga: "12 tarimas de componentes electrónicos, régimen IMMEX",
    unidad: "Tractocamión con caja de 48 pies",
    distanciaKm: 28,
    velocidadKmh: 40,
    modoSugerido: "gps",
    ruta: [
      EL_PASO,
      { nombre: "Zaragoza–Ysleta", lat: 31.6989, lng: -106.3347, tipo: "paso" },
      PUENTE_CORDOVA,
      { nombre: "Parque Industrial Intermex", lat: 31.6631, lng: -106.4094, tipo: "paso" },
      CBTIS270,
    ],
  },
  {
    clave: "EMB-M1-04",
    modulo: 1,
    submodulo: M1S1,
    titulo: "Consolidado de proveedores regionales hacia el centro del país",
    descripcion:
      "Cuatro proveedores del Bajío y del norte consolidan su carga en un solo embarque hacia el CEDIS de Vallejo. Ejercicio clásico de cotización comparada por kilómetro y por tarima.",
    origen: "Torreón, Coahuila",
    destino: "CEDIS Vallejo, Ciudad de México",
    carga: "Consolidado: 18 tarimas de cuatro proveedores",
    unidad: "Tractocamión con caja de 53 pies",
    distanciaKm: 1024,
    velocidadKmh: 78,
    modoSugerido: "simulado",
    ruta: [TORREON, DURANGO, ZACATECAS, SAN_LUIS, QUERETARO, CDMX],
  },
  {
    clave: "EMB-M1-05",
    modulo: 1,
    submodulo: M1S2,
    titulo: "Flete foráneo Monterrey a Nuevo Laredo para proveedor internacional",
    descripcion:
      "Requisición de un servicio de transporte: la carga sale de la planta regia y se entrega en el recinto fiscalizado de Nuevo Laredo para su exportación. Sirve para cotizar el servicio antes de contratarlo.",
    origen: "Planta Monterrey, Nuevo León",
    destino: "Recinto fiscalizado, Nuevo Laredo",
    carga: "22 tarimas de arneses automotrices",
    unidad: "Tractocamión con caja de 48 pies",
    distanciaKm: 226,
    velocidadKmh: 82,
    modoSugerido: "simulado",
    ruta: [
      MONTERREY,
      SALTILLO,
      { nombre: "Anáhuac, N.L.", lat: 27.2333, lng: -100.15, tipo: "checkpoint", nota: "Caseta y pesaje" },
      NUEVO_LAREDO,
    ],
  },
];

/* --------------------------- MÓDULO II · Almacén ---------------------------- */
const MOD2: EscenarioEmbarque[] = [
  {
    clave: "EMB-M2-01",
    modulo: 2,
    submodulo: M2S1,
    titulo: "Recepción de tarimas en el Almacén Escuela del plantel",
    descripcion:
      "Escenario corto para practicar recepción: la unidad llega al andén del Edificio C, se hace el cotejo contra la orden de compra y se registra la entrada en el Kardex.",
    origen: "CEDIS Ciudad Juárez",
    destino: "Almacén Escuela · Edificio C",
    carga: "24 tarimas con producto terminado etiquetado",
    unidad: "Camión torton con plataforma",
    distanciaKm: 9,
    velocidadKmh: 30,
    modoSugerido: "gps",
    ruta: [
      CEDIS_JUAREZ,
      {
        nombre: "Blvd. Zaragoza",
        lat: 31.6811,
        lng: -106.4556,
        tipo: "checkpoint",
        nota: "Cotejo de la orden de compra antes de llegar al andén",
      },
      CBTIS270,
    ],
  },
  {
    clave: "EMB-M2-02",
    modulo: 2,
    submodulo: M2S2,
    titulo: "Traslado entre almacenes: Chihuahua a Ciudad Juárez",
    descripcion:
      "Reacomodo de inventario entre el CEDIS estatal y el almacén regional: el alumno sigue el embarque y verifica que lo recibido coincida con lo que salió.",
    origen: "CEDIS Chihuahua",
    destino: "Almacén regional Ciudad Juárez",
    carga: "16 tarimas de rotación media",
    unidad: "Tractocamión con caja de 48 pies",
    distanciaKm: 366,
    velocidadKmh: 80,
    modoSugerido: "simulado",
    ruta: [
      CHIHUAHUA,
      SUECO,
      AHUMADA,
      SAMALAYUCA,
      { nombre: "Almacén regional, eje vial", lat: 31.7, lng: -106.45, tipo: "destino", nota: "Descarga en andén 2" },
    ],
  },
  {
    clave: "EMB-M2-03",
    modulo: 2,
    submodulo: M2S3,
    titulo: "Abasto de la red regional: Juárez, Delicias y Parral",
    descripcion:
      "Una sola unidad abastece tres almacenes del sur del estado. El conteo cíclico se hace en cada parada, por eso el embarque tiene tres checkpoints de inventario.",
    origen: "Almacén regional Ciudad Juárez",
    destino: "Bodega regional sur, Hidalgo del Parral",
    carga: "Inventario de reposición: 21 tarimas repartidas en tres paradas",
    unidad: "Camión torton con caja de 24 pies",
    distanciaKm: 512,
    velocidadKmh: 75,
    modoSugerido: "simulado",
    ruta: [
      { nombre: "Almacén regional Ciudad Juárez", lat: 31.7, lng: -106.45, tipo: "origen", nota: "Salida con lista de surtido" },
      DELICIAS,
      { nombre: "Camargo", lat: 27.6772, lng: -105.1731, tipo: "checkpoint", nota: "Conteo parcial y ajuste de Kardex" },
      PARRAL,
    ],
  },
  {
    clave: "EMB-M2-04",
    modulo: 2,
    submodulo: M2S3,
    titulo: "Inventario en tránsito del occidente al centro",
    descripcion:
      "El inventario ya no está en el almacén pero todavía no llega: mientras viaja se contabiliza como inventario en tránsito. Ruta larga para discutir el costo de mantenerlo.",
    origen: "CEDIS occidente, Guadalajara",
    destino: "CEDIS Vallejo, Ciudad de México",
    carga: "26 tarimas de producto terminado",
    unidad: "Tractocamión con caja de 53 pies",
    distanciaKm: 540,
    velocidadKmh: 80,
    modoSugerido: "simulado",
    ruta: [GUADALAJARA, MORELIA, TOLUCA, CDMX],
  },
  {
    clave: "EMB-M2-05",
    modulo: 2,
    submodulo: M2S2,
    titulo: "Devolución a bodega: Manzanillo a Guadalajara",
    descripcion:
      "Mercancía rechazada en el puerto regresa al almacén de origen para su dictamen: merma, reproceso o devolución al proveedor. Incluye la incidencia de sello violado.",
    origen: "Puerto de Manzanillo",
    destino: "CEDIS occidente, Guadalajara",
    carga: "2 contenedores de 20 pies con mercancía rechazada",
    unidad: "Tractocamión con portacontenedor",
    distanciaKm: 265,
    velocidadKmh: 70,
    modoSugerido: "simulado",
    ruta: [
      MANZANILLO,
      { nombre: "Ciudad Guzmán", lat: 19.7069, lng: -103.4619, tipo: "checkpoint", nota: "Incidencia: sello del contenedor violado" },
      { nombre: "Sayula", lat: 19.8742, lng: -103.6089, tipo: "paso" },
      GUADALAJARA,
    ],
  },
];

/* ----------------------- MÓDULO III · Comercio exterior ----------------------- */
const MOD3: EscenarioEmbarque[] = [
  {
    clave: "EMB-M3-01",
    modulo: 3,
    submodulo: M3S1,
    titulo: "Exportación terrestre Ciudad Juárez a Ciudad de México",
    descripcion:
      "El caso base de la carrera: embarque con Carta Porte, factura comercial y lista de empaque que recorre la federal 45 hasta el CEDIS del cliente en Vallejo.",
    origen: "Maquiladora, Ciudad Juárez",
    destino: "CEDIS Vallejo, Ciudad de México",
    carga: "28 tarimas de producto terminado para exportación indirecta",
    unidad: "Tractocamión con caja de 53 pies",
    distanciaKm: 1560,
    velocidadKmh: 78,
    modoSugerido: "simulado",
    ruta: [
      { nombre: "Maquiladora, Parque Industrial", lat: 31.6533, lng: -106.4689, tipo: "origen", nota: "Carga y precinto" },
      AHUMADA,
      CHIHUAHUA,
      { nombre: "Jiménez, Chih.", lat: 27.0, lng: -104.9, tipo: "checkpoint", nota: "Cambio de operador" },
      TORREON,
      ZACATECAS,
      SAN_LUIS,
      QUERETARO,
      CDMX,
    ],
  },
  {
    clave: "EMB-M3-02",
    modulo: 3,
    submodulo: M3S2,
    titulo: "Chihuahua al Puerto de Veracruz para exportación marítima",
    descripcion:
      "La carga baja de Chihuahua al Golfo para salir en buque. Se documenta el tramo carretero y se coordina la ventana de entrega con la terminal portuaria.",
    origen: "CEDIS Chihuahua",
    destino: "Puerto de Veracruz, recinto fiscalizado",
    carga: "20 tarimas de autopartes en cajas de madera fumigada",
    unidad: "Tractocamión con caja de 48 pies",
    distanciaKm: 1245,
    velocidadKmh: 76,
    modoSugerido: "simulado",
    ruta: [
      CHIHUAHUA,
      { nombre: "Jiménez, Chih.", lat: 27.0, lng: -104.9, tipo: "checkpoint", nota: "Revisión documental" },
      TORREON,
      SAN_LUIS,
      { nombre: "Poza Rica, Ver.", lat: 20.5289, lng: -97.4556, tipo: "checkpoint", nota: "Descenso hacia la costa" },
      { nombre: "Martínez de la Torre, Ver.", lat: 20.0, lng: -97.0667, tipo: "paso" },
      PUERTO_VERACRUZ,
    ],
  },
  {
    clave: "EMB-M3-03",
    modulo: 3,
    submodulo: M3S2,
    titulo: "Maniobras dentro del Puerto de Veracruz",
    descripcion:
      "Movimientos cortos pero críticos: del patio fiscal al muelle, con revisión aduanera, pesaje en báscula y estiba. Perfecto para demostrar en clase porque todo ocurre en pocos cientos de metros.",
    origen: "Patio fiscal, Puerto de Veracruz",
    destino: "Muelle 4 · estiba del buque",
    carga: "Contenedor de 40 pies, 18 t de producto terminado",
    unidad: "Tractor de patio y grúa pórtico",
    distanciaKm: 4,
    velocidadKmh: 20,
    modoSugerido: "gps",
    ruta: [
      { nombre: "Patio fiscal, posición A-12", lat: 19.1962, lng: -96.1288, tipo: "origen", nota: "Reconocimiento aduanero" },
      { nombre: "Báscula del recinto", lat: 19.1931, lng: -96.1256, tipo: "checkpoint", nota: "Peso bruto verificado" },
      { nombre: "Puerta 3, zona de maniobras", lat: 19.1902, lng: -96.1231, tipo: "checkpoint", nota: "Autorización de circulación interna" },
      { nombre: "Muelle 4", lat: 19.1874, lng: -96.1204, tipo: "destino", nota: "Estiba confirmada a bordo" },
    ],
  },
  {
    clave: "EMB-M3-04",
    modulo: 3,
    submodulo: M3S1,
    titulo: "Importación marítima: Lázaro Cárdenas al centro del país",
    descripcion:
      "Contenedor descargado de un buque de Asia, desaduanado en Lázaro Cárdenas y enviado por carretera al CEDIS de Vallejo. Permite ver pedimento, contribuciones y flete interior juntos.",
    origen: "Puerto Lázaro Cárdenas, Michoacán",
    destino: "CEDIS Vallejo, Ciudad de México",
    carga: "Contenedor de 40 pies con insumos de Asia",
    unidad: "Tractocamión con portacontenedor",
    distanciaKm: 512,
    velocidadKmh: 72,
    modoSugerido: "simulado",
    ruta: [
      LAZARO_CARDENAS,
      { nombre: "Uruapan, Mich.", lat: 19.4167, lng: -102.0667, tipo: "checkpoint", nota: "Ascenso por la Meseta Purépecha" },
      MORELIA,
      TOLUCA,
      CDMX,
    ],
  },
  {
    clave: "EMB-M3-05",
    modulo: 3,
    submodulo: M3S1,
    titulo: "Cruce internacional Nuevo Laredo a Laredo, Texas",
    descripcion:
      "El cruce más transitado del país: selección de semáforo, revisión secundaria y entrega en bodega del cliente. Escenario corto e intenso, ideal para GPS real en el salón.",
    origen: "Recinto fiscalizado, Nuevo Laredo",
    destino: "Bodega del importador, Laredo, Texas",
    carga: "26 tarimas de arneses con pedimento de exportación definitiva",
    unidad: "Tractocamión con caja de 53 pies",
    distanciaKm: 22,
    velocidadKmh: 25,
    modoSugerido: "gps",
    ruta: [
      NUEVO_LAREDO,
      { nombre: "Puente Internacional II", lat: 27.4942, lng: -99.5117, tipo: "checkpoint", nota: "Semáforo fiscal: revisión" },
      { nombre: "Aduana de Laredo", lat: 27.5011, lng: -99.5042, tipo: "checkpoint", nota: "CBP: liberación" },
      LAREDO_TX,
    ],
  },
];

/* ---------------------- MÓDULO IV · Distribución física ---------------------- */
const MOD4: EscenarioEmbarque[] = [
  {
    clave: "EMB-M4-01",
    modulo: 4,
    submodulo: M4S1,
    titulo: "Última milla en Ciudad Juárez: ocho entregas del día",
    descripcion:
      "La ruta de reparto urbana: sale del CEDIS con ocho paradas dentro de la ciudad y regresa con la evidencia firmada. Es el escenario más útil para proyectar en clase.",
    origen: "CEDIS Ciudad Juárez",
    destino: "Ocho puntos de entrega en Ciudad Juárez",
    carga: "120 pedidos consolidados para comercio local",
    unidad: "Camioneta de reparto de 1.5 t",
    distanciaKm: 46,
    velocidadKmh: 32,
    modoSugerido: "gps",
    ruta: [
      CEDIS_JUAREZ,
      { nombre: "Entrega 1 · Zona Pronaf", lat: 31.7044, lng: -106.4472, tipo: "checkpoint", nota: "Entregado, firma del cliente" },
      CENTRO_JUAREZ,
      { nombre: "Entrega 2 · Mercado Juárez", lat: 31.7411, lng: -106.4886, tipo: "checkpoint", nota: "Entregado en 12 min" },
      { nombre: "Entrega 3 · Blvd. Independencia", lat: 31.7119, lng: -106.4378, tipo: "checkpoint", nota: "Cliente ausente, se reprograma" },
      { nombre: "Entrega 4 · Parque Industrial Bermúdez", lat: 31.6467, lng: -106.4167, tipo: "checkpoint", nota: "Entregado con acuse" },
      { nombre: "Entrega 5 · Las Torres", lat: 31.6897, lng: -106.3686, tipo: "checkpoint", nota: "Entregado" },
      CBTIS270,
    ],
  },
  {
    clave: "EMB-M4-02",
    modulo: 4,
    submodulo: M4S2,
    titulo: "Reparto regional: Juárez, Nuevo Casas Grandes, Cuauhtémoc y Chihuahua",
    descripcion:
      "Distribución secundaria por el estado con entregas parciales y confirmación de servicio al cliente en cada plaza.",
    origen: "CEDIS Ciudad Juárez",
    destino: "CEDIS Chihuahua",
    carga: "Ruta consolidada de 34 pedidos regionales",
    unidad: "Camión torton con caja de 24 pies",
    distanciaKm: 468,
    velocidadKmh: 74,
    modoSugerido: "simulado",
    ruta: [
      CEDIS_JUAREZ,
      NUEVO_CASAS_GRANDES,
      { nombre: "Rubio (entronque)", lat: 28.7833, lng: -106.9667, tipo: "paso" },
      CUAUHTEMOC,
      CHIHUAHUA,
    ],
  },
  {
    clave: "EMB-M4-03",
    modulo: 4,
    submodulo: M4S1,
    titulo: "Distribución secundaria: Ciudad de México a Veracruz",
    descripcion:
      "Del CEDIS del centro hacia la costa, con entregas intermedias en Puebla y Córdoba. Sirve para calcular la ventana de entrega prometida al cliente.",
    origen: "CEDIS Vallejo, Ciudad de México",
    destino: "Puerto de Veracruz, tienda ancla",
    carga: "14 tarimas para tres puntos de venta",
    unidad: "Camión torton con caja de 24 pies",
    distanciaKm: 425,
    velocidadKmh: 70,
    modoSugerido: "simulado",
    ruta: [
      CDMX,
      PUEBLA,
      { nombre: "Orizaba, Ver.", lat: 18.85, lng: -97.1, tipo: "checkpoint", nota: "Cumbres de Maltrata" },
      CORDOBA_VER,
      PUERTO_VERACRUZ,
    ],
  },
  {
    clave: "EMB-M4-04",
    modulo: 4,
    submodulo: M4S1,
    titulo: "Cross-docking Monterrey, Saltillo y Torreón",
    descripcion:
      "La carga no se almacena: entra y sale del andén en menos de cuatro horas. El escenario muestra por qué el cross-docking baja el costo de inventario.",
    origen: "CEDIS Monterrey",
    destino: "Cross-dock Torreón",
    carga: "Consolidado de 19 tarimas para La Laguna",
    unidad: "Tractocamión con caja de 53 pies",
    distanciaKm: 366,
    velocidadKmh: 80,
    modoSugerido: "simulado",
    ruta: [
      MONTERREY,
      SALTILLO,
      { nombre: "Parras de la Fuente", lat: 25.4167, lng: -102.1833, tipo: "checkpoint", nota: "Traspaso de carga" },
      TORREON,
    ],
  },
  {
    clave: "EMB-M4-05",
    modulo: 4,
    submodulo: M4S2,
    titulo: "Logística inversa: recolección de devoluciones en Mérida",
    descripcion:
      "Ruta en sentido contrario: la unidad recoge devoluciones y garantías en la península y las lleva al centro de reacondicionamiento. Cada parada es una reclamación del cliente.",
    origen: "Ruta de recolección, Mérida",
    destino: "Centro de reacondicionamiento, Mérida",
    carga: "60 piezas devueltas por garantía",
    unidad: "Camioneta de reparto con caja cerrada",
    distanciaKm: 38,
    velocidadKmh: 30,
    modoSugerido: "gps",
    ruta: [
      { nombre: "Punto de venta Centro, Mérida", lat: 20.9674, lng: -89.6237, tipo: "origen", nota: "Recolección 1" },
      { nombre: "Plaza Altabrisa", lat: 20.9919, lng: -89.5753, tipo: "checkpoint", nota: "Recolección 2" },
      { nombre: "Francisco de Montejo", lat: 20.9892, lng: -89.6689, tipo: "checkpoint", nota: "Recolección 3: mercancía dañada" },
      { nombre: "Umán", lat: 20.7514, lng: -89.7461, tipo: "checkpoint", nota: "Recolección 4" },
      { nombre: "Centro de reacondicionamiento", lat: 20.9375, lng: -89.6597, tipo: "destino", nota: "Dictamen de garantía" },
    ],
  },
];

/* ------------------------ MÓDULO V · Costos y presupuesto ------------------------ */
const MOD5: EscenarioEmbarque[] = [
  {
    clave: "EMB-M5-01",
    modulo: 5,
    submodulo: M5S1,
    titulo: "Costeo del flete Chihuahua a Ciudad Juárez",
    descripcion:
      "El mismo recorrido del módulo II, pero ahora se costea: diésel, casetas, operador, depreciación y margen. El mapa muestra dónde se gasta cada tramo.",
    origen: "CEDIS Chihuahua",
    destino: "Almacén regional Ciudad Juárez",
    carga: "Carga general, 21 t",
    unidad: "Tractocamión con caja de 48 pies",
    distanciaKm: 366,
    velocidadKmh: 80,
    modoSugerido: "simulado",
    ruta: [CHIHUAHUA, SUECO, AHUMADA, SAMALAYUCA, { nombre: "Almacén regional, eje vial", lat: 31.7, lng: -106.45, tipo: "destino", nota: "Descarga y conciliación de costos" }],
  },
  {
    clave: "EMB-M5-02",
    modulo: 5,
    submodulo: M5S1,
    titulo: "Consolidado LCL Manzanillo a Ciudad de México",
    descripcion:
      "Carga menor que comparte contenedor: el costo se reparte entre varios clientes. Se costea por tarima y por metro cúbico para comparar tarifas del mercado.",
    origen: "Puerto de Manzanillo",
    destino: "CEDIS Vallejo, Ciudad de México",
    carga: "LCL: 6 tarimas de tres clientes distintos",
    unidad: "Tractocamión con portacontenedor",
    distanciaKm: 690,
    velocidadKmh: 74,
    modoSugerido: "simulado",
    ruta: [MANZANILLO, { nombre: "Ciudad Guzmán", lat: 19.7069, lng: -103.4619, tipo: "paso" }, GUADALAJARA, MORELIA, CDMX],
  },
  {
    clave: "EMB-M5-03",
    modulo: 5,
    submodulo: M5S2,
    titulo: "Cotización de última milla por zona en Ciudad Juárez",
    descripcion:
      "Ruta corta para cotizar entregas por código postal: cada checkpoint es una tarifa distinta según la zona, el peso y si el cliente exige cita previa.",
    origen: "CEDIS Ciudad Juárez",
    destino: "Cinco zonas de entrega, Ciudad Juárez",
    carga: "85 pedidos de comercio electrónico",
    unidad: "Camioneta de reparto eléctrica",
    distanciaKm: 34,
    velocidadKmh: 28,
    modoSugerido: "gps",
    ruta: [
      CEDIS_JUAREZ,
      { nombre: "Zona Centro", lat: 31.7333, lng: -106.4833, tipo: "checkpoint", nota: "Tarifa A: entrega estándar" },
      { nombre: "Zona Pronaf", lat: 31.7044, lng: -106.4472, tipo: "checkpoint", nota: "Tarifa A: con cita" },
      { nombre: "Zona Las Torres", lat: 31.6897, lng: -106.3686, tipo: "checkpoint", nota: "Tarifa B: periferia" },
      { nombre: "Zona Ribereña", lat: 31.6167, lng: -106.4333, tipo: "checkpoint", nota: "Tarifa C: camino sin pavimentar" },
      CBTIS270,
    ],
  },
  {
    clave: "EMB-M5-04",
    modulo: 5,
    submodulo: M5S2,
    titulo: "Costo por cruce: Piedras Negras a Eagle Pass",
    descripcion:
      "El costo de cruzar la frontera no es el flete: es la espera. El escenario registra tiempos de caseta y de aduana para liquidar el servicio con datos reales.",
    origen: "Exportador, Piedras Negras",
    destino: "Bodega del cliente, Eagle Pass, Texas",
    carga: "24 tarimas de productos terminados",
    unidad: "Tractocamión con caja de 53 pies",
    distanciaKm: 19,
    velocidadKmh: 22,
    modoSugerido: "gps",
    ruta: [
      PIEDRAS_NEGRAS,
      { nombre: "Puente Internacional I", lat: 28.7022, lng: -100.5267, tipo: "checkpoint", nota: "Fila de exportación: 2 h 40 min" },
      { nombre: "Aduana de Eagle Pass", lat: 28.7064, lng: -100.4983, tipo: "checkpoint", nota: "Revisión de seguridad" },
      EAGLE_PASS,
    ],
  },
  {
    clave: "EMB-M5-05",
    modulo: 5,
    submodulo: M5S1,
    titulo: "Ruta del sureste: Veracruz a Mérida, costo total entregado",
    descripcion:
      "El escenario más largo del catálogo. Se costea etapa por etapa, incluyendo el relevo de operador en Villahermosa, para llegar al costo total entregado al cliente.",
    origen: "Puerto de Veracruz",
    destino: "Centro de distribución, Mérida",
    carga: "18 tarimas de producto terminado",
    unidad: "Tractocamión con caja de 48 pies",
    distanciaKm: 903,
    velocidadKmh: 72,
    modoSugerido: "simulado",
    ruta: [
      PUERTO_VERACRUZ,
      COATZACOALCOS,
      VILLAHERMOSA,
      { nombre: "Campeche", lat: 19.8301, lng: -90.5349, tipo: "checkpoint", nota: "Relevo de operador y pernocta" },
      MERIDA,
    ],
  },
];

/**
 * Los puntos de referencia se reutilizan entre escenarios y cada uno trae el
 * papel que cumple en su ruta original (Chihuahua es origen en unas rutas y
 * checkpoint en otras). Aquí se fija el papel real dentro de cada ruta: primer
 * punto = origen, último = destino y cualquier origen/destino intermedio pasa a
 * checkpoint. Así el mapa, la bitácora y el motor de avance nunca se confunden.
 */
function normalizarRuta(ruta: PuntoRuta[]): PuntoRuta[] {
  return ruta.map((punto, indice, arr) => ({
    ...punto,
    tipo:
      indice === 0
        ? "origen"
        : indice === arr.length - 1
          ? "destino"
          : punto.tipo === "paso"
            ? "paso"
            : "checkpoint",
  }));
}

export const ESCENARIOS_EMBARQUE: EscenarioEmbarque[] = [
  ...MOD1,
  ...MOD2,
  ...MOD3,
  ...MOD4,
  ...MOD5,
].map((escenario) => ({ ...escenario, ruta: normalizarRuta(escenario.ruta) }));

/* ================================ UTILIDADES ================================ */

/** Distancia en kilómetros entre dos coordenadas (fórmula de Haversine). */
export function distanciaKm(a: PuntoRuta, b: PuntoRuta): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Kilómetros de la polilínea completa. */
export function kilometrajeDeRuta(ruta: PuntoRuta[]): number {
  let total = 0;
  for (let i = 1; i < ruta.length; i += 1) total += distanciaKm(ruta[i - 1], ruta[i]);
  return Math.round(total);
}

/** Coordenada sobre la polilínea a un avance dado (0 al inicio, 1 al final). */
export function posicionEnRuta(ruta: PuntoRuta[], progreso: number): PuntoRuta | null {
  if (ruta.length === 0) return null;
  if (ruta.length === 1) return ruta[0];
  const p = Math.max(0, Math.min(1, progreso));
  const tramos = ruta.slice(1).map((punto, i) => ({ punto, km: distanciaKm(ruta[i], punto) }));
  const total = tramos.reduce((a, t) => a + t.km, 0);
  if (total === 0) return ruta[0];

  let objetivo = p * total;
  for (let i = 0; i < tramos.length; i += 1) {
    const { punto, km } = tramos[i];
    const anterior = ruta[i];
    if (objetivo <= km || i === tramos.length - 1) {
      const fraccion = km === 0 ? 0 : Math.min(1, objetivo / km);
      return {
        nombre: punto.nombre,
        lat: anterior.lat + (punto.lat - anterior.lat) * fraccion,
        lng: anterior.lng + (punto.lng - anterior.lng) * fraccion,
        tipo: "paso",
      };
    }
    objetivo -= km;
  }
  return ruta[ruta.length - 1];
}

/** Kilómetro de la ruta en el que se encuentra un avance dado. */
export function kilometroDeAvance(ruta: PuntoRuta[], progreso: number): number {
  return Math.round(kilometrajeDeRuta(ruta) * Math.max(0, Math.min(1, progreso)));
}

/** Avance (0 a 1) al que se alcanza cada punto de la ruta, en el mismo orden. */
export function avancesDeCheckpoints(ruta: PuntoRuta[]): number[] {
  const tramos = ruta.slice(1).map((punto, i) => distanciaKm(ruta[i], punto));
  const total = tramos.reduce((a, b) => a + b, 0);
  if (total === 0) return ruta.map(() => 0);
  let acumulado = 0;
  return ruta.map((_, indice) => {
    if (indice === 0) return 0;
    acumulado += tramos[indice - 1];
    return acumulado / total;
  });
}

export function escenarioPorClave(clave: string): EscenarioEmbarque | undefined {
  return ESCENARIOS_EMBARQUE.find((e) => e.clave === clave);
}

export function escenariosDelModulo(modulo: number | null | undefined): EscenarioEmbarque[] {
  if (!modulo) return ESCENARIOS_EMBARQUE;
  return ESCENARIOS_EMBARQUE.filter((e) => e.modulo === modulo);
}

/** La ruta serializada como se guarda en la columna `shipments.ruta`. */
export function serializarRuta(ruta: PuntoRuta[]): string {
  return ruta.map((p) => `${p.lat},${p.lng}`).join(";");
}

/** Reconstruye la ruta a partir de la columna `shipments.ruta`. */
export function deserializarRuta(serializada: string): Array<{ lat: number; lng: number }> {
  return serializada
    .split(";")
    .map((par) => {
      const [lat, lng] = par.split(",").map((n) => Number(n));
      return { lat, lng };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

/**
 * En clase el recorrido completo se recorre en unos minutos para que se pueda
 * proyectar; el kilometraje y la velocidad que se muestran son los reales de la
 * ruta. Esta constante es la duración, en segundos, de un viaje simulado.
 */
export const DURACION_RECORRIDO_DEMO_SEG = 300;

export const ETIQUETA_ESTADO_EMBARQUE: Record<string, string> = {
  programado: "Programado",
  en_transito: "En tránsito",
  detenido: "Detenido",
  incidencia: "Con incidencia",
  entregado: "Entregado",
};

export const COLOR_ESTADO_EMBARQUE: Record<string, string> = {
  programado: "bg-slate-100 text-slate-600",
  en_transito: "bg-emerald-100 text-emerald-800",
  detenido: "bg-amber-100 text-amber-800",
  incidencia: "bg-rose-100 text-rose-800",
  entregado: "bg-inst-100 text-inst-800",
};
