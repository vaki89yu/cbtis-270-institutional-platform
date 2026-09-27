/**
 * Banco de cuestionarios autocalificables del plan de estudios de Logística.
 *
 * Quince evaluaciones —una por cada parcial de los cinco módulos DGETI— con
 * ocho reactivos cada una (120 en total) sobre adquisiciones, almacén, comercio
 * exterior, distribución y costos.
 *
 * Seguridad: este archivo sólo se importa en el servidor. La página que ve el
 * alumno recibe las preguntas SIN el índice correcto ni la explicación; la
 * calificación se calcula al recibir las respuestas y sólo entonces se devuelve
 * la explicación de cada reactivo.
 */

import { SUBMODULOS_DGETI } from "@/lib/academico/actividades";

export type PreguntaCuestionario = {
  id: string;
  enunciado: string;
  opciones: string[];
  /** Índice de la opción correcta. No sale del servidor. */
  correcta: number;
  /** Retroalimentación que se muestra después de enviar. No sale del servidor. */
  explicacion: string;
};

export type Cuestionario = {
  /** Clave estable, se guarda en quiz_attempts.cuestionario_clave */
  clave: string;
  modulo: number;
  parcial: number;
  submodulo: string;
  titulo: string;
  descripcion: string;
  /** Minutos disponibles antes de que se envíe solo */
  minutos: number;
  /** Puntos sobre la escala de 100 */
  puntos: number;
  preguntas: PreguntaCuestionario[];
};

/** Constructor: todos los cuestionarios valen 100 puntos y duran 12 minutos. */
function Q(
  c: Omit<Cuestionario, "puntos" | "minutos"> & { puntos?: number; minutos?: number },
): Cuestionario {
  return { puntos: 100, minutos: 12, ...c };
}

/* ====================== MÓDULO I · ADQUISICIONES ====================== */

const Q_M1_P1 = Q({
  clave: "Q-M1-P1",
  modulo: 1,
  parcial: 1,
  submodulo: SUBMODULOS_DGETI[1][0],
  titulo: "Primer parcial · Cadena de suministro y abastecimiento",
  descripcion:
    "Eslabones, flujos, punto de reorden, stock de seguridad y detección de necesidades de compra.",
  preguntas: [
    {
      id: "M1P1-01",
      enunciado: "¿Qué describe mejor una cadena de suministro?",
      opciones: [
        "El recorrido del camión desde la bodega hasta el cliente",
        "La red de eslabones que va de la materia prima al cliente final, incluyendo proveedores, transformación, almacén y distribución",
        "El conjunto de formatos que se llenan en el área de compras",
        "La lista de precios de los proveedores autorizados",
      ],
      correcta: 1,
      explicacion:
        "La cadena de suministro es la red completa de eslabones: proveedores, producción, almacén, distribución y cliente final. El transporte es sólo uno de esos eslabones.",
    },
    {
      id: "M1P1-02",
      enunciado: "¿Cómo se calcula el punto de reorden de un insumo?",
      opciones: [
        "Demanda diaria × tiempo de entrega + stock de seguridad",
        "Inventario máximo − inventario mínimo",
        "Consumo anual ÷ 12 meses",
        "Precio unitario × cantidad mínima de compra",
      ],
      correcta: 0,
      explicacion:
        "El punto de reorden es lo que se consumirá durante el tiempo de entrega del proveedor más el colchón de seguridad. Cuando el inventario toca ese nivel, se emite la orden de compra.",
    },
    {
      id: "M1P1-03",
      enunciado: "¿Para qué sirve el stock de seguridad?",
      opciones: [
        "Para aprovechar descuentos por volumen",
        "Para absorber variaciones de demanda y de tiempo de entrega del proveedor",
        "Para cubrir mercancía dañada durante el transporte",
        "Para sustituir el conteo físico del inventario",
      ],
      correcta: 1,
      explicacion:
        "El stock de seguridad es un colchón contra la incertidumbre: si la demanda sube o el proveedor se retrasa, la operación no se detiene.",
    },
    {
      id: "M1P1-04",
      enunciado: "¿Cuál es el documento con el que arranca formalmente un proceso de compra interno?",
      opciones: ["Orden de compra", "Factura del proveedor", "Requisición de materiales", "Cotización"],
      correcta: 2,
      explicacion:
        "El usuario solicita mediante una requisición; compras convierte esa requisición en cotización, comparación y, finalmente, orden de compra.",
    },
    {
      id: "M1P1-05",
      enunciado: "El término «lead time» se refiere a:",
      opciones: [
        "El tiempo que tarda el cliente en pagar",
        "El tiempo que transcurre entre la orden de compra y la recepción de la mercancía",
        "El tiempo de vida útil del producto",
        "El tiempo que un material permanece en el almacén",
      ],
      correcta: 1,
      explicacion:
        "Lead time es el tiempo de entrega o surtido: del pedido a la recepción. Es uno de los dos insumos del punto de reorden.",
    },
    {
      id: "M1P1-06",
      enunciado: "En una cadena de suministro, el flujo de información se mueve:",
      opciones: [
        "Sólo del proveedor al cliente",
        "Sólo del cliente al proveedor",
        "En ambos sentidos, mientras que el flujo de materiales va del proveedor al cliente",
        "En el mismo sentido que el flujo de dinero, sin excepción",
      ],
      correcta: 2,
      explicacion:
        "La información viaja en dos direcciones (pedidos, pronósticos, avisos de retraso), el material baja de proveedor a cliente y el dinero sube de cliente a proveedor.",
    },
    {
      id: "M1P1-07",
      enunciado: "¿Qué efecto tiene el nearshoring en las compras de una maquiladora de Ciudad Juárez?",
      opciones: [
        "Obliga a importar todos los insumos desde Asia",
        "Elimina la necesidad de evaluar proveedores",
        "Acerca proveedores a la región y reduce el tiempo de entrega, aunque no sustituye todos los insumos importados",
        "Sólo aplica a las empresas de servicios",
      ],
      correcta: 2,
      explicacion:
        "El nearshoring acerca proveedores a la región y acorta el lead time, pero los insumos especializados siguen importándose; por eso se analiza caso por caso.",
    },
    {
      id: "M1P1-08",
      enunciado: "¿Cuál es la diferencia entre logística y cadena de suministro?",
      opciones: [
        "Son sinónimos absolutos",
        "La logística se ocupa del movimiento y almacenamiento de bienes; la cadena de suministro abarca además la coordinación entre empresas, compras, producción y servicio al cliente",
        "La cadena de suministro sólo aplica al comercio internacional",
        "La logística es una función administrativa y la cadena de suministro es un software",
      ],
      correcta: 1,
      explicacion:
        "La logística se concentra en mover y almacenar; la cadena de suministro es la coordinación entre empresas de toda la red, e incluye compras, producción y servicio.",
    },
  ],
});

