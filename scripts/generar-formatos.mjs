import ExcelJS from "exceljs";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "public/formatos";
mkdirSync(OUT, { recursive: true });

/* ============================================================
   DATOS INSTITUCIONALES OFICIALES
   ============================================================ */
const INST = {
  plantel: "CENTRO DE BACHILLERATO TECNOLÓGICO INDUSTRIAL Y DE SERVICIOS No. 270",
  plantelCorto: "CBTIS No. 270",
  carrera: "Carrera Técnica en Logística",
  direccion: "Calle Soneto No. 156, Col. Carlos Castillo Peraza",
  ciudad: "C.P. 32575 · Ciudad Juárez, Chihuahua, México",
  cct: "08DCT0270T",
  telefono: "(656) 887 4342",
  correo: "contacto@cbtis270.edu.mx",
  web: "www.cbtis270.edu.mx",
  dependencia: "SEP · DGETI · DGPT",
  plataforma: "Plataforma Institucional de Logística · CBTIS 270",
  url: "https://cbtis270.edu.mx",
};

const AZUL = "FF1D5BD5";
const AZUL_OSCURO = "FF17295A";
const GRIS = "FFF1F5F9";

function encabezadoHoja(ws, tituloFormato, codigo, anchoTotal) {
  ws.mergeCells(1, 1, 1, anchoTotal);
  const c1 = ws.getCell(1, 1);
  c1.value = INST.plantel;
  c1.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  c1.alignment = { horizontal: "center", vertical: "middle" };
  c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
  ws.getRow(1).height = 24;

  ws.mergeCells(2, 1, 2, anchoTotal);
  const c2 = ws.getCell(2, 1);
  c2.value = `${INST.dependencia}  ·  ${INST.carrera}  ·  CCT ${INST.cct}`;
  c2.font = { size: 10, color: { argb: "FFFFFFFF" } };
  c2.alignment = { horizontal: "center", vertical: "middle" };
  c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_OSCURO } };
  ws.getRow(2).height = 18;

  ws.mergeCells(3, 1, 3, anchoTotal);
  const c3 = ws.getCell(3, 1);
  c3.value = `${tituloFormato}    |    ${codigo}    |    Rev. 2026`;
  c3.font = { bold: true, size: 11, color: { argb: "FF17295A" } };
  c3.alignment = { horizontal: "center", vertical: "middle" };
  c3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEEFE" } };
  ws.getRow(3).height = 20;

  ws.mergeCells(4, 1, 4, anchoTotal);
  const c4 = ws.getCell(4, 1);
  c4.value = `${INST.direccion} · ${INST.ciudad} · Tel. ${INST.telefono} · ${INST.correo}`;
  c4.font = { size: 8, italic: true, color: { argb: "FF475569" } };
  c4.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(4).height = 14;
}

function filaEncabezados(ws, fila, valores) {
  const row = ws.getRow(fila);
  valores.forEach((v, i) => {
    const cell = row.getCell(i + 1);
    cell.value = v;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_OSCURO } };
    cell.border = {
      top: { style: "thin", color: { argb: "FF93CDFC" } },
      left: { style: "thin", color: { argb: "FF93CDFC" } },
      bottom: { style: "thin", color: { argb: "FF93CDFC" } },
      right: { style: "thin", color: { argb: "FF93CDFC" } },
    };
  });
  row.height = 30;
}

function pieFirmas(ws, filaInicio, anchoTotal, etiquetas) {
  let fila = filaInicio + 1;
  ws.mergeCells(fila, 1, fila, anchoTotal);
  const nota = ws.getCell(fila, 1);
  nota.value =
    "Este documento es un formato académico institucional generado por la Plataforma de Logística del CBTIS No. 270. " +
    "Su uso es exclusivamente didáctico dentro del módulo correspondiente.";
  nota.font = { size: 8, italic: true, color: { argb: "FF64748B" } };
  nota.alignment = { horizontal: "center", wrapText: true };
  ws.getRow(fila).height = 26;

  fila += 2;
  const total = etiquetas.length;
  const anchoPor = Math.floor(anchoTotal / total);
  etiquetas.forEach((etq, i) => {
    const desde = i * anchoPor + 1;
    const hasta = i === total - 1 ? anchoTotal : desde + anchoPor - 1;
    ws.mergeCells(fila, desde, fila, hasta);
    const c = ws.getCell(fila, desde);
    c.value = "________________________________";
    c.alignment = { horizontal: "center" };
    c.font = { size: 10 };

    ws.mergeCells(fila + 1, desde, fila + 1, hasta);
    const n = ws.getCell(fila + 1, desde);
    n.value = etq;
    n.alignment = { horizontal: "center", wrapText: true };
    n.font = { bold: true, size: 9, color: { argb: "FF17295A" } };
  });
}

/* ============================================================
   1. KARDEX DE CONTROL DE EXISTENCIAS
   ============================================================ */
