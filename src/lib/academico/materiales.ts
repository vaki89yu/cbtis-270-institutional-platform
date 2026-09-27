/**
 * Material de lectura y apoyo precargado del plan de estudios de Logística.
 *
 * Misma filosofía que las actividades: el docente no captura nada, entra al
 * aula y sólo activa el material que va a usar hoy. Cada material trae su
 * contenido completo, para que el alumno lo lea dentro de la plataforma.
 */

export type TipoMaterial = "apunte" | "guia" | "video" | "enlace" | "caso";

export type Seccion = {
  titulo: string;
  parrafos?: string[];
  lista?: string[];
  tabla?: { encabezados: string[]; filas: string[][] };
  nota?: string;
};

export type MaterialPrecargado = {
  /** Clave estable, se guarda en materials.origen */
  clave: string;
  modulo: number;
  submodulo: string;
  titulo: string;
  descripcion: string;
  tipo: TipoMaterial;
  /** Lectura estimada o duración */
  duracion: string;
  /** Plantilla de Excel de la biblioteca que acompaña al material */
  descargaUrl?: string;
  /** Enlace oficial externo (SAT, DOF, etc.) */
  enlaceExterno?: string;
  /** Contenido completo que se lee dentro de la plataforma */
  contenido: Seccion[];
};

export const ETIQUETA_MATERIAL: Record<TipoMaterial, string> = {
  apunte: "Apunte",
  guia: "Guía de llenado",
  video: "Video",
  enlace: "Enlace oficial",
  caso: "Caso práctico",
};