const Q_M1_P2 = Q({
  clave: "Q-M1-P2",
  modulo: 1,
  parcial: 2,
  submodulo: SUBMODULOS_DGETI[1][1],
  titulo: "Segundo parcial · Del requerimiento a la orden de compra",
  descripcion:
    "Cotizaciones, cuadro comparativo, costo total de propiedad, condiciones de pago, indicadores y ética.",
  preguntas: [
    {
      id: "M1P2-01",
      enunciado: "Antes de decidir a qué proveedor comprar, el cuadro comparativo debe incluir como mínimo:",
      opciones: [
        "Precio, tiempo de entrega, condiciones de pago y garantía",
        "Sólo el precio final con IVA",
        "El nombre del vendedor y su teléfono",
        "La antigüedad de la empresa proveedora",
      ],
      correcta: 0,
      explicacion:
        "Comparar únicamente el precio es el error clásico: dos cotizaciones iguales en precio pueden ser muy distintas en entrega, pago y garantía.",
    },
    {
      id: "M1P2-02",
      enunciado: "En una compra que exige competencia de precios, lo usual es solicitar:",
      opciones: [
        "Una sola cotización para agilizar",
        "Al menos tres cotizaciones de proveedores distintos",
        "Cotizaciones del mismo proveedor con fechas distintas",
        "La lista de precios publicada en internet",
      ],
      correcta: 1,
      explicacion:
        "La regla institucional es cotizar con al menos tres proveedores distintos para poder justificar la decisión con datos.",
    },
    {
      id: "M1P2-03",
      enunciado: "El costo total de propiedad (TCO) de un montacargas incluye:",
      opciones: [
        "Únicamente el precio de lista",
        "Precio, mantenimiento, energía, refacciones, capacitación y valor de rescate",
        "El precio más el IVA de la factura",
        "Sólo los costos del primer año de operación",
      ],
      correcta: 1,
      explicacion:
        "El TCO suma todo lo que cuesta poseer y operar el bien durante su vida útil, menos lo que se recupera al venderlo.",
    },
    {
      id: "M1P2-04",
      enunciado: "Una condición de pago «3/10 neto 30» significa:",
      opciones: [
        "3% de descuento si se paga en 10 días, o el total a 30 días",
        "3 meses de gracia y 10 días de descuento",
        "30% de descuento si se paga en 3 días",
        "Tres pagos iguales cada diez días",
      ],
      correcta: 0,
      explicacion:
        "Es un descuento por pronto pago: 3% si pagas dentro de 10 días; si no, el importe completo a los 30 días.",
    },
    {
      id: "M1P2-05",
      enunciado: "Una orden de compra con subtotal de $10,000 y una tasa de IVA del 16% da un total de:",
      opciones: ["$10,160", "$11,600", "$16,000", "$10,600"],
      correcta: 1,
      explicacion: "IVA = 10,000 × 0.16 = 1,600. Total = 10,000 + 1,600 = $11,600.",
    },
    {
      id: "M1P2-06",
      enunciado: "El indicador OTIF mide:",
      opciones: [
        "El porcentaje de pedidos entregados completos y a tiempo",
        "El tiempo total de operación de la flota",
        "El costo del flete por tonelada",
        "El número de órdenes de compra emitidas en el mes",
      ],
      correcta: 0,
      explicacion:
        "OTIF (On Time In Full) combina puntualidad y completitud: es el porcentaje de pedidos que llegaron a tiempo y con todo lo pedido.",
    },
    {
      id: "M1P2-07",
      enunciado: "Un proveedor ofrece al comprador un viaje con todos los gastos pagados a cambio de mantener el contrato. Según un código de conducta de compras, se debe:",
      opciones: [
        "Aceptar y no comentarlo, porque no es dinero",
        "Rechazar el regalo, declararlo por escrito y evaluar al proveedor con los criterios objetivos",
        "Aceptarlo y asignarle el doble de volumen",
        "Pedir que el regalo sea para todo el departamento",
      ],
      correcta: 1,
      explicacion:
        "Es un conflicto de interés. Se rechaza, se declara y la decisión se toma sólo con los criterios de la matriz de evaluación.",
    },
    {
      id: "M1P2-08",
      enunciado: "En la matriz de evaluación de proveedores, la ponderación sirve para:",
      opciones: [
        "Darle más peso a los criterios que más importan a la empresa, como calidad o entrega",
        "Multiplicar el precio del proveedor",
        "Ordenar alfabéticamente a los proveedores",
        "Calcular el IVA de la compra",
      ],
      correcta: 0,
      explicacion:
        "Ponderar es decidir cuánto vale cada criterio. Sin ponderación, un precio bajo puede ganar aunque la entrega sea mala.",
    },
  ],
});

const Q_M1_P3 = Q({
  clave: "Q-M1-P3",
  modulo: 1,
  parcial: 3,
  submodulo: SUBMODULOS_DGETI[1][1],
  titulo: "Tercer parcial · Compras internacionales y expediente documental",
  descripcion:
    "INCOTERMS, reglas de origen del T-MEC, costo landed, agente aduanal y armado del expediente de compra.",
  preguntas: [
    {
      id: "M1P3-01",
      enunciado: "Bajo el INCOTERM «FOB El Paso», ¿quién paga el flete principal hasta Ciudad Juárez?",
      opciones: [
        "El vendedor, hasta el almacén del comprador",
        "El comprador, a partir de que la mercancía está a bordo en el punto convenido",
        "El agente aduanal",
        "La naviera, como parte del contrato",
      ],
      correcta: 1,
      explicacion:
        "En FOB el vendedor entrega a bordo en el punto convenido y desde ahí el flete y el riesgo corren por cuenta del comprador.",
    },
    {
      id: "M1P3-02",
      enunciado: "Las reglas de origen del T-MEC determinan:",
      opciones: [
        "El puerto por donde debe entrar la mercancía",
        "Si un producto califica para el trato arancelario preferencial según su contenido regional",
        "El nombre del transportista autorizado",
        "El plazo máximo de pago entre las partes",
      ],
      correcta: 1,
      explicacion:
        "Las reglas de origen definen cuánto valor o transformación debe tener el producto dentro de la región para no pagar arancel preferencial.",
    },
    {
      id: "M1P3-03",
      enunciado: "El pedimento es:",
      opciones: [
        "La factura comercial que emite el proveedor",
        "La declaración aduanera con la que se comprueba la estancia legal de la mercancía en el país",
        "El contrato de transporte terrestre",
        "El comprobante de pago del flete",
      ],
      correcta: 1,
      explicacion:
        "El pedimento es la declaración en forma electrónica ante la aduana; acredita que la mercancía cumplió las formalidades del despacho.",
    },
    {
      id: "M1P3-04",
      enunciado: "¿Quién está facultado para promover el despacho aduanero de las mercancías?",
      opciones: [
        "Cualquier empleado del almacén",
        "El agente aduanal o la agencia aduanal autorizada",
        "El transportista que cruza la frontera",
        "El banco que financia la operación",
      ],
      correcta: 1,
      explicacion:
        "El despacho se promueve por conducto de un agente aduanal o agencia aduanal con patente o autorización vigente.",
    },
    {
      id: "M1P3-05",
      enunciado: "El costo «landed» (costo de importar) incluye:",
      opciones: [
        "Sólo el precio de fábrica",
        "Precio, empaque, flete, seguro, contribuciones, honorarios del agente y flete local",
        "El precio y el IVA nacional de la reventa",
        "Sólo las contribuciones aduaneras",
      ],
      correcta: 1,
      explicacion:
        "Landed cost es lo que cuesta poner la mercancía en tu almacén: todo lo anterior suma y es la base para comparar contra el proveedor nacional.",
    },
    {
      id: "M1P3-06",
      enunciado: "El programa IMMEX permite principalmente:",
      opciones: [
        "Importar temporalmente insumos que se transforman y exportan, sin pagar las contribuciones al comercio exterior",
        "Exportar sin pedimento",
        "Vender en el mercado nacional sin pagar impuestos",
        "Contratar transporte internacional sin contrato",
      ],
      correcta: 0,
      explicacion:
        "IMMEX es el régimen de importación temporal para elaborar, transformar o reparar mercancías destinadas a la exportación.",
    },
    {
      id: "M1P3-07",
      enunciado: "El documento que ampara el transporte de mercancías en territorio nacional, con su complemento electrónico, es:",
      opciones: ["La Carta Porte", "El pedimento", "El conocimiento de embarque", "El certificado de origen"],
      correcta: 0,
      explicacion:
        "La Carta Porte ampara el transporte y la tenencia legal de la mercancía durante el traslado en México.",
    },
    {
      id: "M1P3-08",
      enunciado: "La fracción arancelaria sirve para:",
      opciones: [
        "Identificar la mercancía en la tariffa y determinar las contribuciones y regulaciones aplicables",
        "Numerar las cajas dentro del contenedor",
        "Clasificar a los clientes por volumen",
        "Determinar el nombre comercial del producto",
      ],
      correcta: 0,
      explicacion:
        "La fracción arancelaria clasifica la mercancía en la Tarifa de la Ley de los Impuestos Generales de Importación y Exportación; de ahí salen el arancel y las regulaciones no arancelarias.",
    },
  ],
});

/* ========================== MÓDULO II · ALMACÉN ========================== */