async function kardex() {
  const wb = new ExcelJS.Workbook();
  wb.creator = INST.plataforma;
  const ws = wb.addWorksheet("Kardex PEPS", { views: [{ state: "frozen", ySplit: 9 }] });

  const anchos = [6, 12, 11, 30, 12, 10, 10, 12, 12, 12, 12, 14, 16, 22];
  ws.columns = anchos.map((w) => ({ width: w }));
  encabezadoHoja(ws, "KARDEX DE CONTROL DE EXISTENCIAS", "FOR-LOG-01", anchos.length);

  // Datos generales
  const datos = [
    ["Almacén:", "Almacén Escuela · Edificio C", "Producto / SKU:", ""],
    ["Submódulo:", "Control de inventarios y conteo cíclico", "Descripción:", ""],
    ["Docente:", "", "Unidad de medida:", ""],
    ["Semestre / Grupo:", "2° / E · Matutino", "Método de valuación:", "PEPS"],
    ["Alumno:", "", "Existencia mínima:", ""],
    ["Fecha inicio:", "", "Existencia máxima:", ""],
  ];
  let f = 6;
  datos.forEach((d) => {
    ws.getCell(f, 1).value = d[0];
    ws.getCell(f, 1).font = { bold: true, size: 9 };
    ws.mergeCells(f, 2, f, 5);
    ws.getCell(f, 2).value = d[1];
    ws.getCell(f, 6).value = d[2];
    ws.getCell(f, 6).font = { bold: true, size: 9 };
    ws.mergeCells(f, 7, f, 10);
    ws.getCell(f, 7).value = d[3];
    f++;
  });

  const encFila = 13;
  filaEncabezados(ws, encFila, [
    "#", "FECHA", "DOC. / REF.", "CONCEPTO / MOVIMIENTO", "TIPO", "ENTRADAS", "SALIDAS",
    "EXISTENCIA", "P. UNIT. ENT.", "P. UNIT. SAL.", "PROMEDIO", "IMPORTE", "SALDO", "OBSERVACIONES",
  ]);

  const movimientos = [
    ["2026-01-12", "OC-2026-001", "Compra inicial a proveedor local", "Entrada", 120, 85.5, "", ""],
    ["2026-01-15", "REQ-2026-014", "Requisición de producción línea A", "Salida", 45, 85.5, "", ""],
    ["2026-01-19", "OC-2026-008", "Compra a proveedor foráneo", "Entrada", 80, 92.0, "", ""],
    ["2026-01-22", "REQ-2026-021", "Requisición mantenimiento", "Salida", 30, 85.5, "", ""],
    ["2026-01-26", "DEV-2026-003", "Devolución de cliente", "Entrada", 10, 88.0, "", ""],
    ["2026-01-29", "REQ-2026-035", "Requisición producción línea B", "Salida", 55, 85.5, "", ""],
    ["2026-02-02", "AJT-2026-002", "Ajuste por conteo cíclico", "Entrada", 4, 88.0, "", ""],
    ["2026-02-05", "REQ-2026-048", "Requisición empaque", "Salida", 28, 88.0, "", ""],
    ["2026-02-09", "OC-2026-019", "Compra urgente", "Entrada", 60, 95.0, "", ""],
    ["2026-02-13", "REQ-2026-052", "Requisición producción línea A", "Salida", 40, 92.0, "", ""],
  ];

  let existencia = 0;
  let saldo = 0;
  movimientos.forEach((m, i) => {
    const r = encFila + 1 + i;
    const row = ws.getRow(r);
    const esEntrada = m[3] === "Entrada";
    const cant = esEntrada ? m[4] : m[5];
    const pu = m[esEntrada ? 5 : 6];

    existencia = esEntrada ? existencia + cant : existencia - cant;
    if (esEntrada) saldo += cant * pu;
    else saldo -= cant * pu;

    row.values = [
      i + 1, m[0], m[1], m[2], m[3],
      esEntrada ? cant : "", esEntrada ? "" : cant,
      existencia, esEntrada ? pu : "", esEntrada ? "" : pu, "", "", Number(saldo.toFixed(2)), m[7],
    ];
    row.alignment = { horizontal: "center", vertical: "middle" };
    row.font = { size: 9 };
    row.eachCell((cell, col) => {
      cell.border = {
        top: { style: "hair", color: { argb: "FFCBD5E1" } },
        left: { style: "hair", color: { argb: "FFCBD5E1" } },
        bottom: { style: "hair", color: { argb: "FFCBD5E1" } },
        right: { style: "hair", color: { argb: "FFCBD5E1" } },
      };
      if (col === 6) cell.font = { size: 9, color: { argb: "FF166534" } };
      if (col === 7) cell.font = { size: 9, color: { argb: "FF9F1239" } };
    });
  });

  const filaFinal = encFila + movimientos.length + 1;
  ws.mergeCells(filaFinal, 1, filaFinal, 5);
  ws.getCell(filaFinal, 1).value = "TOTALES DEL PERIODO";
  ws.getCell(filaFinal, 1).font = { bold: true, size: 10 };
  ws.getCell(filaFinal, 1).alignment = { horizontal: "right" };
  ws.getCell(filaFinal, 8).value = existencia;
  ws.getCell(filaFinal, 13).value = Number(saldo.toFixed(2));
  ws.getRow(filaFinal).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEEFE" } };
    cell.font = { bold: true, size: 10, color: { argb: "FF17295A" } };
    cell.border = { top: { style: "medium", color: { argb: AZUL } } };
  });

  // Instrucciones
  let fi = filaFinal + 2;
  ws.mergeCells(fi, 1, fi, anchos.length);
  ws.getCell(fi, 1).value = "INSTRUCCIONES DE LLENADO";
  ws.getCell(fi, 1).font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  ws.getCell(fi, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
  fi++;
  const instrucciones = [
    "1. Registre cada movimiento de forma cronológica, sin dejar renglones en blanco.",
    "2. El campo TIPO sólo admite los valores: Entrada, Salida o Ajuste.",
    "3. En método PEPS las salidas se valúan con el precio de las entradas más antiguas (First In, First Out).",
    "4. En método UEPS las salidas se valúan con el precio de las últimas entradas (Last In, First Out).",
    "5. En método PROMEDIO el precio unitario se recalcula: (saldo anterior + importe entrada) ÷ (existencia anterior + entrada).",
    "6. El conteo cíclico debe cuadrar contra la existencia física; toda diferencia se registra como Ajuste.",
    "7. Documente siempre la referencia (OC, REQ, DEV o AJT) para garantizar la trazabilidad del movimiento.",
    "8. Al cierre del periodo verifique: Existencia final = Entradas totales − Salidas totales.",
  ];
  instrucciones.forEach((t) => {
    ws.mergeCells(fi, 1, fi, anchos.length);
    const c = ws.getCell(fi, 1);
    c.value = t;
    c.font = { size: 9 };
    c.alignment = { wrapText: true, vertical: "middle" };
    fi++;
  });

  pieFirmas(ws, fi, anchos.length, [
    "ALUMNO QUE ELABORA", "DOCENTE RESPONSABLE", "JEFE DE ALMACÉN", "CONTROL ESCOLAR CBTIS 270",
  ]);

  await wb.xlsx.writeFile(`${OUT}/FOR-LOG-01_Kardex-de-Control-de-Existencias_CBTIS270.xlsx`);
}

