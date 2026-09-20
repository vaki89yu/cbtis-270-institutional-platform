import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { obtenerFormato } from "@/lib/formatos/catalogo";

const INSTITUCION = {
  plantel: "CENTRO DE BACHILLERATO TECNOLÓGICO INDUSTRIAL Y DE SERVICIOS No. 270",
  dependencia: "SECRETARÍA DE EDUCACIÓN PÚBLICA · DGETI · DGPT",
  carrera: "Carrera Técnica en Logística",
  cct: "08DCT0270T",
  direccion: "Calle Soneto No. 156, Col. Carlos Castillo Peraza",
  cpCiudad: "C.P. 32575 · Ciudad Juárez, Chihuahua, México",
  contacto: "Tel. (656) 887 4342 · contacto@cbtis270.edu.mx",
  plataforma: "Plataforma Institucional de Logística · CBTIS No. 270",
};

const AZUL = rgb(0.114, 0.357, 0.835);
const AZUL_OSCURO = rgb(0.09, 0.16, 0.353);
const AZUL_CLARO = rgb(0.87, 0.93, 0.99);
const GRIS_TEXTO = rgb(0.28, 0.33, 0.41);
const GRIS_SUAVE = rgb(0.85, 0.9, 0.96);
const BLANCO = rgb(1, 1, 1);
const NEGRO = rgb(0.08, 0.09, 0.1);
const BORDE = rgb(0.62, 0.68, 0.76);
const FONDO_CLARO = rgb(0.97, 0.99, 1);

export type DatosFormulario = Record<string, string | string[]>;

function sanitizar(texto: string) {
  return texto
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—―]/g, "-")
    .replace(/[▪◦]/g, "•")
    .replace(/[×✕✖]/g, "x")
    .replace(/[÷]/g, "/")
    .replace(/[^\x20-\x7E°•áéíóúÁÉÍÓÚñÑüÜ\n]/g, "");
}