const Q_M2_P1 = Q({
  clave: "Q-M2-P1",
  modulo: 2,
  parcial: 1,
  submodulo: SUBMODULOS_DGETI[2][0],
  titulo: "Primer parcial · Recepción de mercancías en almacén",
  descripcion:
    "Andén de recepción, cotejo documental, incidencias de recibo, seguridad del montacargas y registro en Kardex.",
  preguntas: [
    {
      id: "M2P1-01",
      enunciado: "Al llegar la mercancía al andén, el primer paso del almacenista es:",
      opciones: [
        "Acomodarla en el rack más cercano",
        "Cotejar las cantidades y condiciones contra la orden de compra y la factura",
        "Firmar la guía sin revisar",
        "Contar el inventario total del almacén",
      ],
      correcta: 1,
      explicacion:
        "Nada se acomoda ni se firma antes de cotejar. La revisión de recibo es el control que evita pagar mercancía que no llegó.",
    },
    {
      id: "M2P1-02",
      enunciado: "El Kardex registra:",
      opciones: [
        "Sólo las salidas de mercancía",
        "Entradas, salidas y existencias de cada artículo, con fecha y documento de soporte",
        "El nombre de los clientes",
        "Las cotizaciones recibidas",
      ],
      correcta: 1,
      explicacion:
        "El Kardex es el auxiliar de inventarios: cada movimiento de entrada y salida con su saldo y el documento que lo ampara.",
    },
    {
      id: "M2P1-03",
      enunciado: "Llega un contenedor con el sello violado. La acción correcta es:",
      opciones: [
        "Recibir normalmente y avisar al día siguiente",
        "Detener el recibo, reportar la incidencia por escrito y no firmar de conformidad hasta el dictamen",
        "Romper el resto de los sellos para revisar rápido",
        "Devolver el camión sin dejar registro",
      ],
      correcta: 1,
      explicacion:
        "Un sello violado es una incidencia documentable: se detiene, se reporta y se deja constancia antes de firmar la recepción.",
    },
    {
      id: "M2P1-04",
      enunciado: "La mercancía que aún no pasa el control de calidad se coloca en:",
      opciones: [
        "El área de picking",
        "El área de cuarentena o de mercancía en proceso de dictamen",
        "El andén de despacho",
        "El rack de alta rotación",
      ],
      correcta: 1,
      explicacion:
        "La cuarentena separa físicamente lo que todavía no es inventario disponible, para que nadie lo surta por error.",
    },
    {
      id: "M2P1-05",
      enunciado: "Si la factura ampara 100 piezas y se reciben 96, se debe:",
      opciones: [
        "Aceptar las 96 sin decir nada",
        "Registrar la diferencia y emitir el reporte de discrepancia o faltante",
        "Pagar las 100 y reclamar después verbalmente",
        "Rechazar todo el embarque",
      ],
      correcta: 1,
      explicacion:
        "La discrepancia se documenta al momento del recibo; sin ese reporte no hay forma de cobrar el faltante al proveedor o al transportista.",
    },
    {
      id: "M2P1-06",
      enunciado: "Antes de operar un montacargas en el almacén es obligatorio:",
      opciones: [
        "Traer chaleco reflejante, botas con casquillo y contar con la licencia o autorización interna",
        "Sólo saber manejarlo",
        "Pedir permiso verbal al compañero más cercano",
        "Usar guantes de carnaza exclusivamente",
      ],
      correcta: 0,
      explicacion:
        "Equipo de protección personal completo y operador autorizado: es la regla de seguridad que evita la mayoría de los accidentes en andén.",
    },
    {
      id: "M2P1-07",
      enunciado: "El código de barras o SKU de una tarima sirve para:",
      opciones: [
        "Adornar el empaque",
        "Identificar el artículo de forma única y registrar sus movimientos con lector",
        "Sustituir a la factura",
        "Indicar el precio de venta al público",
      ],
      correcta: 1,
      explicacion:
        "El SKU permite registrar entradas, salidas y traslados con lector, lo que elimina la captura manual y sus errores.",
    },
    {
      id: "M2P1-08",
      enunciado: "El método PEPS (primeras entradas, primeras salidas) se usa sobre todo cuando:",
      opciones: [
        "El producto tiene fecha de caducidad o se devalúa con el tiempo",
        "El almacén está automatizado con robots",
        "El producto es de importación definitiva",
        "La rotación es menor a una vez al año",
      ],
      correcta: 0,
      explicacion:
        "PEPS saca primero lo más antiguo, indispensable en perecederos y en productos que pierden valor con el tiempo.",
    },
  ],
});

const Q_M2_P2 = Q({
  clave: "Q-M2-P2",
  modulo: 2,
  parcial: 2,
  submodulo: SUBMODULOS_DGETI[2][1],
  titulo: "Segundo parcial · Organización y acomodo de mercancías",
  descripcion:
    "Clasificación ABC, racks y posiciones, zonificación, WMS, señalización y metodología 5S.",
  preguntas: [
    {
      id: "M2P2-01",
      enunciado: "En la clasificación ABC de inventarios, los artículos «A» se caracterizan por:",
      opciones: [
        "Ser los más baratos y abundantes",
        "Representar el mayor valor acumulado aunque sean pocos artículos, por lo que van en las posiciones más accesibles",
        "Ser los que menos se mueven",
        "Guardarse siempre en el último nivel del rack",
      ],
      correcta: 1,
      explicacion:
        "Por Pareto, pocos artículos concentran la mayor parte del valor y del movimiento; ponerlos cerca del andén reduce tiempos de surtido.",
    },
    {
      id: "M2P2-02",
      enunciado: "La capacidad de carga de un rack se determina por:",
      opciones: [
        "La altura del techo del almacén",
        "La capacidad por nivel y por módulo que especifica el fabricante, sin rebasarla",
        "El peso del montacargas",
        "El número de tarimas que quepan en el piso",
      ],
      correcta: 1,
      explicacion:
        "Cada rack tiene placa de capacidad por nivel y por módulo. Sobrecargarlo deforma la estructura y puede colapsar.",
    },
    {
      id: "M2P2-03",
      enunciado: "La zonificación del almacén consiste en:",
      opciones: [
        "Separar áreas por función: recepción, almacenaje, picking, empaque y despacho",
        "Pintar el piso de colores distintos cada mes",
        "Asignar un pasillo a cada cliente",
        "Distribuir al personal por turnos",
      ],
      correcta: 0,
      explicacion:
        "Zonificar por función evita cruces innecesarios y hace que el flujo de material sea en un solo sentido.",
    },
    {
      id: "M2P2-04",
      enunciado: "La tarima estándar mexicana mide aproximadamente:",
      opciones: ["1.20 × 1.00 m", "0.80 × 0.60 m", "2.40 × 1.20 m", "1.00 × 1.00 m"],
      correcta: 0,
      explicacion:
        "La tarima estándar (tipo GMA en su versión internacional) es de 1.20 × 1.00 m; conocerla permite calcular posiciones y ocupación del rack.",
    },
    {
      id: "M2P2-05",
      enunciado: "Un WMS (Warehouse Management System) sirve para:",
      opciones: [
        "Controlar la nómina del almacén",
        "Dirigir y registrar los movimientos del almacén: ubicaciones, surtido, conteos e inventario en tiempo real",
        "Generar la declaración anual de impuestos",
        "Vigilar el acceso físico del personal",
      ],
      correcta: 1,
      explicacion:
        "El WMS decide dónde guardar, por dónde surtir y qué contar, y mantiene el inventario exacto en tiempo real.",
    },
    {
      id: "M2P2-06",
      enunciado: "Las rutas peatonales dentro del almacén deben:",
      opciones: [
        "Cruzarse con la ruta del montacargas para ahorrar espacio",
        "Estar señalizadas y separadas de la circulación del montacargas",
        "Pasar por debajo de los racks cargados",
        "Compartir el andén de carga sin delimitar",
      ],
      correcta: 1,
      explicacion:
        "Separar peatones y equipos es la medida más efectiva contra atropellamientos; se delimita con pintura, boyas y barreras.",
    },
    {
      id: "M2P2-07",
      enunciado: "La diferencia entre el área de picking y el área de reserva es:",
      opciones: [
        "No hay diferencia",
        "En picking se toman piezas sueltas de alta rotación; en reserva se guarda el excedente en tarimas completas",
        "La reserva es para mercancía dañada",
        "El picking es donde se reciben los camiones",
      ],
      correcta: 1,
      explicacion:
        "El picking es de acceso rápido para surtir pedidos; la reserva guarda el stock en tarima completa que reabastece al picking.",
    },
    {
      id: "M2P2-08",
      enunciado: "La metodología 5S aplicada al almacén busca:",
      opciones: [
        "Clasificar, ordenar, limpiar, estandarizar y sostener el área de trabajo",
        "Reducir el personal en cinco posiciones",
        "Comprar cinco equipos nuevos por año",
        "Registrar cinco movimientos diarios",
      ],
      correcta: 0,
      explicacion:
        "Las 5S (seiri, seiton, seiso, seiketsu, shitsuke) ordenan el espacio físico y sostienen el orden con disciplina.",
    },
  ],
});