/* ============================================================
   2. ORDEN DE COMPRA
   ============================================================ */
async function ordenCompra() {
  const wb = new ExcelJS.Workbook();
  wb.creator = INST.plataforma;
  const ws = wb.addWorksheet("Orden de Compra", { views: [{ state: "frozen", ySplit: 11 }] });

  const anchos = [6, 14, 34, 14, 12, 14, 14, 16, 24];
  ws.columns = anchos.map((w) => ({ width: w }));
  encabezadoHoja(ws, "ORDEN DE COMPRA Y REQUISICIÓN DE MATERIALES", "FOR-LOG-02", anchos.length);

  let f = 6;
  const bloques = [
    ["ORDEN DE COMPRA No.:", "OC-2026-____", "FECHA DE EMISIÓN:", ""],
    ["PROVEEDOR:", "", "FECHA REQUERIDA:", ""],
    ["RFC DEL PROVEEDOR:", "", "CONDICIONES DE PAGO:", "30 días"],
    ["CONTACTO / TELÉFONO:", "", "MONEDA:", "MXN"],
    ["SOLICITA (SUBMÓDULO):", "Compras y abastecimiento", "INCOTERMS:", "EXW"],
    ["DEPARTAMENTO:", "Logística · CBTIS 270", "LUGAR DE ENTREGA:", "Almacén Escuela Edificio C"],
  ];
  bloques.forEach((d) => {
    ws.getCell(f, 1).value = d[0];
    ws.getCell(f, 1).font = { bold: true, size: 9 };
    ws.mergeCells(f, 2, f, 4);
    ws.getCell(f, 2).value = d[1];
    ws.getCell(f, 5).value = d[2];
    ws.getCell(f, 5).font = { bold: true, size: 9 };
    ws.mergeCells(f, 6, f, 9);
    ws.getCell(f, 6).value = d[3];
    f++;
  });

  const encFila = 13;
  filaEncabezados(ws, encFila, [
    "#", "CLAVE / SKU", "DESCRIPCIÓN DEL BIEN O SERVICIO", "UNIDAD", "CANTIDAD",
    "P. UNITARIO", "DESCUENTO %", "IMPORTE", "OBSERVACIONES",
  ]);

  const partidas = [
    ["MAT-ALM-1001", "Tarima de madera estándar 1.00 x 1.20 m", "PIEZA", 40, 385.0, 0, "Grado industrial"],
    ["MAT-ALM-1002", "Cinta de emplayado plástico 500 m", "ROLO", 12, 148.5, 5, "Transparente 20 micras"],
    ["MAT-TRN-2001", "Banda de sujeción poliéster 5 t", "PIEZA", 8, 412.0, 0, "Con catraca"],
    ["MAT-SEG-3001", "Chaleco reflejante talla estándar", "PIEZA", 30, 96.0, 10, "Certificado NOM"],
    ["MAT-SEG-3002", "Calzado con casquillo talla 27", "PAR", 30, 689.0, 0, "Punta de acero"],
    ["MAT-EMP-4001", "Caja de cartón corrugado 40x30x30", "PIEZA", 200, 22.5, 0, "Doble pared"],
    ["MAT-ALM-1003", "Etiqueta térmica código de barras", "MILLAR", 3, 320.0, 0, "4x6 pulgadas"],
    ["SER-CAP-5001", "Servicio de capacitación en manejo de montacargas", "HORA", 8, 850.0, 0, "Instructor certificado STPS"],
  ];

  partidas.forEach((p, i) => {
    const r = encFila + 1 + i;
    const row = ws.getRow(r);
    const importe = p[3] * p[4] * (1 - p[5] / 100);
    row.values = [i + 1, p[0], p[1], p[2], p[3], p[4], p[5], Number(importe.toFixed(2)), p[6]];
    row.font = { size: 9 };
    row.alignment = { vertical: "middle", wrapText: true };
    row.getCell(3).alignment = { horizontal: "left", wrapText: true };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "hair", color: { argb: "FFCBD5E1" } },
        left: { style: "hair", color: { argb: "FFCBD5E1" } },
        bottom: { style: "hair", color: { argb: "FFCBD5E1" } },
        right: { style: "hair", color: { argb: "FFCBD5E1" } },
      };
    });
  });

  const filas = partidas.length;
  const sub = partidas.reduce((a, p) => a + p[3] * p[4], 0);
  const desc = partidas.reduce((a, p) => a + p[3] * p[4] * (p[5] / 100), 0);
  const subtotal = sub - desc;
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  let rf = encFila + filas + 1;
  const resumen = [
    ["SUBTOTAL", Number(sub.toFixed(2))],
    ["DESCUENTOS", -Number(desc.toFixed(2))],
    ["SUBTOTAL NETO", Number(subtotal.toFixed(2))],
    ["IVA 16%", Number(iva.toFixed(2))],
    ["TOTAL", Number(total.toFixed(2))],
  ];
  resumen.forEach(([k, v], i) => {
    const esTotal = i === resumen.length - 1;
    ws.mergeCells(rf, 6, rf, 7);
    ws.getCell(rf, 6).value = k;
    ws.getCell(rf, 6).font = { bold: esTotal, size: 10 };
    ws.getCell(rf, 6).alignment = { horizontal: "right" };
    ws.getCell(rf, 8).value = v;
    ws.getCell(rf, 8).numFmt = '"$"#,##0.00';
    ws.getCell(rf, 8).font = { bold: true, size: esTotal ? 12 : 10 };
    if (esTotal) {
      for (let c = 6; c <= 8; c++) {
        ws.getCell(rf, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEEFE" } };
      }
    }
    rf++;
  });

  pieFirmas(ws, rf + 1, anchos.length, [
    "SOLICITANTE", "JEFE DE COMPRAS", "AUTORIZA DIRECCIÓN", "PROVEEDOR",
  ]);

  await wb.xlsx.writeFile(`${OUT}/FOR-LOG-02_Orden-de-Compra_CBTIS270.xlsx`);
}

/* ============================================================
   3. CARTA PORTE (SAT)
   ============================================================ */
