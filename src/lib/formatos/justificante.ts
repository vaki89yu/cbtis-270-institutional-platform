/**
 * Justificante de inasistencia en PDF (pdf-lib).
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { Justificante } from "@/lib/justificantes";

const INSTITUCION = {
  plantel: "CENTRO DE BACHILLERATO TECNOLÓGICO INDUSTRIAL Y DE SERVICIOS No. 270",
  dependencia: "SECRETARÍA DE EDUCACIÓN PÚBLICA · DGETI · DGPT",
  carrera: "Carrera Técnica en Logística · CCT 08DCT0270T",
  direccion: "Calle Soneto No. 156, Col. Carlos Castillo Peraza · C.P. 32575 · Ciudad Juárez, Chihuahua",
};

const AZUL = rgb(0.114, 0.357, 0.835);
const GRIS = rgb(0.29, 0.34, 0.42);
const GRIS_CLARO = rgb(0.55, 0.6, 0.67);
const BORDE = rgb(0.8, 0.84, 0.89);
const NEGRO = rgb(0.09, 0.11, 0.15);

const MARGEN = 48;
const ANCHO = 595.28;
const ALTO = 841.89;

function limpiar(texto: string) {
  return texto
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—―]/g, "-")
    .replace(/[^\x20-\x7E°•áéíóúÁÉÍÓÚñÑüÜ]/g, "");
}

function envolver(texto: string, font: PDFFont, tamano: number, ancho: number) {
  const palabras = limpiar(texto).split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(prueba, tamano) > ancho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function fechaLarga(fecha: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Ciudad_Juarez",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

function fechaHora(fecha: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Ciudad_Juarez",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

export async function generarJustificantePdf(datos: Justificante): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([ANCHO, ALTO]);

  let y = ALTO - MARGEN;
  page.drawText(limpiar(INSTITUCION.plantel), { x: MARGEN, y, size: 9, font: negrita, color: NEGRO, maxWidth: ANCHO - MARGEN * 2 });
  y -= 11;
  page.drawText(limpiar(INSTITUCION.dependencia), { x: MARGEN, y, size: 7.2, font: normal, color: GRIS_CLARO });
  y -= 10;
  page.drawText(limpiar(INSTITUCION.carrera), { x: MARGEN, y, size: 7.6, font: negrita, color: AZUL });
  y -= 8;
  page.drawText(limpiar(INSTITUCION.direccion), { x: MARGEN, y, size: 6.6, font: normal, color: GRIS_CLARO });
  y -= 10;
  page.drawLine({ start: { x: MARGEN, y }, end: { x: ANCHO - MARGEN, y }, thickness: 1.4, color: AZUL });

  y -= 28;
  page.drawText(limpiar("JUSTIFICANTE DE INASISTENCIA"), { x: MARGEN, y, size: 17, font: negrita, color: AZUL });
  y -= 15;
  page.drawLine({ start: { x: MARGEN, y }, end: { x: MARGEN + 96, y }, thickness: 2.4, color: AZUL });

  y -= 26;
  const parrafo = (texto: string, tamano = 10.5) => {
    for (const linea of envolver(texto, normal, tamano, ANCHO - MARGEN * 2)) {
      page.drawText(linea, { x: MARGEN, y, size: tamano, font: normal, color: GRIS });
      y -= tamano * 1.6;
    }
    y -= 6;
  };

  const alumno = datos.alumno;
  const esJustificada = datos.estado === "justificado";

  parrafo("A QUIEN CORRESPONDA", 9);
  parrafo(
    `Se hace constar que ${alumno.nombre}, con matrícula ${alumno.matricula ?? "pendiente de asignar"}, inscrito(a) en el ${
      alumno.semestre ?? "—"
    }° semestre, grupo ${alumno.grupo ?? "sin asignar"}, turno ${alumno.turno ?? "sin asignar"}, ${
      esJustificada ? "presentó una falta justificada" : "no asistió"
    } a la asignatura ${datos.curso.nombre} (${datos.curso.clave}), impartida por el(la) Prof. ${datos.curso.docente}, el día ${fechaHora(
      datos.fecha,
    )}.`,
  );

  parrafo(
    datos.observacion
      ? `Motivo registrado por el aula: ${datos.observacion}.`
      : "Motivo registrado por el aula: no especificado.",
  );

  parrafo(
    esJustificada
      ? "La falta quedó registrada como justificada en el control de asistencia del plantel."
      : "La falta quedó registrada en el control de asistencia del plantel. Este documento acredita la inasistencia para los trámites que el interesado requiera; la justificación formal se resuelve en control escolar con los comprobantes correspondientes.",
  );

  y -= 6;
  parrafo(
    `Se extiende el presente justificante en Ciudad Juárez, Chihuahua, a ${fechaLarga(datos.emitidoEn)}, a solicitud del interesado(a).`,
  );

  // Firmas
  const anchoFirma = (ANCHO - MARGEN * 2 - 40) / 2;
  const baseFirma = Math.max(y - 70, 110);
  const firma = (x: number, cargo: string, nombre: string) => {
    page.drawLine({ start: { x, y: baseFirma + 16 }, end: { x: x + anchoFirma, y: baseFirma + 16 }, thickness: 0.9, color: GRIS });
    const texto = limpiar(nombre);
    page.drawText(texto, {
      x: x + Math.max(0, (anchoFirma - negrita.widthOfTextAtSize(texto, 8.4)) / 2),
      y: baseFirma + 5,
      size: 8.4,
      font: negrita,
      color: NEGRO,
    });
    const textoCargo = limpiar(cargo);
    page.drawText(textoCargo, {
      x: x + Math.max(0, (anchoFirma - normal.widthOfTextAtSize(textoCargo, 7.4)) / 2),
      y: baseFirma - 5,
      size: 7.4,
      font: normal,
      color: GRIS_CLARO,
    });
  };

  firma(MARGEN, "Docente del aula", datos.curso.docente);
  firma(MARGEN + anchoFirma + 40, "Control escolar", "Servicios Escolares");

  // Pie
  page.drawLine({
    start: { x: MARGEN, y: MARGEN + 18 },
    end: { x: ANCHO - MARGEN, y: MARGEN + 18 },
    thickness: 0.8,
    color: BORDE,
  });
  page.drawText(limpiar(`Folio ${datos.folio}`), { x: MARGEN, y: MARGEN + 6, size: 7.2, font: negrita, color: GRIS });
  page.drawText(
    limpiar("Documento generado desde la plataforma institucional del CBTIS No. 270. Su autenticidad se verifica con el folio."),
    { x: MARGEN, y: MARGEN - 4, size: 6.4, font: normal, color: GRIS_CLARO, maxWidth: ANCHO - MARGEN * 2 },
  );

  return pdf.save();
}