const Q_M2_P3 = Q({
  clave: "Q-M2-P3",
  modulo: 2,
  parcial: 3,
  submodulo: SUBMODULOS_DGETI[2][2],
  titulo: "Tercer parcial · Control de inventarios",
  descripcion:
    "Conteo cíclico, rotación, exactitud de registros, merma, inventario en tránsito y cálculo del punto de reorden.",
  preguntas: [
    {
      id: "M2P3-01",
      enunciado: "La ventaja del conteo cíclico frente al conteo físico anual es:",
      opciones: [
        "Se hace una sola vez y se acaba el problema",
        "Se cuenta de forma continua por grupos de artículos, sin detener la operación y detectando errores a tiempo",
        "No requiere personal",
        "Sustituye al Kardex",
      ],
      correcta: 1,
      explicacion:
        "El conteo cíclico reparte el trabajo durante todo el año, priorizando los artículos A, y no exige cerrar el almacén.",
    },
    {
      id: "M2P3-02",
      enunciado: "La rotación de inventario se calcula como:",
      opciones: [
        "Inventario final ÷ ventas",
        "Costo de ventas ÷ inventario promedio",
        "Ventas × margen",
        "Inventario inicial − inventario final",
      ],
      correcta: 1,
      explicacion:
        "Rotación = costo de ventas entre inventario promedio. Entre más alta, menos capital se queda detenido en el almacén.",
    },
    {
      id: "M2P3-03",
      enunciado: "Si en un mes se vendieron 1,200 piezas y el inventario promedio fue de 300 piezas, la rotación mensual es:",
      opciones: ["0.25 veces", "4 veces", "900 veces", "1,500 veces"],
      correcta: 1,
      explicacion: "1,200 ÷ 300 = 4 veces por mes: el inventario se renovó cuatro veces en el periodo.",
    },
    {
      id: "M2P3-04",
      enunciado: "La merma de almacén es:",
      opciones: [
        "La pérdida de mercancía por daño, caducidad, robo o error, que se registra y se da de baja",
        "El descuento que da el proveedor",
        "El costo del flete de devolución",
        "La diferencia entre el precio de lista y el precio real",
      ],
      correcta: 0,
      explicacion:
        "La merma se documenta en acta, se autoriza y se da de baja del inventario; medirla es la única forma de reducirla.",
    },
    {
      id: "M2P3-05",
      enunciado: "El inventario en tránsito es:",
      opciones: [
        "Mercancía que ya salió del almacén del proveedor pero aún no entra al del comprador, y que ya tiene valor contable",
        "Mercancía dañada en el transporte",
        "Inventario que se va a destruir",
        "El inventario de seguridad",
      ],
      correcta: 0,
      explicacion:
        "Mientras viaja, la mercancía sigue siendo inventario y cuesta dinero; por eso las rutas largas encarecen la operación.",
    },
    {
      id: "M2P3-06",
      enunciado: "La exactitud de registros de inventario (ERI) se mide comparando:",
      opciones: [
        "El saldo del sistema contra el conteo físico, artículo por artículo",
        "Las ventas contra el presupuesto",
        "El precio de compra contra el de venta",
        "El número de empleados contra el de turnos",
      ],
      correcta: 0,
      explicacion:
        "ERI = artículos cuyo saldo coincide con el conteo ÷ total de artículos contados. Es el indicador de confiabilidad del almacén.",
    },
    {
      id: "M2P3-07",
      enunciado: "Si la demanda diaria es de 40 piezas, el tiempo de entrega es de 5 días y el stock de seguridad es de 30 piezas, el punto de reorden es:",
      opciones: ["200 piezas", "230 piezas", "170 piezas", "350 piezas"],
      correcta: 1,
      explicacion: "(40 × 5) + 30 = 200 + 30 = 230 piezas. Al llegar a ese nivel se emite la orden de compra.",
    },
    {
      id: "M2P3-08",
      enunciado: "Un agotamiento (stockout) le cuesta a la empresa:",
      opciones: [
        "Nada, porque el cliente espera",
        "Ventas perdidas, producción detenida y daño a la relación con el cliente",
        "Sólo el costo del flete urgente",
        "Únicamente el costo de almacenar más",
      ],
      correcta: 1,
      explicacion:
        "El costo real del agotamiento casi siempre es mayor que el de mantener un poco más de inventario: se pierde la venta y la confianza.",
    },
  ],
});

/* ==================== MÓDULO III · COMERCIO EXTERIOR ==================== */

const Q_M3_P1 = Q({
  clave: "Q-M3-P1",
  modulo: 3,
  parcial: 1,
  submodulo: SUBMODULOS_DGETI[3][0],
  titulo: "Primer parcial · Documentación del despacho aduanero",
  descripcion:
    "Pedimento, documentos del despacho, valor en aduana, regulaciones no arancelarias y semáforo fiscal.",
  preguntas: [
    {
      id: "M3P1-01",
      enunciado: "El pedimento clave «A1» ampara:",
      opciones: [
        "Una importación temporal",
        "Una importación o exportación definitiva",
        "El tránsito interno de mercancías",
        "El depósito fiscal",
      ],
      correcta: 1,
      explicacion: "A1 es la clave de pedimento de las operaciones definitivas de comercio exterior.",
    },
    {
      id: "M3P1-02",
      enunciado: "Los documentos mínimos para un despacho de importación son:",
      opciones: [
        "Factura comercial, documento de transporte, lista de empaque y pedimento",
        "Sólo la factura comercial",
        "El acta constitutiva del importador",
        "La Carta Porte nacional únicamente",
      ],
      correcta: 0,
      explicacion:
        "Sin factura, conocimiento o guía, packing list y pedimento no hay despacho; a eso se suman los certificados que exija la fracción.",
    },
    {
      id: "M3P1-03",
      enunciado: "El valor en aduana de una mercancía importada se integra con:",
      opciones: [
        "El valor de transacción más los gastos incrementables, como flete y seguro",
        "El precio de venta en México",
        "El valor del producto terminado en el mercado",
        "El costo de producción del exportador",
      ],
      correcta: 0,
      explicacion:
        "La base gravable suma al precio pagado los incrementables (fletes, seguros, embalajes, comisiones) hasta el punto de entrada.",
    },
    {
      id: "M3P1-04",
      enunciado: "Las regulaciones no arancelarias son:",
      opciones: [
        "Los impuestos que se pagan en la aduana",
        "Permisos, cuotas, etiquetado (NOM) y otras restricciones que no son impuestos",
        "Los descuentos que otorga el agente aduanal",
        "Las tarifas de las navieras",
      ],
      correcta: 1,
      explicacion:
        "Son restricciones distintas del arancel: permisos previos, normas oficiales de etiquetado e información comercial, cupos, etc.",
    },
    {
      id: "M3P1-05",
      enunciado: "El semáforo fiscal en la aduana determina:",
      opciones: [
        "El color del contenedor",
        "Si la mercancía pasa directo (verde) o se somete a reconocimiento aduanero (rojo)",
        "El monto del flete",
        "El horario del puerto",
      ],
      correcta: 1,
      explicacion:
        "El mecanismo de selección automatizada decide si hay o no reconocimiento físico y documental del embarque.",
    },
    {
      id: "M3P1-06",
      enunciado: "El régimen de depósito fiscal permite:",
      opciones: [
        "Almacenar mercancía extranjera en un almacén autorizado sin pagar todavía las contribuciones al comercio exterior",
        "Destruir mercancía sin permiso",
        "Vender la mercancía en el mercado nacional de inmediato",
        "Guardar mercancía nacional exenta de IVA",
      ],
      correcta: 0,
      explicacion:
        "El depósito fiscal difiere el pago de contribuciones mientras la mercancía permanece en el almacén autorizado.",
    },
    {
      id: "M3P1-07",
      enunciado: "El COVE (Comprobante de Valor Electrónico) se utiliza para:",
      opciones: [
        "Transmitir electrónicamente la información del valor y los datos de la factura a la aduana",
        "Calcular el IVA de la venta final",
        "Registrar la nómina del agente aduanal",
        "Amparar el transporte nacional",
      ],
      correcta: 0,
      explicacion:
        "El COVE transmite de forma electrónica los datos del valor de la mercancía y se asocia al pedimento mediante su acuse.",
    },
    {
      id: "M3P1-08",
      enunciado: "Un dato inexacto en el pedimento puede provocar:",
      opciones: [
        "Nada, porque se corrige después sin consecuencia",
        "Multas, retención de la mercancía e incluso el embargo precautorio",
        "Un descuento en las contribuciones",
        "La devolución automática del flete",
      ],
      correcta: 1,
      explicacion:
        "Las inexactitudes en los datos del pedimento se sancionan con multas y pueden derivar en el embargo de la mercancía.",
    },
  ],
});

const Q_M3_P2 = Q({
  clave: "Q-M3-P2",
  modulo: 3,
  parcial: 2,
  submodulo: SUBMODULOS_DGETI[3][1],
  titulo: "Segundo parcial · Transportación internacional de mercancías",
  descripcion:
    "Modos de transporte, contenedores, conocimiento de embarque, carga consolidada e INCOTERMS.",
  preguntas: [
    {
      id: "M3P2-01",
      enunciado: "En términos generales, el orden de menor a mayor costo por tonelada-kilómetro en transporte de carga es:",
      opciones: [
        "Marítimo, ferroviario, carretero, aéreo",
        "Aéreo, carretero, ferroviario, marítimo",
        "Carretero, marítimo, aéreo, ferroviario",
        "Ferroviario, aéreo, marítimo, carretero",
      ],
      correcta: 0,
      explicacion:
        "El marítimo es el más barato por tonelada y el más lento; el aéreo es el más caro y el más rápido.",
    },
    {
      id: "M3P2-02",
      enunciado: "El Bill of Lading (B/L) es:",
      opciones: [
        "El comprobante de pago del flete marítimo",
        "El documento de transporte marítimo que acredita el contrato, el recibo de la mercancía y el título de su propiedad",
        "La factura del exportador",
        "El certificado de origen",
      ],
      correcta: 1,
      explicacion:
        "El B/L cumple tres funciones: contrato de transporte, recibo de la mercancía y título que acredita quién puede disponer de ella.",
    },
    {
      id: "M3P2-03",
      enunciado: "Un contenedor de 20 pies tiene una capacidad de carga aproximada de:",
      opciones: ["10 toneladas", "21 a 28 toneladas según el tipo", "50 toneladas", "5 toneladas"],
      correcta: 1,
      explicacion:
        "Un contenedor estándar de 20 pies admite alrededor de 21 a 28 toneladas de carga útil según su versión; el de 40 pies transporta más volumen, no mucho más peso.",
    },
    {
      id: "M3P2-04",
      enunciado: "La unidad TEU equivale a:",
      opciones: [
        "Una tonelada de carga",
        "Un contenedor de 20 pies",
        "Un metro cúbico",
        "Una tarima estándar",
      ],
      correcta: 1,
      explicacion: "TEU (Twenty-foot Equivalent Unit) es la unidad con la que se mide la capacidad de buques y puertos.",
    },
    {
      id: "M3P2-05",
      enunciado: "La diferencia entre FCL y LCL es:",
      opciones: [
        "FCL es contenedor completo para un solo embarcador; LCL es carga consolidada que comparte contenedor",
        "FCL es aéreo y LCL marítimo",
        "FCL es nacional y LCL internacional",
        "No existe diferencia",
      ],
      correcta: 0,
      explicacion:
        "Full Container Load usa el contenedor completo; Less than Container Load consolida carga de varios embarcadores y paga por volumen.",
    },
    {
      id: "M3P2-06",
      enunciado: "La «aduana de despacho» es:",
      opciones: [
        "La aduana donde se presenta el pedimento y se realiza el despacho, que puede ser interior si hay tráfico ferroviario o carretero autorizado",
        "La aduana del puerto de destino final",
        "La oficina del agente aduanal",
        "La bodega del importador",
      ],
      correcta: 0,
      explicacion:
        "El despacho puede hacerse en una aduana fronteriza o en una interior autorizada para el tránsito de mercancías.",
    },
    {
      id: "M3P2-07",
      enunciado: "Bajo el INCOTERM CIF, el vendedor paga:",
      opciones: [
        "Sólo la carga en su planta",
        "El flete principal y el seguro hasta el puerto de destino convenido",
        "El despacho aduanero de importación",
        "La entrega final en el almacén del comprador",
      ],
      correcta: 1,
      explicacion:
        "CIF obliga al vendedor a contratar y pagar el flete y el seguro hasta el puerto de destino; el riesgo se transmite al cargar la mercancía a bordo.",
    },
    {
      id: "M3P2-08",
      enunciado: "El transporte multimodal se caracteriza por:",
      opciones: [
        "Usar un solo modo de transporte en todo el recorrido",
        "Combinar dos o más modos bajo un único contrato y un solo operador responsable",
        "Requerir siempre cruce fronterizo",
        "Ser exclusivo de productos perecederos",
      ],
      correcta: 1,
      explicacion:
        "En el multimodal hay un solo contrato y un operador de transporte multimodal que responde por todo el recorrido aunque use varios modos.",
    },
  ],
});