async function cartaPorte() {
  const wb = new ExcelJS.Workbook();
  wb.creator = INST.plataforma;
  const ws = wb.addWorksheet("Carta Porte", { views: [{ state: "frozen", ySplit: 9 }] });
  const anchos = [6, 18, 30, 16, 16, 16, 16, 26];
  ws.columns = anchos.map((w) => ({ width: w }));
  encabezadoHoja(ws, "COMPLEMENTO CARTA PORTE · GUIA DE LLENADO", "FOR-LOG-03", anchos.length);

  let f = 6;
  const datos = [
    ["CFDI RELACIONADO (UUID):", "", "TIPO DE TRANSPORTE:", "Carretero Federal"],
    ["RÉGIMEN ADUANERO:", "Definitivo", "VÍA DE ENTRADA/SALIDA:", "Aérea"],
    ["ORIGEN:", "Almacén Escuela CBTIS 270, Ciudad Juárez, Chih.", "DESTINO:", "CEDIS Regional, Chihuahua, Chih."],
    ["DISTANCIA TOTAL (KM):", "", "FECHA Y HORA SALIDA:", ""],
  ];
  datos.forEach((d) => {
    ws.getCell(f, 1).value = d[0];
    ws.getCell(f, 1).font = { bold: true, size: 9 };
    ws.mergeCells(f, 2, f, 4);
    ws.getCell(f, 2).value = d[1];
    ws.getCell(f, 5).value = d[2];
    ws.getCell(f, 5).font = { bold: true, size: 9 };
    ws.mergeCells(f, 6, f, 8);
    ws.getCell(f, 6).value = d[3];
    f++;
  });

  const enc1 = 11;
  filaEncabezados(ws, enc1, ["#", "CAMPO DEL COMPLEMENTO", "DESCRIPCIÓN / QUÉ SE CAPTURA", "OBLIGATORIO", "CATÁLOGO SAT", "EJEMPLO", "ERROR COMÚN", "OBSERVACIONES"]);

  const guia = [
    ["TranspInternac", "Indica si el traslado es internacional", "Sí", "c_TipoDeServicio", "No", "Olvidar marcarlo cuando cruza la frontera"],
    ["EntradaSalidaMerc", "Entrada o salida de mercancía al país", "Sí", "c_TipoDeServicio", "Salida", "Confundir con tipo de CFDI"],
    ["ViaEntradaSalida", "Medio por el que entra o sale la mercancía", "Sí", "c_ViaEntradaSalida", "Carretera", "Dejar el catálogo vacío"],
    ["TotalDistRec", "Distancia total recorrida en kilómetros", "Sí", "—", "345", "Redondear o estimar sin sustento"],
    ["UVI / Ubicación origen", "Domicilio del punto de carga", "Sí", "c_CodigoPostal", "32575", "Usar un CP distinto al domicilio fiscal"],
    ["FechaHoraSalida", "Momento exacto de salida de la unidad", "Sí", "—", "2026-03-05T08:00:00", "Capturar fecha posterior al timbrado"],
    ["RFC Transportista", "RFC de la empresa de transporte", "Sí", "—", "ABC120456XYZ", "Capturar el nombre en lugar del RFC"],
    ["NumLicencia", "Licencia federal del operador", "Sí", "—", "LF-784512", "Omitir licencia de particular"],
    ["TipoPermiso", "Tipo de permiso SCT vigente", "Sí", "c_TipoPermiso", "TPAF01", "Capturar permiso vencido"],
    ["PlacaVM", "Placa del vehículo motor", "Sí", "—", "JX-45-782", "No coincidir con la tarjeta de circulación"],
    ["ConfigVehicular", "Configuración de la unidad de arrastre", "Sí", "c_ConfigVehicular", "C2", "Confundir remolque con vehículo motor"],
    ["PesoBrutoTotal", "Peso bruto vehicular combinado (kg)", "Sí", "—", "24500", "Poner sólo el peso de la carga"],
    ["Mercancia BienesTransp", "Clave de producto de cada mercancía", "Sí", "c_ClaveProdServ", "78101800", "Usar descripción libre sin clave SAT"],
    ["Cantidad / ClaveUnidad", "Cantidad y unidad de medida", "Sí", "c_ClaveUnidad", "H87", "No coincidir con el CFDI origen"],
    ["ValorMercancia", "Valor económico declarado de la mercancía", "Sí", "—", "45800.00", "Poner valor inferior al facturado"],
    ["PesoEnKg", "Peso de la mercancía en kilogramos", "Sí", "—", "1250", "Confundir kilogramos con toneladas"],
    ["FiguraTransporte", "Datos del operador (fig. de transporte)", "Sí", "c_TipoFigura", "01 Operador", "Omitir el tipo de figura"],
    ["Ubicación destino", "Domicilio del punto de descarga", "Sí", "c_CodigoPostal", "31000", "Invertir origen con destino"],
  ];

  guia.forEach((g, i) => {
    const r = enc1 + 1 + i;
    const row = ws.getRow(r);
    row.values = [i + 1, g[0], g[1], g[2], g[3], g[4], g[5], ""];
    row.font = { size: 9 };
    row.alignment = { vertical: "middle", wrapText: true };
    row.eachCell((cell, col) => {
      cell.border = {
        top: { style: "hair", color: { argb: "FFCBD5E1" } },
        left: { style: "hair", color: { argb: "FFCBD5E1" } },
        bottom: { style: "hair", color: { argb: "FFCBD5E1" } },
        right: { style: "hair", color: { argb: "FFCBD5E1" } },
      };
      if (col === 2) cell.font = { size: 9, bold: true, color: { argb: "FF17295A" } };
      if (col === 4) cell.alignment = { horizontal: "center" };
    });
  });

  let fi = enc1 + guia.length + 2;
  ws.mergeCells(fi, 1, fi, anchos.length);
  ws.getCell(fi, 1).value = "MARCO NORMATIVO Y NOTAS";
  ws.getCell(fi, 1).font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  ws.getCell(fi, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
  fi++;
  const notas = [
    "El Complemento Carta Porte es obligatorio para el traslado de mercancías en territorio nacional conforme a la RMF 2026, ficha 2.2.24.",
    "Debe emitirse junto con el CFDI de Ingreso, Traslado o Egreso; no es un documento independiente.",
    "La carta porte debe expedirse al momento en que la mercancía sea trasladada; no se admite su emisión posterior.",
    "Catálogos vigentes publicados por el SAT: c_ClaveProdServ, c_ClaveUnidad, c_ConfigVehicular, c_TipoPermiso, c_ViaEntradaSalida.",
    "La inconsistencia entre el CFDI origen y el Carta Porte es causa de reintento de auditoría y bloqueo de folios.",
    "Consulta oficial: https://www.sat.gob.mx/consulta/complemento-carta-porte",
  ];
  notas.forEach((t) => {
    ws.mergeCells(fi, 1, fi, anchos.length);
    const c = ws.getCell(fi, 1);
    c.value = "• " + t;
    c.font = { size: 9 };
    c.alignment = { wrapText: true, vertical: "middle" };
    fi++;
  });

  pieFirmas(ws, fi, anchos.length, [
    "OPERADOR", "COORDINADOR DE TRÁFICO", "DOCENTE RESPONSABLE", "ALUMNO QUE ELABORA",
  ]);

  await wb.xlsx.writeFile(`${OUT}/FOR-LOG-03_Carta-Porte-Guia-de-Llenado_CBTIS270.xlsx`);
}

/* ============================================================
   4. COSTEO DE FLETES Y RUTAS
   ============================================================ */
async function costeoFletes() {
  const wb = new ExcelJS.Workbook();
  wb.creator = INST.plataforma;

  /* Hoja 1: costeo */
  const ws = wb.addWorksheet("Costeo de Flete", { views: [{ state: "frozen", ySplit: 9 }] });
  const anchos = [6, 34, 16, 16, 40];
  ws.columns = anchos.map((w) => ({ width: w }));
  encabezadoHoja(ws, "MATRIZ DE COSTEO DE FLETES Y RUTAS", "FOR-LOG-04", anchos.length);

  let f = 6;
  const datos = [
    ["RUTA:", "Ciudad Juárez → Chihuahua (CD) Regional", "DISTANCIA IDA (KM):", 378],
    ["TIPO DE UNIDAD:", "Caja seca 48 pies", "RETORNO (KM):", 378],
    ["CAPACIDAD DE CARGA (KG):", 24000, "RENDIMIENTO (KM/L):", 2.4],
    ["VELOCIDAD PROMEDIO (KM/H):", 70, "VIAJES AL MES:", 8],
  ];
  datos.forEach((d) => {
    ws.getCell(f, 1).value = d[0];
    ws.getCell(f, 1).font = { bold: true, size: 9 };
    ws.mergeCells(f, 2, f, 2);
    ws.getCell(f, 2).value = d[1];
    ws.getCell(f, 3).value = d[2];
    ws.getCell(f, 3).font = { bold: true, size: 9 };
    ws.mergeCells(f, 4, f, 5);
    ws.getCell(f, 4).value = d[3];
    f++;
  });

  const encFila = 11;
  filaEncabezados(ws, encFila, ["#", "CONCEPTO DE COSTO", "CANTIDAD", "COSTO UNITARIO", "NOTAS / SUPUESTOS"]);

  const conceptos = [
    ["Diésel", "litros", 315.0, "Distancia total ÷ rendimiento"],
    ["Operador (sueldo)", "viaje", 1850.0, "Salario base + prestaciones"],
    ["Casetas / CAPUFE", "viaje", 1680.0, "Consulta tarifa oficial por eje"],
    ["Mantenimiento", "km", 1.35, "Preventivo y correctivo prorrateado"],
    ["Llantas", "km", 0.95, "Vida útil 120,000 km, 10 llantas"],
    ["Seguro de carga", "viaje", 1240.0, "Póliza por valor declarado"],
    ["Seguro de responsabilidad civil", "viaje", 480.0, "Cobertura a terceros"],
    ["Depreciación de la unidad", "km", 2.85, "Valor en libros ÷ vida útil en km"],
    ["Administración / overhead", "%", 0.12, "12% sobre costos directos"],
    ["Utilidad esperada", "%", 0.22, "Margen sobre costo total"],
  ];

  conceptos.forEach((c, i) => {
    const r = encFila + 1 + i;
    const row = ws.getRow(r);
    row.values = [i + 1, c[0], c[1], c[2], c[3]];
    row.font = { size: 9 };
    row.alignment = { vertical: "middle", wrapText: true };
    row.getCell(2).alignment = { horizontal: "left" };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "hair", color: { argb: "FFCBD5E1" } },
        left: { style: "hair", color: { argb: "FFCBD5E1" } },
        bottom: { style: "hair", color: { argb: "FFCBD5E1" } },
        right: { style: "hair", color: { argb: "FFCBD5E1" } },
      };
    });
  });

  let fi = encFila + conceptos.length + 2;
  ws.mergeCells(fi, 1, fi, anchos.length);
  ws.getCell(fi, 1).value = "METODOLOGÍA DE CÁLCULO";
  ws.getCell(fi, 1).font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  ws.getCell(fi, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
  fi++;
  const metodo = [
    "1. Costo directo = Diésel + Operador + Casetas + Mantenimiento + Llantas + Seguros + Depreciación.",
    "2. Diésel requerido = Distancia total recorrida ÷ Rendimiento del vehículo (KM/L).",
    "3. Overhead administrativo = Costo directo × porcentaje de administración (se recomienda 10%–15%).",
    "4. Costo total = Costo directo + Overhead administrativo.",
    "5. Precio de venta = Costo total + Utilidad esperada (margen típico 18%–25% en transporte local).",
    "6. Costo por kilómetro = Precio de venta ÷ Distancia total recorrida.",
    "7. Costo por tonelada = Precio de venta ÷ Toneladas transportadas (comparar contra tarifa de mercado).",
    "8. Punto de equilibrio = Costos fijos del periodo ÷ (precio por tonelada − costo variable por tonelada).",
    "9. Recomendación: comparar el costo por tonelada contra el flete de mercado antes de cerrar tarifa.",
    "10. Documentar siempre el rendimiento real del vehículo; el consumo cambia con carga, clima y topografía.",
  ];
  metodo.forEach((t) => {
    ws.mergeCells(fi, 1, fi, anchos.length);
    const c = ws.getCell(fi, 1);
    c.value = t;
    c.font = { size: 9 };
    c.alignment = { wrapText: true, vertical: "middle" };
    fi++;
  });

  pieFirmas(ws, fi, anchos.length, [
    "ALUMNO QUE ELABORA", "DOCENTE RESPONSABLE", "COORDINADOR DE TRÁFICO", "CONTROL ESCOLAR CBTIS 270",
  ]);

  /* Hoja 2: comparativo de rutas */
  const ws2 = wb.addWorksheet("Comparativo de Rutas", { views: [{ state: "frozen", ySplit: 8 }] });
  const a2 = [6, 28, 14, 14, 16, 16, 16, 18];
  ws2.columns = a2.map((w) => ({ width: w }));
  encabezadoHoja(ws2, "COMPARATIVO DE ALTERNATIVAS DE RUTA", "FOR-LOG-04 (Anexo A)", a2.length);

  filaEncabezados(ws2, 6, [
    "#", "RUTA", "KM", "DIÉSEL (L)", "COSTO DIRECTO", "COSTO TOTAL", "PRECIO VENTA", "COSTO POR TONELADA",
  ]);

  const rutas = [
    ["Juárez → Chihuahua por Libramiento", 378, 315.0, 0, 0],
    ["Juárez → Chihuahua por carretera libre", 362, 302.0, 0, 0],
    ["Juárez → El Paso (EUA) trasbordo", 412, 344.0, 0, 0],
    ["Juárez → Delicias consolidado", 415, 346.0, 0, 0],
    ["Juárez → Ciudad Camargo directo", 508, 423.0, 0, 0],
  ];

  rutas.forEach((r, i) => {
    const row = ws2.getRow(7 + i);
    row.values = [i + 1, r[0], r[1], r[2], r[3], r[4], "", ""];
    row.font = { size: 9 };
    row.getCell(2).alignment = { horizontal: "left" };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "hair", color: { argb: "FFCBD5E1" } },
        left: { style: "hair", color: { argb: "FFCBD5E1" } },
        bottom: { style: "hair", color: { argb: "FFCBD5E1" } },
        right: { style: "hair", color: { argb: "FFCBD5E1" } },
      };
    });
  });

  pieFirmas(ws2, 7 + rutas.length + 2, a2.length, [
    "ALUMNO QUE ELABORA", "DOCENTE RESPONSABLE", "CONTROL ESCOLAR CBTIS 270", "DGETI",
  ]);

  await wb.xlsx.writeFile(`${OUT}/FOR-LOG-04_Costeo-de-Fletes-y-Rutas_CBTIS270.xlsx`);
}