export const MATERIALES_PRECARGADOS: MaterialPrecargado[] = [
  {
    clave: "M1-L1",
    modulo: 1,
    submodulo: "Introducción a la logística",
    tipo: "apunte",
    titulo: "Qué es la cadena de suministro y por qué Juárez vive de ella",
    descripcion: "Conceptos base: logística, cadena de suministro, eslabones, valor agregado y costo logístico, con ejemplos de la industria maquiladora local.",
    duracion: "15 min de lectura",
    contenido: [
      {
        titulo: "De qué hablamos cuando decimos logística",
        parrafos: [
          "Logística es lograr que el producto correcto llegue al lugar correcto, en el tiempo correcto, en la cantidad correcta y al menor costo posible. Nada más, y nada menos. Cuando algo de eso falla, alguien deja de vender y alguien más deja de cobrar.",
          "La cadena de suministro es la ruta completa que recorre un producto desde que es materia prima hasta que llega al cliente final. Ciudad Juárez es un eslabón de miles de esas cadenas: aquí se ensambla, se almacena y se cruza mercancía todos los días del año.",
        ],
        lista: [
          "Proveedor: vende la materia prima o el componente.",
          "Transporte de entrada (inbound): trae el material a la planta.",
          "Producción o transformación: la maquiladora convierte el material en producto.",
          "Almacén: guarda y controla lo que entra y lo que sale.",
          "Distribución (outbound): lleva el producto al cliente o al cruce fronterizo.",
          "Cliente final: recibe y paga.",
        ],
      },
      {
        titulo: "Los cinco flujos que corren al mismo tiempo",
        tabla: {
          encabezados: [
            "Flujo",
            "Qué se mueve",
            "Ejemplo en Juárez",
          ],
          filas: [
            [
              "Materiales",
              "Producto físico",
              "Arneses que salen de una planta rumbo a El Paso",
            ],
            [
              "Información",
              "Órdenes, pedimentos, avisos",
              "El aviso de embarque que el cliente recibe antes de que salga el camión",
            ],
            [
              "Dinero",
              "Pagos y cobros",
              "La factura a 30 días del proveedor de empaque",
            ],
            [
              "Documentos",
              "Factura, carta porte, pedimento",
              "El expediente que revisa la aduana",
            ],
            [
              "Retorno",
              "Devoluciones y reciclaje",
              "Tarimas y contenedores que regresan a la planta",
            ],
          ],
        },
      },
      {
        titulo: "Costo logístico: dónde se va el dinero",
        parrafos: [
          "En una empresa promedio el costo logístico se lleva entre el 8% y el 15% de las ventas. Se reparte así:",
        ],
        lista: [
          "Transporte: casi siempre el más caro, de 40% a 60% del total.",
          "Almacenamiento: renta, luz, montacargas y personal.",
          "Inventario: el dinero detenido en mercancía que todavía no se vende.",
          "Administración: personal, sistemas y documentación.",
        ],
        nota: "Regla práctica: cada día que un producto pasa parado en un almacén cuesta dinero aunque nadie lo toque.",
      },
      {
        titulo: "Para la evidencia",
        parrafos: [
          "Elige una empresa de Ciudad Juárez que conozcas —una maquiladora, una distribuidora de abarrotes, una tienda de refacciones— y dibuja su cadena de suministro completa. Marca con un color el punto donde ocurre el cruce fronterizo y con otro los puntos donde crees que se pierde tiempo o dinero.",
        ],
      },
    ],
  },
  {
    clave: "M1-L2",
    modulo: 1,
    submodulo: "Flujo de materiales e información",
    tipo: "guia",
    titulo: "Guía de llenado: requisición y orden de compra (FOR-LOG-02)",
    descripcion: "Campo por campo del formato: datos del proveedor, partidas, precio unitario, subtotal, IVA, condiciones de pago y firmas de autorización.",
    duracion: "10 min",
    descargaUrl: "/formatos/FOR-LOG-02_Orden-de-Compra_CBTIS270.xlsx",
    contenido: [
      {
        titulo: "Diferencia entre requisición y orden de compra",
        parrafos: [
          "La requisición es interna: un área le pide a Compras que consiga algo. La orden de compra es externa: es el documento con el que la empresa se compromete legalmente a comprarle a un proveedor. Una mal hecha se convierte en un pedido mal surtido y en una discusión de pago.",
        ],
      },
      {
        titulo: "Encabezado",
        tabla: {
          encabezados: [
            "Campo",
            "Qué se escribe",
            "Error común",
          ],
          filas: [
            [
              "Folio",
              "Consecutivo sin saltos: OC-2026-0001",
              "Repetir folio de otra orden",
            ],
            [
              "Fecha de emisión",
              "El día que se autoriza, no el día que se pidió",
              "Poner la fecha de entrega",
            ],
            [
              "Proveedor",
              "Razón social completa y RFC",
              "Escribir el nombre comercial",
            ],
            [
              "Domicilio y contacto",
              "Dirección fiscal, teléfono y correo",
              "Dejarlo en blanco",
            ],
            [
              "Condiciones de pago",
              "Contado, 15, 30 o 60 días",
              "No especificar y pagar cuando se pueda",
            ],
            [
              "Fecha de entrega requerida",
              "Día exacto comprometido",
              "Poner 'lo antes posible'",
            ],
          ],
        },
      },
      {
        titulo: "Cuerpo: las partidas",
        lista: [
          "Cantidad: número y unidad de medida (pieza, caja, kilo, metro).",
          "Descripción: clara y sin abreviaturas inventadas. Si hay número de parte, va.",
          "Precio unitario: sin IVA.",
          "Importe: cantidad × precio unitario.",
          "Subtotal: suma de todos los importes.",
          "IVA: 16% del subtotal. En región fronteriza puede aplicar 8%, verifica el régimen del proveedor.",
          "Total: subtotal + IVA.",
        ],
        nota: "Si el proveedor cobra flete, va como una partida aparte, nunca escondido en el precio unitario.",
      },
      {
        titulo: "Cierre y firmas",
        parrafos: [
          "Toda orden lleva tres firmas: quien la elabora (Compras), quien la autoriza (jefatura o gerencia según el monto) y quien recibe (Almacén, al momento de la entrega). Sin la firma de autorización, el documento no obliga a nadie.",
        ],
      },
      {
        titulo: "Ejercicio",
        parrafos: [
          "Descarga la plantilla FOR-LOG-02 con el botón de arriba y elabora la orden de compra de un pedido de tres productos con IVA calculado. Comprueba que el total cuadre a peso exacto.",
        ],
      },
    ],
  },
  {
    clave: "M1-L3",
    modulo: 1,
    submodulo: "Compras y proveedores",
    tipo: "apunte",
    titulo: "Cómo evaluar y comparar proveedores",
    descripcion: "Criterios de selección, matriz de ponderación con ejemplo resuelto y las preguntas que sí hay que hacerle a un proveedor.",
    duracion: "12 min de lectura",
    contenido: [
      {
        titulo: "El precio no es el único criterio",
        parrafos: [
          "El proveedor más barato puede salir carísimo si entrega tarde, si su calidad es dispareja o si desaparece a media temporada. Comprar bien es equilibrar precio, tiempo, calidad y confiabilidad.",
        ],
        lista: [
          "Precio y forma de pago.",
          "Tiempo de entrega (lead time) y su cumplimiento histórico.",
          "Calidad y porcentaje de rechazos.",
          "Capacidad de surtir el volumen que necesitas en temporada alta.",
          "Garantía, soporte y política de devoluciones.",
          "Ubicación: un proveedor local ahorra flete y tiempo de reacción.",
        ],
      },
      {
        titulo: "Matriz de ponderación, con números",
        parrafos: [
          "Se le da un peso a cada criterio (que sume 100%), se califica del 1 al 10 a cada proveedor y se multiplica. Gana el puntaje más alto, no la corazonada.",
        ],
        tabla: {
          encabezados: [
            "Criterio",
            "Peso",
            "Proveedor A",
            "Proveedor B",
            "Proveedor C",
          ],
          filas: [
            [
              "Precio",
              "35%",
              "9 → 3.15",
              "7 → 2.45",
              "8 → 2.80",
            ],
            [
              "Tiempo de entrega",
              "25%",
              "6 → 1.50",
              "9 → 2.25",
              "8 → 2.00",
            ],
            [
              "Calidad",
              "25%",
              "7 → 1.75",
              "9 → 2.25",
              "8 → 2.00",
            ],
            [
              "Garantía y soporte",
              "15%",
              "6 → 0.90",
              "8 → 1.20",
              "7 → 1.05",
            ],
            [
              "TOTAL",
              "100%",
              "7.30",
              "8.15",
              "7.85",
            ],
          ],
        },
        nota: "En este ejemplo gana el proveedor B aunque no es el más barato: entrega a tiempo y con mejor calidad.",
      },
      {
        titulo: "Preguntas que sí hay que hacer",
        lista: [
          "¿Cuál es tu tiempo de entrega real, no el del catálogo?",
          "¿Qué pasa si te pido el doble en diciembre?",
          "¿Quién paga el flete y a partir de qué monto es gratis?",
          "¿Cómo manejas una devolución por defecto de fábrica?",
          "¿Me puedes dar dos clientes actuales como referencia?",
        ],
      },
    ],
  },
  {
    clave: "M1-L4",
    modulo: 1,
    submodulo: "Compras y proveedores",
    tipo: "caso",
    titulo: "Caso: la orden de compra que llegó tarde",
    descripcion: "Una distribuidora perdió un contrato por errores en su orden de compra. Identifica las fallas y propón el control que las evita.",
    duracion: "20 min en equipo",
    contenido: [
      {
        titulo: "La situación",
        parrafos: [
          "Distribuidora del Norte, en el parque industrial Bermúdez, surte empaque a tres maquiladoras. El 3 de marzo su cliente más grande le pidió 500 cajas para el día 12.",
          "El comprador mandó la orden por WhatsApp, sin folio y sin fecha de entrega. El proveedor entendió que era para fin de mes. El día 12 no había cajas. El cliente paró su línea cuatro horas y en abril se cambió de proveedor.",
        ],
      },
      {
        titulo: "Los datos",
        tabla: {
          encabezados: [
            "Dato",
            "Valor",
          ],
          filas: [
            [
              "Pedido",
              "500 cajas de cartón corrugado",
            ],
            [
              "Precio unitario",
              "$38.00",
            ],
            [
              "Fecha requerida",
              "12 de marzo",
            ],
            [
              "Fecha de entrega real",
              "29 de marzo",
            ],
            [
              "Costo del paro de línea del cliente",
              "$46,000",
            ],
            [
              "Contrato anual perdido",
              "$1,150,000",
            ],
          ],
        },
      },
      {
        titulo: "Lo que tienes que entregar",
        lista: [
          "Las tres fallas concretas del proceso de compra.",
          "El documento que debió emitirse y qué campos suyos habrían evitado el problema.",
          "Un control (autorización, acuse o bitácora) para cada falla.",
          "Tu conclusión: ¿cuánto costó, en pesos, no llenar bien un formato?",
        ],
        nota: "Trabájalo en equipo de tres y entrégalo con la plantilla FOR-LOG-02 llenada como debió haber sido.",
      },
    ],
  },
  {
    clave: "M2-L1",
    modulo: 2,
    submodulo: "Almacenes y control de inventarios",
    tipo: "apunte",
    titulo: "Tipos de almacén y distribución del espacio (layout)",
    descripcion: "Zonas de un almacén, criterios de acomodo, señalización y cálculo de capacidad de una estantería.",
    duracion: "15 min de lectura",
    contenido: [
      {
        titulo: "Tipos de almacén",
        lista: [
          "Materia prima: lo que entra para producir.",
          "Producto en proceso: lo que está a medio fabricar.",
          "Producto terminado: listo para venderse o embarcarse.",
          "Refacciones y consumibles: lo que mantiene la planta trabajando.",
          "Almacén fiscal o depósito: mercancía de importación que aún no paga impuestos.",
        ],
      },
      {
        titulo: "Las seis zonas que todo almacén necesita",
        tabla: {
          encabezados: [
            "Zona",
            "Función",
            "Qué se cuida",
          ],
          filas: [
            [
              "Recepción",
              "Descarga y verificación contra la orden",
              "Espacio suficiente para revisar sin bloquear andenes",
            ],
            [
              "Cuarentena",
              "Material por inspeccionar",
              "Que no se mezcle con el liberado",
            ],
            [
              "Almacenaje",
              "Racks y estantería",
              "Peso, rotación y accesibilidad",
            ],
            [
              "Picking",
              "Preparación de pedidos",
              "Que lo de mayor salida quede a la mano",
            ],
            [
              "Empaque",
              "Consolidación y etiquetado",
              "Etiqueta legible y peso declarado",
            ],
            [
              "Embarque",
              "Carga al transporte",
              "Orden de carga y documentación completa",
            ],
          ],
        },
      },
      {
        titulo: "Criterios de acomodo",
        lista: [
          "Por rotación (ABC): lo que más sale, más cerca de la salida.",
          "Por peso: lo pesado abajo, lo ligero arriba. Siempre.",
          "Por compatibilidad: químicos lejos de alimentos y de material inflamable.",
          "Por caducidad: PEPS, primero en entrar primero en salir.",
        ],
      },
      {
        titulo: "Cálculo rápido de capacidad",
        parrafos: [
          "Capacidad = niveles × posiciones por nivel × tarimas por posición.",
          "Ejemplo: un rack de 4 niveles, 10 posiciones por nivel y 2 tarimas por posición da 80 tarimas. Si cada tarima lleva 40 cajas, el rack guarda 3,200 cajas.",
        ],
        nota: "Nunca planees al 100% de ocupación: por arriba del 85% el almacén se vuelve lento y peligroso.",
      },
    ],
  },
  {
    clave: "M2-L2",
    modulo: 2,
    submodulo: "Almacenes y control de inventarios",
    tipo: "guia",
    titulo: "Guía de llenado: Kardex de almacén (FOR-LOG-01)",
    descripcion: "Entradas, salidas, existencia y costo. Métodos PEPS y promedio ponderado con ejercicio resuelto paso a paso.",
    duracion: "18 min",
    descargaUrl: "/formatos/FOR-LOG-01_Kardex-de-Control-de-Existencias_CBTIS270.xlsx",
    contenido: [
      {
        titulo: "Para qué sirve el Kardex",
        parrafos: [
          "El Kardex es la historia clínica de cada artículo: cuánto entró, cuánto salió, cuánto queda y cuánto vale lo que queda. Si el Kardex está bien, el inventario físico cuadra. Si no, el almacén vive a ciegas.",
        ],
      },
      {
        titulo: "Columnas del formato",
        tabla: {
          encabezados: [
            "Columna",
            "Contenido",
          ],
          filas: [
            [
              "Fecha",
              "Día del movimiento",
            ],
            [
              "Documento",
              "Folio de la orden, remisión o vale de salida",
            ],
            [
              "Concepto",
              "Compra, venta, devolución, ajuste",
            ],
            [
              "Entradas: cantidad / costo unitario / total",
              "Sólo cuando ingresa material",
            ],
            [
              "Salidas: cantidad / costo unitario / total",
              "Sólo cuando sale material",
            ],
            [
              "Existencia: cantidad / costo unitario / total",
              "Saldo después de cada movimiento",
            ],
          ],
        },
      },
      {
        titulo: "PEPS resuelto",
        parrafos: [
          "PEPS significa primeras entradas, primeras salidas: lo que sale se valúa al costo de lo que entró primero.",
        ],
        tabla: {
          encabezados: [
            "Movimiento",
            "Cantidad",
            "Costo unitario",
            "Existencia",
          ],
          filas: [
            [
              "Compra 1",
              "100",
              "$20.00",
              "100 piezas · $2,000",
            ],
            [
              "Compra 2",
              "100",
              "$25.00",
              "200 piezas · $4,500",
            ],
            [
              "Venta",
              "120",
              "100 a $20 y 20 a $25 = $2,500",
              "80 piezas · $2,000",
            ],
            [
              "Saldo final",
              "80",
              "$25.00",
              "$2,000",
            ],
          ],
        },
        nota: "Fíjate: las 80 piezas que quedan se valúan al costo más reciente, porque las viejas ya salieron.",
      },
      {
        titulo: "Promedio ponderado",
        parrafos: [
          "Aquí se recalcula un costo promedio cada vez que entra material: costo total ÷ unidades totales.",
          "Con los mismos datos: (2,000 + 2,500) ÷ 200 = $22.50 por pieza. La venta de 120 piezas se valúa en $2,700 y quedan 80 piezas con valor de $1,800.",
        ],
      },
      {
        titulo: "Errores que arruinan un Kardex",
        lista: [
          "Registrar la salida sin el vale firmado.",
          "Cambiar de método a media hoja: o es PEPS o es promedio, no los dos.",
          "Ajustar la existencia 'a ojo' para que cuadre con el conteo.",
          "No registrar las devoluciones: el inventario se infla solo.",
        ],
      },
    ],
  },
  {
    clave: "M2-L3",
    modulo: 2,
    submodulo: "Seguridad e higiene en el almacén",
    tipo: "apunte",
    titulo: "Equipo de protección personal y manejo de montacargas",
    descripcion: "EPP obligatorio, inspección previa al uso del montacargas, capacidad de carga y las cinco causas más comunes de accidente.",
    duracion: "12 min de lectura",
    contenido: [
      {
        titulo: "EPP obligatorio en piso",
        tabla: {
          encabezados: [
            "Equipo",
            "Para qué",
            "Cuándo se revisa",
          ],
          filas: [
            [
              "Casco",
              "Caída de objetos desde racks",
              "Antes de cada turno; si se golpeó, se cambia",
            ],
            [
              "Chaleco reflejante",
              "Que el operador de montacargas te vea",
              "Diario; sin reflejante ya no sirve",
            ],
            [
              "Calzado con casquillo",
              "Caída de carga sobre el pie",
              "Semanal; suela lisa se reemplaza",
            ],
            [
              "Guantes",
              "Cortes con fleje, cartón y madera",
              "Cada uso",
            ],
            [
              "Lentes de seguridad",
              "Astillas y polvo",
              "Cada uso",
            ],
          ],
        },
      },
      {
        titulo: "Inspección del montacargas antes de encenderlo",
        lista: [
          "Nivel de aceite, agua, combustible o carga de batería.",
          "Llantas sin cortes y con presión.",
          "Horquillas sin fisuras ni deformación.",
          "Frenos, claxon, luces y alarma de reversa funcionando.",
          "Fugas visibles en el piso debajo del equipo.",
          "Cinturón de seguridad completo y extintor en su sitio.",
        ],
        nota: "Si algo falla, el equipo se marca como fuera de servicio. Operarlo así es responsabilidad directa del operador.",
      },
      {
        titulo: "Capacidad de carga y centro de carga",
        parrafos: [
          "La placa del montacargas indica cuánto levanta y a qué distancia. Si la carga es más profunda que el centro de carga indicado, la capacidad real baja. Un montacargas de 2,500 kg a 60 cm puede bajar a 1,800 kg si la carga se extiende a 90 cm.",
        ],
      },
      {
        titulo: "Las cinco causas más comunes de accidente",
        lista: [
          "Exceso de velocidad en pasillos.",
          "Volteo por tomar una curva con las horquillas arriba.",
          "Peatón en el pasillo sin contacto visual con el operador.",
          "Carga mal estibada o sin fleje.",
          "Operar sin capacitación ni autorización.",
        ],
      },
    ],
  },
  {
    clave: "M2-L4",
    modulo: 2,
    submodulo: "Seguridad e higiene en el almacén",
    tipo: "enlace",
    titulo: "NOM-006-STPS-2014: manejo y almacenamiento de materiales",
    descripcion: "Norma oficial que rige las condiciones de seguridad en el manejo de materiales. Es la base legal del checklist de montacargas.",
    duracion: "consulta",
    enlaceExterno: "https://www.dof.gob.mx/nota_detalle.php?codigo=5359717&fecha=11/09/2014",
    descargaUrl: "/formatos/FOR-LOG-06_Checklist-Montacargas-y-Seguridad_CBTIS270.xlsx",
    contenido: [
      {
        titulo: "Qué obliga la norma",
        parrafos: [
          "La NOM-006-STPS-2014 establece las condiciones de seguridad y salud para el manejo, transporte y almacenamiento de materiales con maquinaria o de forma manual. Aplica a todo centro de trabajo del país, incluido el Almacén Escuela.",
        ],
        lista: [
          "Revisión del equipo antes de cada turno, documentada.",
          "Capacitación y autorización por escrito del operador.",
          "Señalización de pasillos, zonas de carga y límites de estiba.",
          "Límites de peso en manejo manual y uso de ayudas mecánicas.",
          "Programa de mantenimiento a la maquinaria.",
        ],
      },
      {
        titulo: "Lo que revisa la STPS en una inspección",
        lista: [
          "Registros de revisión diaria firmados por el operador.",
          "Constancias DC-3 de capacitación.",
          "Estado físico de horquillas, llantas y alarmas.",
          "Señalización visible y pasillos libres.",
          "Análisis de riesgos del centro de trabajo.",
        ],
      },
      {
        titulo: "Cómo usarla en tu evidencia",
        parrafos: [
          "Abre la norma en el enlace oficial, descarga el checklist FOR-LOG-06 y verifica punto por punto el montacargas del Almacén Escuela. Cita el número de apartado de la norma en cada hallazgo que reportes.",
        ],
      },
    ],
  },
  {
    clave: "M3-L1",
    modulo: 3,
    submodulo: "Transporte y distribución",
    tipo: "apunte",
    titulo: "Modos de transporte y cuándo conviene cada uno",
    descripcion: "Autotransporte, ferroviario, marítimo, aéreo y multimodal comparados por costo, tiempo y tipo de mercancía, aplicado a la frontera norte.",
    duracion: "15 min de lectura",
    contenido: [
      {
        titulo: "Los cinco modos",
        tabla: {
          encabezados: [
            "Modo",
            "Costo",
            "Tiempo",
            "Conviene para",
          ],
          filas: [
            [
              "Autotransporte",
              "Medio",
              "Rápido en distancias cortas",
              "Casi todo en la frontera: es puerta a puerta",
            ],
            [
              "Ferroviario",
              "Bajo",
              "Lento",
              "Volumen alto y poco urgente: granel, autos, acero",
            ],
            [
              "Marítimo",
              "El más bajo por tonelada",
              "Semanas",
              "Importación de Asia, contenedores",
            ],
            [
              "Aéreo",
              "El más caro",
              "Horas",
              "Urgencias, electrónica, refacciones que paran una línea",
            ],
            [
              "Multimodal",
              "Variable",
              "Variable",
              "Combinar barco y tren para bajar costo sin perder alcance",
            ],
          ],
        },
      },
      {
        titulo: "Tipos de camión que verás en Juárez",
        lista: [
          "Caja seca de 53 pies: la reina del cruce, hasta 24 tarimas estándar.",
          "Caja refrigerada: alimentos y farmacéutico con control de temperatura.",
          "Plataforma: maquinaria y carga sobredimensionada.",
          "Tolva y pipa: granel sólido y líquido.",
          "Camioneta de 3.5 toneladas: reparto urbano y última milla.",
        ],
      },
      {
        titulo: "Cómo se decide",
        parrafos: [
          "Primero el tipo de mercancía y su urgencia; luego el volumen; al final el costo. Si el producto vale poco y pesa mucho, el flete se come la utilidad y hay que buscar tren o consolidar. Si el producto vale mucho y es urgente, el avión puede salir barato comparado con parar una planta.",
        ],
        nota: "Regla de campo: comparar siempre costo por unidad transportada, no costo total del viaje.",
      },
    ],
  },
  {
    clave: "M3-L2",
    modulo: 3,
    submodulo: "Documentación del transporte",
    tipo: "guia",
    titulo: "Guía de llenado: Carta Porte (FOR-LOG-03)",
    descripcion: "Complemento Carta Porte del SAT: remitente, destinatario, mercancía, claves, peso, distancia y datos del autotransporte.",
    duracion: "20 min",
    descargaUrl: "/formatos/FOR-LOG-03_Carta-Porte-Guia-de-Llenado_CBTIS270.xlsx",
    enlaceExterno: "http://omawww.sat.gob.mx/tramitesyservicios/Paginas/complemento_carta_porte.htm",
    contenido: [
      {
        titulo: "Qué es y por qué es obligatoria",
        parrafos: [
          "La Carta Porte es el complemento del CFDI que ampara el traslado de mercancías en territorio nacional. Sin ella, la mercancía viaja indocumentada: la autoridad puede detener la unidad y presumir contrabando. La responsabilidad es tanto de quien traslada como de quien contrata.",
        ],
      },
      {
        titulo: "Bloque 1 · Ubicaciones",
        tabla: {
          encabezados: [
            "Campo",
            "Qué se captura",
          ],
          filas: [
            [
              "Origen",
              "RFC del remitente, fecha y hora de salida, domicilio completo con código postal",
            ],
            [
              "Destino",
              "RFC del destinatario, fecha y hora estimada de llegada, domicilio completo",
            ],
            [
              "Distancia recorrida",
              "Kilómetros entre origen y destino; obligatorio en el primer punto",
            ],
          ],
        },
      },
      {
        titulo: "Bloque 2 · Mercancías",
        lista: [
          "Clave de producto y servicio del catálogo del SAT (no la clave interna de la empresa).",
          "Descripción específica: 'arnés automotriz', no 'material'.",
          "Cantidad y clave de unidad (H87 pieza, KGM kilogramo).",
          "Peso en kilogramos por partida y peso bruto total.",
          "Material peligroso: sí o no; si es sí, clave ONU y tipo de embalaje.",
          "Valor de la mercancía y moneda.",
        ],
        nota: "El peso bruto total debe cuadrar con la suma de las partidas. Es el error que más rechaza el SAT.",
      },
      {
        titulo: "Bloque 3 · Autotransporte",
        lista: [
          "Permiso SCT y número de permiso del transportista.",
          "Configuración vehicular (VL, C2, C3, T3S2).",
          "Placa del vehículo y año modelo.",
          "Póliza de seguro de responsabilidad civil y aseguradora.",
          "Remolques con sus placas, si aplica.",
          "Figura del transporte: RFC y licencia del operador.",
        ],
      },
      {
        titulo: "Antes de timbrar",
        lista: [
          "¿El RFC del destinatario existe y está activo?",
          "¿Las claves de producto son del catálogo vigente?",
          "¿El peso total cuadra?",
          "¿La distancia es real y no una estimación redondeada?",
          "¿La licencia del operador está vigente?",
        ],
      },
    ],
  },
  {
    clave: "M3-L3",
    modulo: 3,
    submodulo: "Documentación del transporte",
    tipo: "enlace",
    titulo: "Complemento Carta Porte · portal oficial del SAT",
    descripcion: "Documentación vigente, catálogos de claves, estándar técnico y preguntas frecuentes del complemento obligatorio.",
    duracion: "consulta",
    enlaceExterno: "http://omawww.sat.gob.mx/tramitesyservicios/Paginas/complemento_carta_porte.htm",
    contenido: [
      {
        titulo: "Qué vas a encontrar ahí",
        lista: [
          "Estándar técnico del complemento y su documentación.",
          "Catálogos descargables: claves de producto, unidades, configuraciones vehiculares y estaciones.",
          "Instructivo de llenado oficial actualizado.",
          "Preguntas frecuentes con los casos que más rechaza el SAT.",
        ],
      },
      {
        titulo: "Cómo se usa en clase",
        parrafos: [
          "Los catálogos cambian. Antes de entregar cualquier evidencia con Carta Porte, verifica en el portal que la clave de producto y la clave de unidad que usaste sigan vigentes. Anota la fecha de tu consulta en el pie de tu documento: así se trabaja en una agencia real.",
        ],
      },
    ],
  },
  {
    clave: "M3-L4",
    modulo: 3,
    submodulo: "Rutas y entregas",
    tipo: "caso",
    titulo: "Caso: rediseñar la ruta de reparto de una panadería",
    descripcion: "Doce puntos de entrega en Juárez, una camioneta y seis horas. Ordena la ruta, calcula kilómetros y justifica el ahorro.",
    duracion: "25 min en equipo",
    contenido: [
      {
        titulo: "La situación",
        parrafos: [
          "Panificadora La Frontera reparte a 12 tiendas entre el Centro, Zaragoza y Riberas del Bravo con una sola camioneta de 3.5 toneladas. Hoy el repartidor decide la ruta 'como le va saliendo': recorre 96 km diarios y termina a las 3 de la tarde, con dos entregas fuera de horario.",
        ],
      },
      {
        titulo: "Restricciones reales",
        lista: [
          "Salida del obrador a las 6:00 am, cierre de ruta a las 12:00 pm.",
          "Tres tiendas sólo reciben antes de las 9:00 am.",
          "Capacidad de la camioneta: 180 charolas; la demanda total es de 210.",
          "Combustible: $24.50 por litro, rendimiento de 8 km por litro.",
        ],
      },
      {
        titulo: "Lo que tienes que entregar",
        lista: [
          "Ruta propuesta en orden, agrupada por zona geográfica.",
          "Kilómetros estimados y comparación contra los 96 km actuales.",
          "Ahorro mensual en pesos (22 días hábiles).",
          "Cómo resuelves el exceso de 30 charolas: ¿segunda vuelta, otra unidad o reparto en dos días?",
          "Un mapa simple, a mano o en Google Maps, con la secuencia numerada.",
        ],
        nota: "Justifica con números. Una propuesta sin pesos ni kilómetros no se acepta.",
      },
    ],
  },
  {
    clave: "M4-L1",
    modulo: 4,
    submodulo: "Comercio exterior",
    tipo: "apunte",
    titulo: "Importación y exportación: actores y documentos",
    descripcion: "Quién es quién en una operación de comercio exterior y qué documento emite cada uno.",
    duracion: "18 min de lectura",
    contenido: [
      {
        titulo: "Los actores",
        tabla: {
          encabezados: [
            "Actor",
            "Qué hace",
            "Documento que genera",
          ],
          filas: [
            [
              "Exportador",
              "Vende y entrega al transportista",
              "Factura comercial y lista de empaque",
            ],
            [
              "Importador",
              "Compra y paga contribuciones",
              "Encargo conferido al agente aduanal",
            ],
            [
              "Agente aduanal",
              "Despacha ante la aduana",
              "Pedimento",
            ],
            [
              "Transportista",
              "Traslada la mercancía",
              "Carta Porte o guía",
            ],
            [
              "Aduana",
              "Verifica y autoriza",
              "Resultado del reconocimiento",
            ],
            [
              "Almacén fiscal",
              "Resguarda mientras se despacha",
              "Constancia de depósito",
            ],
          ],
        },
      },
      {
        titulo: "Documentos que nunca pueden faltar",
        lista: [
          "Factura comercial: describe la mercancía y su valor.",
          "Lista de empaque (packing list): qué va en cada bulto, con pesos y medidas.",
          "Documento de transporte: Carta Porte, guía aérea o conocimiento de embarque.",
          "Certificado de origen: para aprovechar el T-MEC y pagar menos arancel.",
          "Pedimento: el documento fiscal que ampara la operación.",
          "Permisos o NOM, cuando la fracción arancelaria lo exige.",
        ],
      },
      {
        titulo: "Cómo se ve en el cruce de Juárez",
        parrafos: [
          "Un embarque que sale de un parque industrial cruza por Zaragoza o Córdoba–Américas. Antes de llegar al puente ya debió estar transmitido el pedimento; en el módulo se activa el semáforo fiscal: verde pasa, rojo va a reconocimiento aduanero. Un documento con un dato mal capturado puede detener la caja varias horas.",
        ],
        nota: "El tiempo en frontera es dinero: cada hora de caja detenida se cobra como demora.",
      },
    ],
  },
  {
    clave: "M4-L2",
    modulo: 4,
    submodulo: "Comercio exterior",
    tipo: "guia",
    titulo: "Guía de llenado: pedimento A1 (FOR-LOG-05)",
    descripcion: "Estructura del pedimento, clave de documento, régimen, valor en aduana, fracción arancelaria e impuestos con ejemplo numérico.",
    duracion: "25 min",
    descargaUrl: "/formatos/FOR-LOG-05_Pedimento-Aduanal-A1_CBTIS270.xlsx",
    contenido: [
      {
        titulo: "Qué es la clave A1",
        parrafos: [
          "A1 es la clave de pedimento de importación o exportación definitiva: la mercancía se queda en el país de destino. Es la operación más común y la que se estudia primero.",
        ],
      },
      {
        titulo: "Bloques del pedimento",
        tabla: {
          encabezados: [
            "Bloque",
            "Contenido clave",
          ],
          filas: [
            [
              "Encabezado",
              "Número de pedimento, tipo de operación, clave A1, aduana y fecha",
            ],
            [
              "Datos del importador",
              "RFC, razón social y domicilio fiscal",
            ],
            [
              "Proveedor",
              "Nombre, domicilio en el extranjero y número de factura",
            ],
            [
              "Valores",
              "Valor en dólares, tipo de cambio, valor aduana, fletes y seguros",
            ],
            [
              "Partidas",
              "Fracción arancelaria, NICO, descripción, cantidad, unidad, valor",
            ],
            [
              "Contribuciones",
              "IGI, DTA, IVA y, si aplica, prevalidación",
            ],
            [
              "Identificadores",
              "Trato preferencial T-MEC, NOM, permisos",
            ],
          ],
        },
      },
      {
        titulo: "Ejemplo numérico completo",
        parrafos: [
          "Importación de 500 piezas con valor de 10,000 USD, tipo de cambio 17.20, flete 600 USD, seguro 100 USD.",
        ],
        tabla: {
          encabezados: [
            "Concepto",
            "Cálculo",
            "Importe",
          ],
          filas: [
            [
              "Valor comercial",
              "10,000 × 17.20",
              "$172,000.00",
            ],
            [
              "Incrementables (flete + seguro)",
              "700 × 17.20",
              "$12,040.00",
            ],
            [
              "Valor en aduana",
              "172,000 + 12,040",
              "$184,040.00",
            ],
            [
              "IGI (supuesto 10%)",
              "184,040 × 10%",
              "$18,404.00",
            ],
            [
              "DTA",
              "8 al millar sobre valor aduana",
              "$1,472.32",
            ],
            [
              "Base de IVA",
              "184,040 + 18,404 + 1,472.32",
              "$203,916.32",
            ],
            [
              "IVA 16%",
              "203,916.32 × 16%",
              "$32,626.61",
            ],
            [
              "Total a pagar",
              "IGI + DTA + IVA",
              "$52,502.93",
            ],
          ],
        },
        nota: "Con certificado de origen T-MEC válido el IGI puede quedar en cero: por eso ese documento vale tanto dinero.",
      },
      {
        titulo: "Errores caros",
        lista: [
          "Clasificar mal la fracción arancelaria: multa y pago de diferencias.",
          "Olvidar los incrementables: se subvalúa y la autoridad lo detecta.",
          "Tipo de cambio distinto al publicado el día anterior al pago.",
          "Descripción genérica que no coincide con la factura.",
        ],
      },
    ],
  },
  {
    clave: "M4-L3",
    modulo: 4,
    submodulo: "Comercio exterior",
    tipo: "apunte",
    titulo: "INCOTERMS 2020 explicados con ejemplos",
    descripcion: "Dónde termina la responsabilidad del vendedor, quién paga el flete y quién asume el riesgo en cada término.",
    duracion: "15 min de lectura",
    contenido: [
      {
        titulo: "Qué resuelven los INCOTERMS",
        parrafos: [
          "Son reglas de la Cámara de Comercio Internacional que definen tres cosas en una compraventa internacional: hasta dónde entrega el vendedor, quién paga cada tramo y en qué punto se transmite el riesgo. No definen la propiedad ni la forma de pago.",
        ],
      },
      {
        titulo: "Los seis que más se usan en la frontera",
        tabla: {
          encabezados: [
            "Término",
            "El vendedor entrega en",
            "Paga el flete principal",
            "El riesgo pasa al comprador en",
          ],
          filas: [
            [
              "EXW",
              "Su propia planta",
              "Comprador",
              "La planta del vendedor",
            ],
            [
              "FCA",
              "Lugar convenido, cargada",
              "Comprador",
              "La entrega al transportista",
            ],
            [
              "FOB",
              "A bordo del buque",
              "Comprador",
              "A bordo del buque",
            ],
            [
              "CIF",
              "A bordo, con flete y seguro pagados",
              "Vendedor",
              "A bordo del buque (¡aunque él pague el flete!)",
            ],
            [
              "DAP",
              "Destino convenido, sin descargar",
              "Vendedor",
              "En el destino",
            ],
            [
              "DDP",
              "Destino, con impuestos pagados",
              "Vendedor",
              "En el destino",
            ],
          ],
        },
      },
      {
        titulo: "El detalle que se pregunta en examen",
        parrafos: [
          "En CIF el vendedor paga el flete y el seguro, pero el riesgo ya pasó al comprador desde que la mercancía está a bordo. Si se pierde en altamar, el comprador reclama al seguro, no al vendedor.",
        ],
        nota: "Regla: pagar el flete y asumir el riesgo no siempre son la misma persona.",
      },
      {
        titulo: "Ejercicio mental",
        parrafos: [
          "Una maquiladora de Juárez le vende a un cliente de Dallas. Si cotiza EXW, el cliente contrata el cruce y el flete. Si cotiza DDP, la maquiladora asume aduana, impuestos y entrega en Dallas. ¿Cuál cotización se ve más cara en el papel y cuál es más cara en realidad?",
        ],
      },
    ],
  },
  {
    clave: "M4-L4",
    modulo: 4,
    submodulo: "Costos logísticos",
    tipo: "guia",
    titulo: "Guía de llenado: costeo de fletes (FOR-LOG-04)",
    descripcion: "Costo fijo, costo variable por kilómetro, casetas, combustible, operador y margen hasta llegar a la tarifa al cliente.",
    duracion: "20 min",
    descargaUrl: "/formatos/FOR-LOG-04_Costeo-de-Fletes-y-Rutas_CBTIS270.xlsx",
    contenido: [
      {
        titulo: "Los dos tipos de costo",
        lista: [
          "Fijos: existen aunque el camión no salga. Seguro, tenencia, depreciación, sueldo base, permisos.",
          "Variables: sólo se generan al rodar. Combustible, casetas, llantas, mantenimiento, viáticos.",
        ],
      },
      {
        titulo: "Costeo de un viaje Juárez–Chihuahua",
        tabla: {
          encabezados: [
            "Concepto",
            "Cálculo",
            "Importe",
          ],
          filas: [
            [
              "Distancia redonda",
              "375 km × 2",
              "750 km",
            ],
            [
              "Diésel",
              "750 ÷ 2.5 km/l = 300 l × $26.00",
              "$7,800.00",
            ],
            [
              "Casetas",
              "Tarifa vigente ida y vuelta",
              "$1,540.00",
            ],
            [
              "Sueldo del operador",
              "Día y medio",
              "$1,800.00",
            ],
            [
              "Viáticos",
              "Alimentos y hospedaje",
              "$700.00",
            ],
            [
              "Llantas y mantenimiento",
              "750 km × $2.10",
              "$1,575.00",
            ],
            [
              "Prorrateo de costos fijos",
              "Día y medio de operación",
              "$2,100.00",
            ],
            [
              "Costo total",
              "",
              "$15,515.00",
            ],
            [
              "Margen 20%",
              "15,515 × 0.20",
              "$3,103.00",
            ],
            [
              "Tarifa al cliente",
              "",
              "$18,618.00",
            ],
          ],
        },
      },
      {
        titulo: "Cómo se defiende una tarifa",
        parrafos: [
          "Cuando el cliente dice que está cara, se le muestra el desglose. El error clásico es cotizar sólo el diésel y las casetas: así el flete parece barato hasta que llega la factura del taller.",
        ],
        nota: "Nunca cotices sin prorratear los costos fijos: es la forma más común de trabajar a pérdida sin darse cuenta.",
      },
      {
        titulo: "Ejercicio",
        parrafos: [
          "Descarga FOR-LOG-04 y costea un viaje Juárez–Torreón de ida y vuelta con retorno vacío. Compara la tarifa contra la misma ruta con retorno cargado y explica en tres renglones por qué las empresas pelean tanto por evitar el vacío.",
        ],
      },
    ],
  },
  {
    clave: "M5-L1",
    modulo: 5,
    submodulo: "Calidad y mejora continua",
    tipo: "apunte",
    titulo: "Indicadores logísticos (KPI) que sí se usan",
    descripcion: "Cómo se calculan los indicadores que revisa una gerencia de logística y qué decisión dispara cada uno.",
    duracion: "15 min de lectura",
    contenido: [
      {
        titulo: "Los seis indicadores de cajón",
        tabla: {
          encabezados: [
            "Indicador",
            "Fórmula",
            "Meta típica",
          ],
          filas: [
            [
              "Entregas a tiempo (OTIF)",
              "Entregas completas y puntuales ÷ entregas totales × 100",
              "95% o más",
            ],
            [
              "Exactitud de inventario",
              "Registros correctos ÷ registros contados × 100",
              "98% o más",
            ],
            [
              "Rotación de inventario",
              "Costo de ventas ÷ inventario promedio",
              "Depende del giro",
            ],
            [
              "Costo logístico sobre ventas",
              "Costo logístico ÷ ventas × 100",
              "Menos de 12%",
            ],
            [
              "Pedidos perfectos",
              "Sin errores de documento, cantidad ni daño ÷ total × 100",
              "97% o más",
            ],
            [
              "Utilización del transporte",
              "Capacidad usada ÷ capacidad disponible × 100",
              "85% o más",
            ],
          ],
        },
      },
      {
        titulo: "Ejemplo resuelto",
        parrafos: [
          "En marzo se despacharon 420 pedidos; 391 llegaron completos y a tiempo. OTIF = 391 ÷ 420 × 100 = 93.1%. Está por debajo de la meta de 95%, así que hay que abrir causa raíz: ¿fue el almacén, el transportista o la planeación?",
        ],
      },
      {
        titulo: "Un indicador sin decisión no sirve",
        lista: [
          "OTIF bajo → revisar el eslabón que falla, no regañar a todos.",
          "Exactitud baja → conteos cíclicos más frecuentes y revisar el Kardex.",
          "Rotación muy baja → hay dinero dormido en inventario obsoleto.",
          "Costo sobre ventas alto → consolidar embarques o renegociar fletes.",
        ],
        nota: "Medir por medir es burocracia. Cada indicador debe tener responsable, meta y fecha de revisión.",
      },
    ],
  },
  {
    clave: "M5-L2",
    modulo: 5,
    submodulo: "Calidad y mejora continua",
    tipo: "guia",
    titulo: "5S aplicadas al almacén escolar",
    descripcion: "Las cinco etapas con criterios de evaluación y formato de recorrido con evidencia fotográfica antes y después.",
    duracion: "12 min",
    contenido: [
      {
        titulo: "Las cinco etapas",
        tabla: {
          encabezados: [
            "S",
            "En japonés",
            "Qué se hace",
            "Cómo se comprueba",
          ],
          filas: [
            [
              "Clasificar",
              "Seiri",
              "Separar lo necesario de lo que estorba",
              "Tarjeta roja en lo que no se usó en 3 meses",
            ],
            [
              "Ordenar",
              "Seiton",
              "Un lugar para cada cosa",
              "Todo rotulado y con ubicación asignada",
            ],
            [
              "Limpiar",
              "Seiso",
              "Limpiar e inspeccionar a la vez",
              "Sin polvo, sin fugas, sin cajas en el piso",
            ],
            [
              "Estandarizar",
              "Seiketsu",
              "Dejar por escrito cómo debe verse",
              "Ayuda visual y checklist publicados",
            ],
            [
              "Disciplina",
              "Shitsuke",
              "Que se sostenga sin supervisión",
              "Auditoría semanal con calificación",
            ],
          ],
        },
      },
      {
        titulo: "Recorrido de diagnóstico",
        lista: [
          "Toma la foto del antes desde un punto fijo; la del después se toma desde ahí mismo.",
          "Califica cada S del 1 al 5 con evidencia, no con opinión.",
          "Levanta tarjeta roja a todo lo que no tenga dueño ni uso.",
          "Define responsable y fecha para cada hallazgo.",
          "Publica el tablero con la calificación de la semana.",
        ],
      },
      {
        titulo: "Criterios que reprueban de inmediato",
        lista: [
          "Extintor bloqueado o señalización tapada.",
          "Pasillo de circulación con material encima.",
          "Tarimas dañadas en uso.",
          "Producto sin identificación en zona de almacenaje.",
        ],
      },
    ],
  },
  {
    clave: "M5-L3",
    modulo: 5,
    submodulo: "Integración y prácticas profesionales",
    tipo: "apunte",
    titulo: "Cómo presentarte en una entrevista del sector logístico",
    descripcion: "Currículum de pasante, vocabulario técnico esperado, preguntas frecuentes y lo que valoran las empresas de la industria maquiladora.",
    duracion: "10 min de lectura",
    contenido: [
      {
        titulo: "Tu currículum de pasante",
        lista: [
          "Datos de contacto que funcionen: correo serio y un teléfono que contestes.",
          "Formación: CBTIS 270, Técnico en Logística, semestre en curso.",
          "Competencias con evidencia: 'elaboración de Kardex y control de existencias', 'llenado de Carta Porte', 'manejo de Excel'.",
          "Prácticas y proyectos escolares con resultados en números.",
          "Idiomas: nivel real de inglés. En la frontera pesa mucho.",
          "Una cuartilla. Nada más.",
        ],
      },
      {
        titulo: "Vocabulario que esperan escuchar",
        parrafos: [
          "Usa los términos correctos y sabiendo lo que significan: inventario cíclico, PEPS, OTIF, lead time, picking, cross docking, pedimento, fracción arancelaria, INCOTERM, tarima estándar, montacargas contrabalanceado.",
        ],
      },
      {
        titulo: "Preguntas frecuentes y cómo responderlas",
        tabla: {
          encabezados: [
            "Pregunta",
            "Lo que quieren saber",
          ],
          filas: [
            [
              "¿Qué harías si el inventario físico no cuadra con el sistema?",
              "Si sabes investigar antes de ajustar",
            ],
            [
              "¿Sabes usar Excel?",
              "Si manejas filtros, tablas dinámicas y fórmulas básicas",
            ],
            [
              "¿Puedes trabajar en turno nocturno?",
              "Disponibilidad real, no la que crees que quieren oír",
            ],
            [
              "¿Qué es un pedimento?",
              "Si entiendes el contexto aduanero de la ciudad",
            ],
          ],
        },
      },
      {
        titulo: "Lo que más valoran aquí",
        lista: [
          "Puntualidad demostrable.",
          "Cuidado con la documentación: un dato mal capturado cuesta dinero.",
          "Disposición a aprender el sistema que usen (SAP, WMS propio).",
          "Seguridad: que no te tengas que aprender el EPP en el camino.",
        ],
      },
    ],
  },
  {
    clave: "M5-L4",
    modulo: 5,
    submodulo: "Integración y prácticas profesionales",
    tipo: "caso",
    titulo: "Caso integrador: de la orden de compra a la entrega al cliente",
    descripcion: "Un pedido completo recorriendo los cinco módulos: compra, almacén, transporte, cruce fronterizo y entrega.",
    duracion: "sesión completa",
    contenido: [
      {
        titulo: "El encargo",
        parrafos: [
          "Una empresa de El Paso le compra a una planta de Ciudad Juárez 800 piezas de arnés automotriz por 24,000 USD. Tú llevas la operación completa y tienes que armar el expediente documental entero, como se entrega en una agencia.",
        ],
      },
      {
        titulo: "Lo que debe contener el expediente",
        lista: [
          "Orden de compra del insumo al proveedor nacional (FOR-LOG-02).",
          "Kardex de entrada del material y de salida del producto terminado (FOR-LOG-01).",
          "Checklist de seguridad del montacargas del día de la carga (FOR-LOG-06).",
          "Costeo del flete hasta el puente (FOR-LOG-04).",
          "Carta Porte del traslado nacional (FOR-LOG-03).",
          "Pedimento de exportación A1 con su cálculo de contribuciones (FOR-LOG-05).",
          "Lista de empaque y factura comercial.",
          "Hoja de indicadores: costo logístico total y su porcentaje sobre el valor de la venta.",
        ],
      },
      {
        titulo: "Criterios de evaluación",
        tabla: {
          encabezados: [
            "Criterio",
            "Puntos",
          ],
          filas: [
            [
              "Expediente completo y en orden",
              "30",
            ],
            [
              "Cálculos correctos y cuadrados entre documentos",
              "30",
            ],
            [
              "Coherencia: mismas cantidades, pesos y valores en todos los formatos",
              "25",
            ],
            [
              "Presentación y limpieza",
              "15",
            ],
          ],
        },
        nota: "Este caso es tu carta de presentación: si lo armas bien, ya sabes hacer el trabajo de un auxiliar de tráfico.",
      },
    ],
  },
];

export function materialesDelModulo(modulo: number | null): MaterialPrecargado[] {
  if (!modulo) return MATERIALES_PRECARGADOS;
  return MATERIALES_PRECARGADOS.filter((m) => m.modulo === modulo);
}

export function materialPorClave(clave: string): MaterialPrecargado | undefined {
  return MATERIALES_PRECARGADOS.find((m) => m.clave === clave);
}