const Q_M3_P3 = Q({
  clave: "Q-M3-P3",
  modulo: 3,
  parcial: 3,
  submodulo: SUBMODULOS_DGETI[3][0],
  titulo: "Tercer parcial · Contribuciones, regímenes y control del comercio exterior",
  descripcion:
    "IGI, DTA, IVA en importación, certificado de origen, control de inventarios IMMEX y regímenes aduaneros.",
  preguntas: [
    {
      id: "M3P3-01",
      enunciado: "¿Qué es el IGI que se determina en una importación definitiva?",
      opciones: [
        "El Impuesto General de Importación, determinado por la fracción arancelaria de la mercancía",
        "El Impuesto General Interno",
        "Un derecho portuario",
        "El impuesto sobre la renta del importador",
      ],
      correcta: 0,
      explicacion:
        "El IGI se calcula aplicando la tasa de la fracción arancelaria al valor en aduana de la mercancía.",
    },
    {
      id: "M3P3-02",
      enunciado: "El Derecho de Trámite Aduanero (DTA) en importación definitiva se calcula, por regla general, como:",
      opciones: [
        "Una cuota fija por caja",
        "El 8 al millar sobre el valor en aduana de la mercancía",
        "El 16% del valor en aduana",
        "Un porcentaje sobre el flete nacional",
      ],
      correcta: 1,
      explicacion:
        "El DTA por importación definitiva se determina con la tasa del 8 al millar sobre el valor en aduana.",
    },
    {
      id: "M3P3-03",
      enunciado: "En una importación definitiva, el IVA se calcula sobre:",
      opciones: [
        "Sólo el precio de la mercancía",
        "El valor en aduana más el IGI y demás contribuciones que se causen en la importación",
        "El flete internacional únicamente",
        "El precio de reventa en México",
      ],
      correcta: 1,
      explicacion:
        "La base del IVA de importación incluye el valor en aduana y las contribuciones causadas en la propia operación.",
    },
    {
      id: "M3P3-04",
      enunciado: "El certificado de origen sirve para:",
      opciones: [
        "Acreditar el país de producción de la mercancía y, con ello, aplicar preferencias arancelarias",
        "Comprobar el pago del flete",
        "Garantizar la calidad del producto",
        "Autorizar el uso de la marca",
      ],
      correcta: 0,
      explicacion:
        "Sin certificado de origen no se puede aplicar el trato preferencial del tratado, aunque la mercancía sí sea originaria.",
    },
    {
      id: "M3P3-05",
      enunciado: "Una empresa IMMEX debe llevar un control de inventarios que permita:",
      opciones: [
        "Registrar las importaciones temporales, las mermas y las exportaciones, y demostrar que la mercancía retornó",
        "Registrar únicamente las ventas nacionales",
        "Calcular la nómina del personal",
        "Sustituir el pedimento",
      ],
      correcta: 0,
      explicacion:
        "El control de inventarios en forma automatizada es obligación del programa IMMEX y es lo que acredita el retorno de los insumos.",
    },
    {
      id: "M3P3-06",
      enunciado: "Un recinto fiscalizado estratégico permite:",
      opciones: [
        "Ingresar, almacenar, custodiar, exhibir y transformar mercancías bajo régimen fiscal, cerca de los centros de consumo",
        "Evitar todo trámite aduanero",
        "Exportar sin declaración",
        "Vender al menudeo sin IVA",
      ],
      correcta: 0,
      explicacion:
        "Los recintos fiscalizados estratégicos concentran operaciones logísticas y de transformación con facilidades de despacho.",
    },
    {
      id: "M3P3-07",
      enunciado: "El régimen de tránsito de mercancías se usa cuando:",
      opciones: [
        "La mercancía se traslada de una aduana a otra bajo control fiscal, sin pagar contribuciones en el punto de entrada",
        "La mercancía se destruye",
        "La mercancía se vende en la frontera",
        "La mercancía se queda definitivamente en el país",
      ],
      correcta: 0,
      explicacion:
        "El tránsito interno o externo mueve la mercancía bajo control fiscal hacia la aduana donde se hará el despacho definitivo.",
    },
    {
      id: "M3P3-08",
      enunciado: "La rectificación de un pedimento procede:",
      opciones: [
        "Nunca, los pedimentos son inmodificables",
        "Antes del mecanismo de selección automatizada o, en los casos previstos, después del despacho, con los requisitos que marca la ley",
        "Sólo cuando lo autoriza el transportista",
        "Únicamente por orden judicial",
      ],
      correcta: 1,
      explicacion:
        "La ley permite rectificar en ciertos momentos y supuestos; hacerlo a tiempo evita multas mayores.",
    },
  ],
});

/* ==================== MÓDULO IV · DISTRIBUCIÓN FÍSICA ==================== */

const Q_M4_P1 = Q({
  clave: "Q-M4-P1",
  modulo: 4,
  parcial: 1,
  submodulo: SUBMODULOS_DGETI[4][0],
  titulo: "Primer parcial · Distribución física y última milla",
  descripcion:
    "Rutas, ventanas de entrega, cross-docking, consolidación, prueba de entrega y costo por entrega.",
  preguntas: [
    {
      id: "M4P1-01",
      enunciado: "La «última milla» suele ser la etapa más cara de la distribución porque:",
      opciones: [
        "Los camiones recorren menos kilómetros",
        "Se hacen muchas paradas cortas, con tráfico, esperas y entregas individuales",
        "Se transporta en avión",
        "La mercancía se asegura por doble de su valor",
      ],
      correcta: 1,
      explicacion:
        "Cada entrega individual consume tiempo y combustible; por eso la última milla puede representar una parte muy grande del costo logístico total.",
    },
    {
      id: "M4P1-02",
      enunciado: "El cross-docking consiste en:",
      opciones: [
        "Almacenar la mercancía por lo menos un mes antes de venderla",
        "Recibir la mercancía en el andén y despacharla casi de inmediato, sin almacenarla",
        "Cruzar la frontera con doble factura",
        "Consolidar inventario obsoleto",
      ],
      correcta: 1,
      explicacion:
        "En cross-docking el producto pasa del andén de recepción al de despacho en pocas horas, lo que reduce inventario y costo de almacenaje.",
    },
    {
      id: "M4P1-03",
      enunciado: "Una ventana de entrega es:",
      opciones: [
        "El horario pactado con el cliente dentro del cual debe llegar el embarque",
        "La ventanilla de atención al cliente",
        "El espacio físico del andén",
        "El tiempo de descarga del camión",
      ],
      correcta: 0,
      explicacion:
        "Si se llega antes o después de la ventana, normalmente hay que esperar o se rechaza la entrega, y ambas cosas cuestan.",
    },
    {
      id: "M4P1-04",
      enunciado: "La prueba de entrega (POD) debe incluir:",
      opciones: [
        "Nombre y firma de quien recibe, fecha y hora, y el estado de la mercancía",
        "Sólo la firma del conductor",
        "Una fotografía del camión",
        "El precio de venta del producto",
      ],
      correcta: 0,
      explicacion:
        "La POD es la evidencia con la que se cobra el servicio y se resuelven reclamaciones: quién recibió, cuándo y en qué condiciones.",
    },
    {
      id: "M4P1-05",
      enunciado: "Consolidar pedidos significa:",
      opciones: [
        "Separar cada pedido en un camión distinto",
        "Juntar varios pedidos con destino cercano en un mismo viaje para bajar el costo por entrega",
        "Cancelar los pedidos pequeños",
        "Aumentar el precio del flete",
      ],
      correcta: 1,
      explicacion:
        "Consolidar aprovecha la capacidad de la unidad y reduce el costo por entrega; es la primera palanca de ahorro en distribución.",
    },
    {
      id: "M4P1-06",
      enunciado: "Si una ruta hace 62 entregas en un día con un costo operativo de $4,650, el costo por entrega es:",
      opciones: ["$75", "$13.30", "$133", "$46.50"],
      correcta: 0,
      explicacion: "4,650 ÷ 62 = $75 por entrega. Ese número es el que se usa para fijar la tarifa de última milla.",
    },
    {
      id: "M4P1-07",
      enunciado: "Zonificar por código postal en la última milla permite:",
      opciones: [
        "Fijar tarifas distintas por distancia y asignar rutas más cortas y estables",
        "Evitar el pago de impuestos",
        "Eliminar la necesidad de POD",
        "Sustituir el sistema de rastreo",
      ],
      correcta: 0,
      explicacion:
        "La zonificación agrupa entregas cercanas, acorta recorridos y sirve de base para tarifas diferenciadas.",
    },
    {
      id: "M4P1-08",
      enunciado: "El indicador «entregas a tiempo» se calcula como:",
      opciones: [
        "Entregas dentro de la ventana ÷ total de entregas × 100",
        "Total de entregas ÷ kilómetros recorridos",
        "Entregas rechazadas ÷ entregas intentadas",
        "Costo total ÷ número de clientes",
      ],
      correcta: 0,
      explicacion:
        "Es un porcentaje de cumplimiento: entregas dentro de la ventana sobre el total de entregas realizadas.",
    },
  ],
});