/* ============================================================
   5. PEDIMENTO ADUANAL
   ============================================================ */
async function pedimento() {
  const wb = new ExcelJS.Workbook();
  wb.creator = INST.plataforma;
  const ws = wb.addWorksheet("Pedimento A1", { views: [{ state: "frozen", ySplit: 9 }] });
  const anchos = [6, 30, 20, 16, 16, 40];
  ws.columns = anchos.map((w) => ({ width: w }));
  encabezadoHoja(ws, "PEDIMENTO ADUANAL DE IMPORTACIÓN · REGIMEN DEFINITIVO A1", "FOR-LOG-05", anchos.length);

  let f = 6;
  const encabezado = [
    ["PEDIMENTO No.:", "", "FECHA DE ENTRADA:", ""],
    ["ADUANA DE DESPACHO:", "240 · Ciudad Juárez, Chih.", "PATENTE / AGENCIA ADUANAL:", ""],
    ["TIPO DE OPERACIÓN:", "Importación", "REGIMEN:", "Definitivo (A1)"],
    ["IMPORTADOR / RFC:", "", "CURP DEL IMPORTADOR:", ""],
    ["DOMICILIO FISCAL:", "", "CODIGO POSTAL:", ""],
    ["PAIS ORIGEN:", "China (156)", "PAIS VENDEDOR / PROCEDENCIA:", ""],
    ["INCOTERMS:", "FOB", "MONEDA / TIPO DE CAMBIO:", "USD"],
    ["PESO BRUTO (KG):", "", "PESO NETO (KG):", ""],
    ["MEDIO DE TRANSPORTE:", "Carretero", "FECHA PAGO DE CONTRIBUCIONES:", ""],
  ];
  encabezado.forEach((d) => {
    ws.getCell(f, 1).value = d[0];
    ws.getCell(f, 1).font = { bold: true, size: 9 };
    ws.mergeCells(f, 2, f, 3);
    ws.getCell(f, 2).value = d[1];
    ws.getCell(f, 4).value = d[2];
    ws.getCell(f, 4).font = { bold: true, size: 9 };
    ws.mergeCells(f, 5, f, 6);
    ws.getCell(f, 5).value = d[3];
    f++;
  });

  const encFila = f + 1;
  filaEncabezados(ws, encFila, [
    "#", "FRACCIÓN ARANCELARIA (TIGIE)", "DESCRIPCIÓN DE LA MERCANCÍA", "UMT", "CANTIDAD UMT", "VALOR EN ADUANA (USD)",
  ]);

  const fracciones = [
    ["8471.30.01", "Máquinas automáticas para tratamiento de datos portátiles", "PIEZA", 50, 18500.0],
    ["8504.40.02", "Convertidores estáticos de energía eléctrica", "PIEZA", 120, 24600.0],
    ["8536.69.01", "Interruptores, conmutadores y seccionadores", "PIEZA", 300, 9800.0],
    ["3923.30.01", "Envases plásticos para transporte de mercancías", "KILOGRAMO", 850, 4200.0],
    ["8544.42.02", "Conductores eléctricos con piezas de conexión", "METRO", 2400, 7600.0],
    ["9403.20.01", "Muebles metálicos para oficina", "PIEZA", 35, 6400.0],
  ];

  fracciones.forEach((fr, i) => {
    const r = encFila + 1 + i;
    const row = ws.getRow(r);
    row.values = [i + 1, fr[0], fr[1], fr[2], fr[3], fr[4]];
    row.font = { size: 9 };
    row.alignment = { vertical: "middle", wrapText: true };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "hair", color: { argb: "FFCBD5E1" } },
        left: { style: "hair", color: { argb: "FFCBD5E1" } },
        bottom: { style: "hair", color: { argb: "FFCBD5E1" } },
        right: { style: "hair", color: { argb: "FFCBD5E1" } },
      };
      if (col2(cell)) cell.font = { size: 9, bold: true, color: { argb: "FF17295A" } };
    });
  });

  function col2(cell) {
    return cell.value === fracciones.find((x) => x[0] === cell.value)?.[0];
  }

  const valorMerc = fracciones.reduce((a, x) => a + x[4], 0);
  const flete = valorMerc * 0.045;
  const seguro = valorMerc * 0.008;
  const valorAduana = valorMerc + flete + seguro;
  const tigie = valorAduana * 0.05;
  const ivaBase = valorAduana + tigie;
  const iva = ivaBase * 0.16;
  const prer = ivaBase * 0.0048;
  const total = valorAduana + tigie + iva + prer;

  let rf = encFila + fracciones.length + 1;
  const contribuciones = [
    ["VALOR EN ADUANA (USD)", valorMerc.toFixed(2)],
    ["FLETE INTERNACIONAL (4.5%)", flete.toFixed(2)],
    ["SEGURO (0.8%)", seguro.toFixed(2)],
    ["VALOR EN ADUANA (V.A.D.) TOTAL", valorAduana.toFixed(2)],
    ["IGI / TIGIE (5% arancel promedio)", tigie.toFixed(2)],
    ["BASE GRAVABLE DEL IVA (V.A.D. + IGI)", ivaBase.toFixed(2)],
    ["IVA 16%", iva.toFixed(2)],
    ["PRV (0.048%)", prer.toFixed(2)],
    ["DTA / DERECHOS DE TRÁMITE ADUANERO", "Según tarifa vigente"],
    ["PREVALIDACIÓN DIGITAL", "Según tarifa vigente"],
    ["TOTAL DE CONTRIBUCIONES Y CUOTAS COMPENSATORIAS", total.toFixed(2)],
  ];
  contribuciones.forEach(([k, v], i) => {
    const esFinal = i === contribuciones.length - 1;
    ws.mergeCells(rf, 1, rf, 3);
    ws.getCell(rf, 1).value = k;
    ws.getCell(rf, 1).font = { bold: true, size: 10, color: esFinal ? { argb: "FFFFFFFF" } : { argb: "FF17295A" } };
    ws.getCell(rf, 1).alignment = { horizontal: "right" };
    ws.mergeCells(rf, 4, rf, 6);
    const c = ws.getCell(rf, 4);
    c.value = typeof v === "number" ? Number(v) : v;
    if (typeof v === "number") c.numFmt = '"$"#,##0.00';
    c.font = { bold: true, size: esFinal ? 12 : 10 };
    if (esFinal) {
      for (let cc = 1; cc <= 6; cc++) {
        ws.getCell(rf, cc).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEEFE" } };
        ws.getCell(rf, cc).font = { bold: true, size: 11, color: { argb: "FF17295A" } };
      }
    }
    rf++;
  });

  let fi = rf + 2;
  ws.mergeCells(fi, 1, fi, 6);
  ws.getCell(fi, 1).value = "DOCUMENTOS QUE DEBEN ANEXARSE AL EXPEDIENTE";
  ws.getCell(fi, 1).font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  ws.getCell(fi, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
  fi++;
  const docs = [
    "Factura comercial emitida por el proveedor extranjero (invoice).",
    "Lista de empaque (packing list) con peso y medidas por bulto.",
    "Conocimiento de embarque o guía aérea (B/L / AWB).",
    "Certificado de origen conforme a los tratados aplicables (T-MEC, CPTPP).",
    "Aviso consolidado cuando la operación se realice de forma consolidada.",
    "Promovente / permisos de la dependencia reguladora cuando la fracción lo requiera (SE, SADER, COFEPRIS, SEMARNAT).",
    "Comprobante de pago de contribuciones al fisco federal.",
    "Cédula de identificación fiscal del importador vigente.",
  ];
  docs.forEach((t) => {
    ws.mergeCells(fi, 1, fi, 6);
    const c = ws.getCell(fi, 1);
    c.value = "• " + t;
    c.font = { size: 9 };
    c.alignment = { wrapText: true, vertical: "middle" };
    fi++;
  });

  pieFirmas(ws, fi, 6, [
    "AGENTE ADUANAL", "IMPORTADOR", "ALUMNO QUE ELABORA", "DOCENTE RESPONSABLE",
  ]);

  await wb.xlsx.writeFile(`${OUT}/FOR-LOG-05_Pedimento-Aduanal-A1_CBTIS270.xlsx`);
}