function ajustar(texto: string, font: any, size: number, maxWidth: number): string[] {
  const limpio = sanitizar(texto);
  if (!limpio) return [];
  if (font.widthOfTextAtSize(limpio, size) <= maxWidth) return [limpio];
  const palabras = limpio.split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (font.widthOfTextAtSize(prueba, size) > maxWidth) {
      if (actual) lineas.push(actual);
      actual = p;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function truncarConPuntos(texto: string, font: any, size: number, maxWidth: number): string {
  const limpio = sanitizar(texto);
  if (font.widthOfTextAtSize(limpio, size) <= maxWidth) return limpio;
  const puntos = "…";
  let resultado = limpio;
  while (resultado.length > 1 && font.widthOfTextAtSize(resultado + puntos, size) > maxWidth) {
    resultado = resultado.slice(0, -1);
  }
  return (resultado + puntos).trim();
}

function encabezado(page: any, codigo: string, folio: string, bold: any, regular: any) {
  const { width } = page.getSize();

  page.drawRectangle({ x: 0, y: 800, width, height: 20, color: AZUL });
  page.drawRectangle({ x: 0, y: 782, width, height: 18, color: AZUL_OSCURO });

  page.drawText(sanitizar(INSTITUCION.plantel), { x: 40, y: 805, size: 8.5, font: bold, color: BLANCO });
  page.drawText(sanitizar(INSTITUCION.dependencia), { x: 40, y: 787, size: 7, font: regular, color: BLANCO });

  // Bloque derecha con folio
  page.drawRectangle({ x: width - 210, y: 782, width: 170, height: 38, color: BLANCO });
  page.drawText("FOLIO", { x: width - 196, y: 806, size: 6.5, font: bold, color: AZUL_OSCURO });
  page.drawText(truncarConPuntos(folio, bold, 8, 154), { x: width - 196, y: 793, size: 8, font: bold, color: AZUL_OSCURO });

  page.drawText(sanitizar(INSTITUCION.carrera), { x: 40, y: 763, size: 7.5, font: regular, color: BLANCO });
}

function pie(page: any, pagina: number, folio: string, regular: any, bold: any) {
  const { width } = page.getSize();
  page.drawLine({ start: { x: 40, y: 46 }, end: { x: width - 40, y: 46 }, thickness: 0.6, color: GRIS_SUAVE });
  page.drawText(sanitizar(INSTITUCION.plataforma), { x: 40, y: 35, size: 6.5, font: regular, color: GRIS_TEXTO });
  page.drawText(truncarConPuntos(`FOLIO ${folio}`, bold, 6.5, 320), { x: 40, y: 26, size: 6.5, font: bold, color: AZUL_OSCURO });
  page.drawText(`Página ${pagina}`, { x: width - 68, y: 35, size: 6.5, font: regular, color: GRIS_TEXTO });
}

export async function generarPdfFormato(
  codigo: string,
  datos: DatosFormulario,
): Promise<{ bytes: Uint8Array; fileName: string } | null> {
  const formato = obtenerFormato(codigo);
  if (!formato) return null;

  const pdf = await PDFDocument.create();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  const MARGIN = 40;
  const pageW = 595.28;
  const pageH = 841.89;
  const usable = pageW - MARGIN * 2;

  let page = pdf.addPage([pageW, pageH]);
  let numeroPagina = 1;
  const folio = `F-${INSTITUCION.cct}-${codigo}-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;

  encabezado(page, codigo, folio, bold, regular);

  let y = 748;

  const requerirEspacio = (altura: number) => {
    if (y - altura < 68) {
      page = pdf.addPage([pageW, pageH]);
      numeroPagina++;
      y = 748;
      encabezado(page, codigo, folio, bold, regular);
    }
  };

  // ---- Título y línea directiva ----
  requerirEspacio(40);
  const lineasTitulo = ajustar(formato.titulo, bold, 13, usable);
  for (const l of lineasTitulo) {
    page.drawText(l, { x: MARGIN, y, size: 13, font: bold, color: AZUL_OSCURO });
    y -= 16;
  }
  const detalle = ajustar(`Módulo ${formato.modulo} del plan de estudios DGETI · ${formato.referenciaNormativa}`, regular, 7.5, usable);
  detalle.forEach((l) => {
    page.drawText(l, { x: MARGIN, y, size: 7.5, font: regular, color: GRIS_TEXTO });
    y -= 10;
  });
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + usable, y }, thickness: 1.2, color: AZUL });
  y -= 16;

  // ---- DATOS GENERALES en cuadrícula de 3 columnas con relleno contenido ----
  const identidad: Array<[string, string]> = [
    ["Alumno", String(datos.alumno ?? "")],
    ["Matrícula / No. de control", String(datos.matricula ?? "")],
    ["Semestre", String(datos.semestre ?? "")],
    ["Grupo", String(datos.grupo ?? "")],
    ["Turno", String(datos.turno ?? "")],
    ["Docente responsable", String(datos.docente ?? "")],
    ["Fecha de elaboración", String(datos.fecha ?? new Date().toISOString().slice(0, 10))],
  ];

  requerirEspacio(50);
  page.drawRectangle({ x: MARGIN, y, width: usable, height: 15, color: AZUL });
  page.drawText("DATOS GENERALES DE IDENTIFICACIÓN", { x: MARGIN + 6, y: y + 4, size: 8, font: bold, color: BLANCO });
  y -= 20;

  const anchoCol = usable / 3;
  const altoCelda = 34;
  identidad.forEach(([etiqueta, valor], i) => {
    const col = i % 3;
    const fila = Math.floor(i / 3);
    const x = MARGIN + col * anchoCol;
    const yCelda = y - fila * (altoCelda + 6);

    page.drawRectangle({ x, y: yCelda, width: anchoCol - 6, height: altoCelda, borderColor: BORDE, borderWidth: 0.8, color: FONDO_CLARO });
    const lineaEtiqueta = ajustar(etiqueta, bold, 6.6, anchoCol - 10)[0] ?? etiqueta.slice(0, 18);
    page.drawText(lineaEtiqueta, { x: x + 4, y: yCelda + altoCelda - 9, size: 6.6, font: bold, color: GRIS_TEXTO });

    const lineasValor = ajustar(valor || "—", regular, 8, anchoCol - 10);
    const lineaUno = truncarConPuntos(lineasValor[0] ?? "—", regular, 8, anchoCol - 10);
    page.drawText(lineaUno, { x: x + 4, y: yCelda + 14, size: 8, font: regular, color: valor ? NEGRO : GRIS_SUAVE });
    if (lineasValor.length > 1) {
      const lineaDos = truncarConPuntos(lineasValor[1], regular, 8, anchoCol - 10);
      page.drawText(lineaDos, { x: x + 4, y: yCelda + 4, size: 8, font: regular, color: valor ? NEGRO : GRIS_SUAVE });
    }
  });
  y -= Math.ceil(identidad.length / 3) * (altoCelda + 6) + 16;

  // ---- Secciones con campos en cuadrícula y tablas ----
  for (const seccion of formato.secciones) {
    requerirEspacio(46);
    page.drawRectangle({ x: MARGIN, y, width: usable, height: 15, color: AZUL_OSCURO });
    page.drawText(seccion.titulo.toUpperCase(), { x: MARGIN + 6, y: y + 4, size: 8, font: bold, color: BLANCO });
    y -= 20;

    // Campos
    const camposTexto = seccion.campos.filter((c) => c.tipo !== "tabla");
    let x = MARGIN;
    for (let ci = 0; ci < camposTexto.length; ci += 1) {
      const campo = camposTexto[ci];
      const anchoCols = campo.ancho ?? 1;
      const anchoReal = anchoCols === 3 ? usable : anchoCols === 2 ? (usable - 8) * (2 / 3) - 2 : anchoCol - 8;
      const xPos = anchoCols === 3 ? 0 : (ci % (8 - anchoCols)) * (anchoReal + 8);
      x = MARGIN + xPos;

      const altoNecesarioEstim = campo.tipo === "textoLargo" ? 44 : 34;
      requerirEspacio(altoNecesarioEstim);

      const lineasEti = ajustar(campo.etiqueta + (campo.requerido ? " *" : ""), bold, 6.6, anchoReal - 10);
      const lineaEti = lineasEti[0] ?? "";
      page.drawRectangle({ x, y, width: anchoReal, height: altoNecesarioEstim, borderColor: BORDE, borderWidth: 0.8, color: FONDO_CLARO });
      page.drawText(lineaEti, { x: x + 4, y: y + altoNecesarioEstim - 9, size: 6.6, font: bold, color: GRIS_TEXTO });
      if (lineasEti.length > 1) {
        page.drawText(lineasEti[1], { x: x + 4, y: y + altoNecesarioEstim - 18, size: 6.6, font: bold, color: GRIS_TEXTO });
      }

      const valor = String(datos[campo.id] ?? "");
      const lineasValor = ajustar(valor || "—", regular, 8, anchoReal - 10);
      const lineaUno = truncarConPuntos(lineasValor[0] ?? "—", regular, 8, anchoReal - 10);
      page.drawText(lineaUno, { x: x + 4, y: y + (campo.tipo === "textoLargo" ? 16 : 14), size: 8, font: regular, color: valor ? NEGRO : GRIS_SUAVE });
      if (campo.tipo === "textoLargo" && lineasValor.length > 1) {
        const lineaDos = truncarConPuntos(lineasValor[1], regular, 8, anchoReal - 10);
        page.drawText(lineaDos, { x: x + 4, y: y + 4, size: 8, font: regular, color: valor ? NEGRO : GRIS_SUAVE });
      }

      y -= altoNecesarioEstim + 8;

      // si el siguiente campo comparte misma fila (ancho 1 o 2) respetar la línea actual
      const siguiente = camposTexto[ci + 1];
      if (siguiente && (siguiente.ancho ?? 1) !== 3 && (campo.ancho ?? 1) !== 3) {
        x = 0;
      } else {
        x = MARGIN;
      }
    }

    // Tablas
    const tablas = seccion.campos.filter((c) => c.tipo === "tabla");
    for (const t of tablas) {
      const columnas = t.columnas ?? [];
      if (!columnas.length) continue;
      const filasTabla = t.filasTabla ?? 5;
      const altoHeader = 18;
      const altoFila = 18;
      const altoTotal = altoHeader + filasTabla * altoFila + 8;
      requerirEspacio(Math.min(altoTotal, 200));

      const anchoColumna = usable / columnas.length;
      page.drawRectangle({ x: MARGIN, y, width: usable, height: altoHeader, color: AZUL });
      columnas.forEach((col, ci) => {
        const x = MARGIN + ci * anchoColumna;
        const lineaCol = ajustar(col, bold, 6.6, anchoColumna - 6).slice(0, 2);
        lineaCol.forEach((ln, li) => {
          page.drawText(ln, { x: x + 3, y: y + altoHeader - 7 - li * 7, size: 6.6, font: bold, color: BLANCO });
        });
        page.drawLine({ start: { x, y }, end: { x, y: y + altoHeader }, thickness: 0.6, color: BORDE });
      });
      y -= altoHeader;

      // filas de datos
      for (let fi = 0; fi < filasTabla; fi++) {
        const filaValores: string[] = Array.isArray(datos[t.id]) ? ((datos[t.id] as string[])[fi] ?? "").split("|") : [];
        page.drawRectangle({ x: MARGIN, y, width: usable, height: altoFila, borderColor: BORDE, borderWidth: 0.6 });
        for (let ci = 0; ci < columnas.length; ci++) {
          const x = MARGIN + ci * anchoColumna;
          const celda = filaValores[ci] ?? "";
          const textoCelda = celda ? truncarConPuntos(celda, regular, 6.8, anchoColumna - 6) : "—";
          page.drawText(textoCelda, { x: x + 3, y: y + altoFila - 12, size: 6.8, font: regular, color: celda ? NEGRO : GRIS_SUAVE });
          if (ci > 0) {
            page.drawLine({ start: { x, y }, end: { x, y: y + altoFila }, thickness: 0.6, color: BORDE });
          }
        }
        y -= altoFila;
      }
      y -= 12;
    }

    y -= 4;
  }

  // La sección de instrucciones fue retirada del PDF por solicitud directiva.

  // ---- Declaración y firmas en bloque completo y bien contenido ----
  requerirEspacio(120);
  page.drawRectangle({ x: MARGIN, y, width: usable, height: 15, color: AZUL });
  page.drawText("DECLARACIÓN INSTITUCIONAL", { x: MARGIN + 6, y: y + 4, size: 8, font: bold, color: BLANCO });
  y -= 22;

  const declaracion =
    `Declaro, bajo protesta de decir verdad, que los datos asentados en este formato son verídicos y fueron capturados por mí, ` +
    `en el marco de la asignatura y el submódulo correspondientes, conforme al plan de estudios de la carrera técnica en Logística ` +
    `de la Dirección General de Educación Tecnológica Industrial y de Servicios (DGETI), del CBTIS No. 270 con Clave de Centro de Trabajo ${INSTITUCION.cct}. ` +
    `Me comprometo a presentar la documentación física que avale la veracidad de lo contenido, cuando la institución así lo requiera. ` +
    `Este documento tiene carácter didáctico y forma parte del portafolio académico del estudiante registrado en la Plataforma Institucional ` +
    `de Logística del CBTIS No. 270.`;
  const lineasDeclaracion = ajustar(declaracion, regular, 7.5, usable);
  lineasDeclaracion.forEach((l) => {
    requerirEspacio(12);
    page.drawText(l, { x: MARGIN, y, size: 7.5, font: regular, color: GRIS_TEXTO });
    y -= 10;
  });

  // Firmas en cuadrícula de 2 columnas para evitar saturación
  y -= 28;
  requerirEspacio(40);
  const firmas = formato.firmas;
  const colFirma = 2;
  const filasFirmas = Math.ceil(firmas.length / colFirma);
  const anchoFirma = usable / colFirma;
  firmas.forEach((f, i) => {
    const col = i % colFirma;
    const fila = Math.floor(i / colFirma);
    const x = MARGIN + col * anchoFirma;
    const yF = y - fila * 60;
    page.drawLine({ start: { x: x + 12, y: yF }, end: { x: x + anchoFirma - 12, y: yF }, thickness: 0.8, color: NEGRO });
    const lineas = ajustar(f, bold, 7, anchoFirma - 26);
    lineas.forEach((l, li) => {
      page.drawText(l, { x: x + 12, y: yF - 12 - li * 9, size: 7, font: bold, color: AZUL_OSCURO });
    });
  });
  y -= filasFirmas * 60;

  // Pie de página
  pie(page, numeroPagina, folio, regular, bold);

  const bytes = await pdf.save();
  return { bytes, fileName: `${formato.fileName}.pdf` };
}