const Q_M4_P2 = Q({
  clave: "Q-M4-P2",
  modulo: 4,
  parcial: 2,
  submodulo: SUBMODULOS_DGETI[4][1],
  titulo: "Segundo parcial · Servicio al cliente y logística inversa",
  descripcion:
    "Nivel de servicio, devoluciones y garantías, reacondicionamiento, trazabilidad y medición de la satisfacción.",
  preguntas: [
    {
      id: "M4P2-01",
      enunciado: "El «fill rate» o nivel de servicio mide:",
      opciones: [
        "El porcentaje de la demanda del cliente que se satisface con el inventario disponible en el primer pedido",
        "El llenado físico del contenedor",
        "El número de quejas recibidas",
        "El tiempo de carga del camión",
      ],
      correcta: 0,
      explicacion:
        "Fill rate es la proporción de lo pedido que se entrega a la primera; lo que falta se convierte en pedido pendiente o venta perdida.",
    },
    {
      id: "M4P2-02",
      enunciado: "La logística inversa se ocupa de:",
      opciones: [
        "Transportar la mercancía en sentido contrario por capricho del cliente",
        "El flujo de regreso de productos: devoluciones, garantías, excedentes y retornos para reuso o disposición",
        "Entregar más tarde de lo prometido",
        "Almacenar mercancía en otro país",
      ],
      correcta: 1,
      explicacion:
        "La logística inversa gestiona el retorno de bienes para su reuso, reacondicionamiento, reciclaje o disposición final.",
    },
    {
      id: "M4P2-03",
      enunciado: "El primer paso correcto ante una devolución por garantía es:",
      opciones: [
        "Rechazarla siempre",
        "Registrarla con folio, evidencias y motivo, para después emitir el dictamen",
        "Reembolsar de inmediato sin revisar",
        "Guardarla en el almacén sin registrar",
      ],
      correcta: 1,
      explicacion:
        "Sin registro con folio y evidencia no hay dictamen posible ni forma de cobrarle al proveedor o al transportista responsable.",
    },
    {
      id: "M4P2-04",
      enunciado: "Reacondicionar un producto devuelto significa:",
      opciones: [
        "Destruirlo",
        "Inspeccionarlo, repararlo o reempacarlo para que pueda volver a venderse o usarse",
        "Venderlo como chatarra",
        "Regresarlo al proveedor sin revisión",
      ],
      correcta: 1,
      explicacion:
        "El reacondicionamiento recupera valor: lo que se repara y reempaca deja de ser pérdida.",
    },
    {
      id: "M4P2-05",
      enunciado: "La trazabilidad de un envío permite:",
      opciones: [
        "Conocer en todo momento dónde está la mercancía, quién la tiene y en qué estado",
        "Calcular el impuesto del envío",
        "Sustituir la factura",
        "Negociar el precio con el cliente",
      ],
      correcta: 0,
      explicacion:
        "Trazabilidad es seguir el producto a lo largo de la cadena con eventos fechados; es lo que sostiene el rastreo GPS de la plataforma.",
    },
    {
      id: "M4P2-06",
      enunciado: "El NPS (Net Promoter Score) se obtiene:",
      opciones: [
        "Restando el porcentaje de detractores al porcentaje de promotores, con base en la disposición a recomendar",
        "Sumando todas las ventas del mes",
        "Dividiendo el costo del servicio entre los clientes",
        "Contando el número de entregas",
      ],
      correcta: 0,
      explicacion:
        "NPS = % promotores − % detractores. Es un indicador simple de lealtad y de percepción del servicio.",
    },
    {
      id: "M4P2-07",
      enunciado: "Cuando un cliente reporta que su pedido no llegó, la primera acción del área de servicio es:",
      opciones: [
        "Pedirle que espere una semana",
        "Verificar el rastreo y la POD, abrir folio de incidencia y dar una respuesta con plazo",
        "Culpar al transportista y cerrar el caso",
        "Reenviar otro pedido sin investigar",
      ],
      correcta: 1,
      explicacion:
        "Se confirma con datos (rastreo y POD), se abre folio y se compromete un plazo: así se sostiene la confianza del cliente.",
    },
    {
      id: "M4P2-08",
      enunciado: "Una entrega fallida (cliente ausente) genera:",
      opciones: [
        "Ningún costo adicional",
        "Un segundo viaje, más combustible, más tiempo y riesgo de que el cliente cancele",
        "Un descuento automático",
        "Una mejora en el indicador OTIF",
      ],
      correcta: 1,
      explicacion:
        "La entrega fallida duplica el costo de la última milla; por eso se usan citas previas y confirmaciones por mensaje.",
    },
  ],
});

const Q_M4_P3 = Q({
  clave: "Q-M4-P3",
  modulo: 4,
  parcial: 3,
  submodulo: SUBMODULOS_DGETI[4][0],
  titulo: "Tercer parcial · Rastreo, torre de control e indicadores de entrega",
  descripcion:
    "Geolocalización, geocercas, incidencias en ruta, torre de control y cálculo de indicadores operativos.",
  preguntas: [
    {
      id: "M4P3-01",
      enunciado: "Un equipo GPS entrega como mínimo:",
      opciones: [
        "Sólo la velocidad del vehículo",
        "Latitud, longitud, hora y velocidad del punto donde se encuentra la unidad",
        "El peso de la carga",
        "El consumo de diésel",
      ],
      correcta: 1,
      explicacion:
        "Con latitud, longitud, hora y velocidad se reconstruye el recorrido completo y se detectan desviaciones.",
    },
    {
      id: "M4P3-02",
      enunciado: "Una geocerca es:",
      opciones: [
        "Una barda física alrededor del almacén",
        "Un área virtual definida en el mapa que dispara una alerta cuando la unidad entra o sale de ella",
        "Un sistema de pesaje",
        "Un tipo de contenedor",
      ],
      correcta: 1,
      explicacion:
        "La geocerca convierte la posición en un evento: llegada, salida o desvío, sin que nadie tenga que estar mirando el mapa.",
    },
    {
      id: "M4P3-03",
      enunciado: "Ante una incidencia en ruta (ponchadura, bloqueo o falla), lo primero es:",
      opciones: [
        "Esperar a que el operador resuelva solo",
        "Registrar el evento con hora y ubicación, informar al cliente si afecta la ventana y definir un nuevo compromiso",
        "Borrar el evento del sistema",
        "Cancelar el embarque completo",
      ],
      correcta: 1,
      explicacion:
        "La incidencia registrada con hora y posición protege a todos y permite recalcular la promesa de entrega.",
    },
    {
      id: "M4P3-04",
      enunciado: "Una torre de control logístico sirve para:",
      opciones: [
        "Vigilar el acceso del personal al edificio",
        "Monitorear en tiempo real los embarques, detectar desviaciones y coordinar la respuesta",
        "Emitir las facturas del mes",
        "Controlar el inventario físico",
      ],
      correcta: 1,
      explicacion:
        "La torre de control centraliza la visibilidad de todos los embarques y actúa cuando algo se sale de lo planeado.",
    },
    {
      id: "M4P3-05",
      enunciado: "Si en el mes se hicieron 480 entregas y 444 llegaron dentro de la ventana, el indicador de entregas a tiempo es:",
      opciones: ["92.5%", "85%", "96%", "88%"],
      correcta: 0,
      explicacion: "444 ÷ 480 = 0.925 → 92.5% de entregas a tiempo.",
    },
    {
      id: "M4P3-06",
      enunciado: "La ventaja de una prueba de entrega digital con fotografía y firma en pantalla es:",
      opciones: [
        "Que cuesta más que el papel",
        "Que queda disponible de inmediato para facturar y para resolver reclamaciones",
        "Que sustituye al rastreo GPS",
        "Que evita pagar impuestos",
      ],
      correcta: 1,
      explicacion:
        "La POD digital se consulta al instante, acorta el ciclo de cobranza y documenta el estado de la mercancía al entregar.",
    },
    {
      id: "M4P3-07",
      enunciado: "El rastreo en modo «GPS real» a diferencia del «simulado» se caracteriza porque:",
      opciones: [
        "La posición la envía el dispositivo del operador en ruta, no la calcula la ruta planeada",
        "No requiere internet",
        "No registra eventos",
        "Sólo funciona dentro del almacén",
      ],
      correcta: 0,
      explicacion:
        "En GPS real la posición proviene del celular del operador; en simulado la plataforma la calcula avanzando sobre la ruta planeada.",
    },
    {
      id: "M4P3-08",
      enunciado: "Un checkpoint de la ruta sirve para:",
      opciones: [
        "Marcar puntos de control donde se verifica avance, documentación o condiciones de la carga",
        "Detener el embarque definitivamente",
        "Cobrar peaje",
        "Cambiar de proveedor",
      ],
      correcta: 0,
      explicacion:
        "Los checkpoints convierten un viaje largo en tramos verificables y son los que alimentan la línea de tiempo del rastreo.",
    },
  ],
});