/* ============================================================
   6. CHECKLIST MONTACARGAS
   ============================================================ */
async function checklistMontacargas() {
  const wb = new ExcelJS.Workbook();
  wb.creator = INST.plataforma;
  const ws = wb.addWorksheet("Checklist Montacargas", { views: [{ state: "frozen", ySplit: 9 }] });
  const anchos = [6, 30, 52, 12, 12, 14, 20];
  ws.columns = anchos.map((w) => ({ width: w }));
  encabezadoHoja(ws, "CHECKLIST PRE-OPERACIONAL DE MONTACARGAS Y SEGURIDAD", "FOR-LOG-06", anchos.length);

  let f = 6;
  const datos = [
    ["FECHA DE LA PRÁCTICA:", "", "TURNO:", "Matutino"],
    ["SUBMÓDULO:", "Gestión de almacenes", "GRUPO:", "E"],
    ["ALUMNO OPERADOR:", "", "MATRÍCULA:", ""],
    ["EQUIPO:", "Montacargas contrabalanceado eléctrico", "No. ECONÓMICO:", "MC-270-01"],
    ["MODELO / SERIE:", "", "HORÓMETRO (HRS):", ""],
  ];
  datos.forEach((d) => {
    ws.getCell(f, 1).value = d[0];
    ws.getCell(f, 1).font = { bold: true, size: 9 };
    ws.mergeCells(f, 2, f, 3);
    ws.getCell(f, 2).value = d[1];
    ws.getCell(f, 4).value = d[2];
    ws.getCell(f, 4).font = { bold: true, size: 9 };
    ws.mergeCells(f, 5, f, 7);
    ws.getCell(f, 5).value = d[3];
    f++;
  });

  const encFila = 12;
  filaEncabezados(ws, encFila, [
    "#", "SISTEMA / COMPONENTE", "PUNTO DE VERIFICACIÓN", "CUMPLE", "NO CUMPLE", "N/A", "OBSERVACIONES",
  ]);

  const puntos = [
    ["NIVELACIÓN Y LLANTAS", "Presión y estado de las llantas (sin cortes ni desgaste excesivo)"],
    ["NIVELACIÓN Y LLANTAS", "Tuercas y tornillos de rin correctamente apretados"],
    ["SEGURIDAD GENERAL", "Asiento del operador en buen estado y con cinturón funcional"],
    ["SEGURIDAD GENERAL", "Cinturón de seguridad operativo"],
    ["SEGURIDAD GENERAL", "Cabina y protección contra vuelco (ROPS/FOPS) sin fisuras"],
    ["FRENOS", "Freno de servicio: pedales con recorrido y presión correctos"],
    ["FRENOS", "Freno de estacionamiento fija la unidad en pendiente"],
    ["DIRECCIÓN", "Dirección hidráulica suave, sin juego excesivo ni ruidos"],
    ["CONTROL HIDRÁULICO", "Palancas de elevación, inclinación y laterales responden"],
    ["CONTROL HIDRÁULICO", "Sin fugas en mangueras, bomba o cilindros"],
    ["MÁSTIL Y HORQUILLAS", "Horquillas sin grietas, sin desgaste en el talón (máx. 10%)"],
    ["MÁSTIL Y HORQUILLAS", "Retenedor de carga operativo y pasadores en su lugar"],
    ["MÁSTIL Y HORQUILLAS", "Cadenas tensadas y lubricadas por igual"],
    ["SISTEMA ELÉCTRICO", "Batería con carga suficiente y bornes limpios y apretados"],
    ["SISTEMA ELÉCTRICO", "Testigos e indicadores del tablero funcionan"],
    ["SISTEMA ELÉCTRICO", "Faro delantero, calaveras y luces de advertencia operan"],
    ["ALARMAS", "Bocina funciona correctamente"],
    ["ALARMAS", "Alarma de reversa audible en toda el área de maniobra"],
    ["ALARMAS", "Baliza (luz estroboscópica) enciende"],
    ["EXTINTOR", "Extintor cargado, con sello y vigente"],
    ["SEÑALIZACIÓN", "Placa de capacidad de carga visible y legible"],
    ["SEÑALIZACIÓN", "Gráfica de centro de gravedad legible"],
    ["LIMPIEZA", "Piso del operador limpio, sin grasa ni objetos sueltos"],
    ["EPP OPERADOR", "Chaleco reflejante reglamentario puesto"],
    ["EPP OPERADOR", "Calzado con casquillo de seguridad puesto"],
    ["EPP OPERADOR", "Guantes y lentes de protección disponibles"],
  ];

  puntos.forEach((p, i) => {
    const r = encFila + 1 + i;
    const row = ws.getRow(r);
    row.values = [i + 1, p[0], p[1], "", "", "", ""];
    row.font = { size: 9 };
    row.alignment = { vertical: "middle", wrapText: true };
    row.getCell(2).font = { size: 9, bold: true, color: { argb: "FF17295A" } };
    row.getCell(3).alignment = { horizontal: "left", wrapText: true };
    [4, 5, 6].forEach((c) => {
      row.getCell(c).alignment = { horizontal: "center" };
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS } };
    });
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "hair", color: { argb: "FFCBD5E1" } },
        left: { style: "hair", color: { argb: "FFCBD5E1" } },
        bottom: { style: "hair", color: { argb: "FFCBD5E1" } },
        right: { style: "hair", color: { argb: "FFCBD5E1" } },
      };
    });
  });

  let fi = encFila + puntos.length + 1;
  ws.mergeCells(fi, 1, fi, anchos.length);
  ws.getCell(fi, 1).value = "RESULTADO DE LA INSPECCIÓN";
  ws.getCell(fi, 1).font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  ws.getCell(fi, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
  fi++;
  const resultados = [
    "¿Se detectó alguna anomalía que impida la operación? (SÍ / NO):  ______________",
    "Acción correctiva requerida:  ______________________________________________________________________",
    "Equipo APTO para operar:  ☐ SÍ   ☐ NO        Firma del responsable del equipo:  ______________",
    "Referencia normativa: NOM-006-STPS-2014 · Manejo y operación de máquinas y equipos de elevación.",
  ];
  resultados.forEach((t) => {
    ws.mergeCells(fi, 1, fi, anchos.length);
    const c = ws.getCell(fi, 1);
    c.value = t;
    c.font = { size: 9 };
    c.alignment = { wrapText: true, vertical: "middle" };
    fi++;
  });

  pieFirmas(ws, fi, anchos.length, [
    "OPERADOR / ALUMNO", "DOCENTE RESPONSABLE", "JEFE DE ALMACÉN", "COORDINACIÓN DE LOGÍSTICA",
  ]);

  await wb.xlsx.writeFile(`${OUT}/FOR-LOG-06_Checklist-Montacargas-y-Seguridad_CBTIS270.xlsx`);
}

/* ============================================================ */
const tareas = [kardex, ordenCompra, cartaPorte, costeoFletes, pedimento, checklistMontacargas];

let ok = 0;
for (const t of tareas) {
  try {
    await t();
    ok++;
    console.log("✓", t.name);
  } catch (e) {
    console.error("✗", t.name, e.message);
  }
}
console.log(`\n${ok}/${tareas.length} formatos generados en ${OUT}/`);