/* ====================== MÓDULO V · COSTOS ====================== */

const Q_M5_P1 = Q({
  clave: "Q-M5-P1",
  modulo: 5,
  parcial: 1,
  submodulo: SUBMODULOS_DGETI[5][0],
  titulo: "Primer parcial · Costos directos e indirectos de la operación logística",
  descripcion:
    "Costos fijos y variables, costo por tarima, mano de obra, depreciación, prorrateo y ABC costing.",
  preguntas: [
    {
      id: "M5P1-01",
      enunciado: "Un costo directo es aquel que:",
      opciones: [
        "Se identifica y asigna sin dificultad al servicio o producto que lo genera",
        "Se paga siempre con cheque",
        "No cambia con el volumen",
        "Lo autoriza la dirección general",
      ],
      correcta: 0,
      explicacion:
        "Directo se asigna directamente (el diésel de ese viaje); indirecto hay que prorratearlo (la renta del almacén entre varios servicios).",
    },
    {
      id: "M5P1-02",
      enunciado: "La renta del almacén es, normalmente:",
      opciones: ["Un costo variable", "Un costo fijo", "Una inversión de capital", "Un gasto financiero"],
      correcta: 1,
      explicacion:
        "La renta no cambia con el volumen manejado en el mes: es el ejemplo clásico de costo fijo de la operación.",
    },
    {
      id: "M5P1-03",
      enunciado: "Si el costo mensual de operar el almacén es de $180,000 y se manejan 1,200 tarimas, el costo por tarima es:",
      opciones: ["$150", "$1,500", "$216", "$60"],
      correcta: 0,
      explicacion: "180,000 ÷ 1,200 = $150 por tarima al mes. Ese dato es la base de la tarifa de almacenaje.",
    },
    {
      id: "M5P1-04",
      enunciado: "La depreciación de un montacargas de $480,000 con vida útil de 8 años y valor de rescate nulo es, en línea recta:",
      opciones: ["$60,000 por año", "$48,000 por año", "$4,000 por año", "$96,000 por año"],
      correcta: 0,
      explicacion: "480,000 ÷ 8 = $60,000 anuales. Convertido a horas de operación, se integra en la tarifa del servicio.",
    },
    {
      id: "M5P1-05",
      enunciado: "Prorratear un costo indirecto significa:",
      opciones: [
        "Repartirlo entre los servicios o productos que lo usan, con una base objetiva como volumen o ingresos",
        "Eliminarlo del presupuesto",
        "Cobrárselo completo al cliente más grande",
        "Diferirlo al siguiente ejercicio",
      ],
      correcta: 0,
      explicacion:
        "La base de prorrateo (volumen, horas, metros cuadrados, ingresos) define cuánto carga cada servicio; cambiar la base cambia la tarifa.",
    },
    {
      id: "M5P1-06",
      enunciado: "Si un operador gana $220 por hora y en una jornada de 8 horas surte 55 pedidos, el costo de mano de obra por pedido es:",
      opciones: ["$32", "$4", "$27.50", "$17.60"],
      correcta: 0,
      explicacion: "220 × 8 = 1,760; 1,760 ÷ 55 = $32 de mano de obra por pedido.",
    },
    {
      id: "M5P1-07",
      enunciado: "Con un rendimiento de 3.2 km por litro y un diésel a $24.50 el litro, el costo de combustible por kilómetro es aproximadamente:",
      opciones: ["$7.66", "$3.20", "$24.50", "$78.40"],
      correcta: 0,
      explicacion: "24.50 ÷ 3.2 = $7.66 por kilómetro. Multiplicado por los kilómetros de la ruta da el combustible del viaje.",
    },
    {
      id: "M5P1-08",
      enunciado: "El costeo basado en actividades (ABC) se diferencia del tradicional porque:",
      opciones: [
        "Asigna los costos indirectos a las actividades que los provocan, usando inductores de costo",
        "No toma en cuenta los costos directos",
        "Se calcula sólo una vez al año",
        "Sólo aplica a empresas de servicios financieros",
      ],
      correcta: 0,
      explicacion:
        "ABC reparte los indirectos por actividad (recepción, acomodo, surtido, embalaje, despacho) con su propio inductor, y revela qué actividad es cara.",
    },
  ],
});

const Q_M5_P2 = Q({
  clave: "Q-M5-P2",
  modulo: 5,
  parcial: 2,
  submodulo: SUBMODULOS_DGETI[5][1],
  titulo: "Segundo parcial · Presupuesto y punto de equilibrio",
  descripcion:
    "Punto de equilibrio, margen contra markup, presupuesto flexible, desviaciones, capex y escenarios.",
  preguntas: [
    {
      id: "M5P2-01",
      enunciado: "El punto de equilibrio en unidades se calcula como:",
      opciones: [
        "Costos fijos ÷ (precio de venta − costo variable unitario)",
        "Costos variables ÷ precio de venta",
        "Precio de venta × margen",
        "Costos fijos × costos variables",
      ],
      correcta: 0,
      explicacion:
        "PE = CF ÷ (P − CVu). Abajo de ese volumen se pierde; arriba, cada unidad aporta su margen de contribución a la utilidad.",
    },
    {
      id: "M5P2-02",
      enunciado: "Con costos fijos de $90,000, precio de $450 por servicio y costo variable de $300, el punto de equilibrio es:",
      opciones: ["600 servicios", "200 servicios", "300 servicios", "900 servicios"],
      correcta: 0,
      explicacion: "90,000 ÷ (450 − 300) = 90,000 ÷ 150 = 600 servicios al mes.",
    },
    {
      id: "M5P2-03",
      enunciado: "Un servicio cuesta $800 y se vende en $1,000. El margen sobre el precio es:",
      opciones: ["25%", "20%", "80%", "15%"],
      correcta: 1,
      explicacion:
        "Margen = utilidad ÷ precio = 200 ÷ 1,000 = 20%. El markup sería 25% (200 ÷ 800): confundirlos es el error clásico al cotizar.",
    },
    {
      id: "M5P2-04",
      enunciado: "Un presupuesto flexible se caracteriza porque:",
      opciones: [
        "Se ajusta automáticamente según el volumen real de operación",
        "Se puede rebasar sin autorización",
        "Se elabora sin datos históricos",
        "Sólo incluye los ingresos",
      ],
      correcta: 0,
      explicacion:
        "El presupuesto flexible recalcula los costos variables al volumen real, lo que permite comparar de forma justa contra lo ejecutado.",
    },
    {
      id: "M5P2-05",
      enunciado: "Una desviación presupuestal «en precio» significa que:",
      opciones: [
        "Se pagó un precio unitario distinto al presupuestado, aunque el volumen fuera el previsto",
        "Se manejó más volumen del previsto",
        "El personal fue más lento",
        "Se cobró antes de tiempo",
      ],
      correcta: 0,
      explicacion:
        "Las desviaciones se separan en precio, volumen y eficiencia; sólo así se sabe a quién pedir la corrección.",
    },
    {
      id: "M5P2-06",
      enunciado: "Comprar una flotilla propia es una decisión de tipo:",
      opciones: ["Opex (gasto operativo)", "Capex (inversión de capital)", "Costo hundido", "Gasto financiero"],
      correcta: 1,
      explicacion:
        "Comprar activos es capex e implica depreciación y riesgo; rentar a un 3PL convierte ese gasto en opex y da flexibilidad.",
    },
    {
      id: "M5P2-07",
      enunciado: "Construir escenarios base, optimista y pesimista sirve para:",
      opciones: [
        "Conocer el rango de resultados ante cambios de volumen y de precio del combustible",
        "Cumplir un trámite fiscal",
        "Eliminar la necesidad de presupuesto",
        "Sustituir el control de inventarios",
      ],
      correcta: 0,
      explicacion:
        "Los escenarios muestran el rango de riesgo: cuál es el peor resultado posible y qué palanca lo mueve más.",
    },
    {
      id: "M5P2-08",
      enunciado: "Si los clientes pagan a 60 días y los proveedores cobran a 30, la empresa:",
      opciones: [
        "Necesita financiar 30 días de operación con capital de trabajo",
        "No tiene ningún problema de efectivo",
        "Debe cobrar intereses a sus proveedores",
        "Puede duplicar su inventario sin costo",
      ],
      correcta: 0,
      explicacion:
        "La brecha entre cobrar y pagar se financia con capital de trabajo; si no se planea, la empresa se descapitaliza aunque venda bien.",
    },
  ],
});

const Q_M5_P3 = Q({
  clave: "Q-M5-P3",
  modulo: 5,
  parcial: 3,
  submodulo: SUBMODULOS_DGETI[5][1],
  titulo: "Tercer parcial · Liquidación, auditoría de fletes e indicadores financieros",
  descripcion:
    "Liquidación pactado contra real, sobrecargos, auditoría de facturas, KPI financieros y costo logístico sobre venta.",
  preguntas: [
    {
      id: "M5P3-01",
      enunciado: "La liquidación de un servicio logístico consiste en:",
      opciones: [
        "Comparar lo pactado contra lo realmente ejecutado y facturar o devolver la diferencia justificada",
        "Pagar siempre el monto máximo del contrato",
        "Cerrar la cuenta del cliente",
        "Vender los activos de la operación",
      ],
      correcta: 0,
      explicacion:
        "La liquidación cuadra el contrato con la operación real: servicios extras, demoras y penalizaciones se documentan una por una.",
    },
    {
      id: "M5P3-02",
      enunciado: "En una auditoría de facturas de flete se revisa, entre otras cosas:",
      opciones: [
        "Que la tarifa aplicada, los kilómetros declarados y los sobrecargos coincidan con lo pactado",
        "El color de las unidades",
        "La antigüedad de los conductores",
        "El nombre comercial del cliente final",
      ],
      correcta: 0,
      explicacion:
        "Los errores más comunes están en la tarifa aplicada, los kilómetros de más y los sobrecargos no autorizados; ahí se recupera dinero.",
    },
    {
      id: "M5P3-03",
      enunciado: "El «fuel surcharge» es:",
      opciones: [
        "Un sobrecargo ligado al precio del combustible, que debe tener fórmula y tope pactados",
        "Un impuesto federal",
        "El costo del mantenimiento preventivo",
        "Una multa por retraso",
      ],
      correcta: 0,
      explicacion:
        "Es un ajuste por combustible; si no se pacta la fórmula y el tope, se convierte en una fuga de dinero difícil de auditar.",
    },
    {
      id: "M5P3-04",
      enunciado: "Un embarque de 1,250 km con un costo total de $18,750 tiene un costo por kilómetro de:",
      opciones: ["$15", "$1.5", "$23.4", "$150"],
      correcta: 0,
      explicacion: "18,750 ÷ 1,250 = $15 por kilómetro. Con ese dato se cotizan rutas equivalentes.",
    },
    {
      id: "M5P3-05",
      enunciado: "El indicador «costo logístico como porcentaje de la venta» se usa para:",
      opciones: [
        "Comparar la eficiencia logística de un periodo contra otro o contra el mercado",
        "Calcular el IVA",
        "Determinar el sueldo del personal",
        "Fijar el punto de reorden",
      ],
      correcta: 0,
      explicacion:
        "Es el indicador de referencia para saber si la operación mejora o empeora y cómo se compara con el sector.",
    },
    {
      id: "M5P3-06",
      enunciado: "Si la venta mensual es de $2,400,000 y el costo logístico total de $288,000, el costo logístico representa:",
      opciones: ["12% de la venta", "8% de la venta", "15% de la venta", "1.2% de la venta"],
      correcta: 0,
      explicacion: "288,000 ÷ 2,400,000 = 0.12 → 12% de la venta.",
    },
    {
      id: "M5P3-07",
      enunciado: "Al auditar diez facturas de flete se detectan $37,500 cobrados de más. La acción correcta es:",
      opciones: [
        "Aceptarlas para no pelear con el transportista",
        "Emitir la nota de cargo con el detalle por factura y recuperar el importe en la siguiente liquidación",
        "Dejar de usar al transportista sin documento",
        "Repartir el importe entre los clientes",
      ],
      correcta: 1,
      explicacion:
        "La recuperación se documenta con nota de cargo y detalle factura por factura; sin ese papel no se recupera nada.",
    },
    {
      id: "M5P3-08",
      enunciado: "Antes de cotizar un servicio nuevo, el orden correcto de cálculo es:",
      opciones: [
        "Costos directos, prorrateo de indirectos, margen, IVA y precio final",
        "Precio final, IVA y después ver si alcanza",
        "Copiar la tarifa de la competencia",
        "Margen, IVA y costos al final",
      ],
      correcta: 0,
      explicacion:
        "De abajo hacia arriba: costo real, carga de indirectos, margen e impuestos. Al revés se regala utilidad sin saberlo.",
    },
  ],
});

export const CUESTIONARIOS: Cuestionario[] = [
  Q_M1_P1,
  Q_M1_P2,
  Q_M1_P3,
  Q_M2_P1,
  Q_M2_P2,
  Q_M2_P3,
  Q_M3_P1,
  Q_M3_P2,
  Q_M3_P3,
  Q_M4_P1,
  Q_M4_P2,
  Q_M4_P3,
  Q_M5_P1,
  Q_M5_P2,
  Q_M5_P3,
];

export function cuestionarioPorClave(clave: string): Cuestionario | undefined {
  return CUESTIONARIOS.find((c) => c.clave === clave);
}

export function cuestionariosDelModulo(modulo: number | null | undefined): Cuestionario[] {
  if (!modulo) return CUESTIONARIOS;
  return CUESTIONARIOS.filter((c) => c.modulo === modulo);
}

export const TOTAL_PREGUNTAS = CUESTIONARIOS.reduce((a, c) => a + c.preguntas.length, 0);

/**
 * Versión pública de un cuestionario: sin el índice correcto y sin la
 * explicación. Es lo único que llega al navegador del alumno.
 */
export function cuestionarioParaElAlumno(clave: string) {
  const c = cuestionarioPorClave(clave);
  if (!c) return null;
  return {
    clave: c.clave,
    modulo: c.modulo,
    parcial: c.parcial,
    titulo: c.titulo,
    descripcion: c.descripcion,
    minutos: c.minutos,
    puntos: c.puntos,
    preguntas: c.preguntas.map((p) => ({
      id: p.id,
      enunciado: p.enunciado,
      opciones: p.opciones,
    })),
  };
}

/**
 * Califica un intento contra el banco de preguntas. Devuelve el resultado por
 * reactivo con su explicación, que sólo se genera después de recibir respuestas.
 */
export function calificarCuestionario(clave: string, respuestas: number[]) {
  const c = cuestionarioPorClave(clave);
  if (!c) return null;

  let correctas = 0;
  const detalle = c.preguntas.map((p, indice) => {
    const elegida = Number.isInteger(respuestas[indice]) ? respuestas[indice] : -1;
    const acierto = elegida === p.correcta;
    if (acierto) correctas += 1;
    return {
      id: p.id,
      enunciado: p.enunciado,
      opciones: p.opciones,
      elegida,
      correcta: p.correcta,
      acierto,
      explicacion: p.explicacion,
    };
  });

  const calificacion = Math.round((correctas / c.preguntas.length) * 100);
  return {
    correctas,
    total: c.preguntas.length,
    calificacion,
    detalle,
  };
}

/** Retroalimentación corta según el resultado. */
export function veredicto(calificacion: number): { texto: string; clase: string } {
  if (calificacion >= 90) {
    return { texto: "Dominio del tema: listo para aplicarlo en la operación.", clase: "text-emerald-800" };
  }
  if (calificacion >= 70) {
    return { texto: "Buen resultado. Revisa los reactivos fallados y vuelve a intentarlo.", clase: "text-inst-800" };
  }
  if (calificacion >= 60) {
    return { texto: "Aprobado justo: hace falta repasar el material del módulo.", clase: "text-amber-800" };
  }
  return { texto: "Aún no acreditas. Lee el material del módulo y repite el cuestionario.", clase: "text-rose-800" };
}
