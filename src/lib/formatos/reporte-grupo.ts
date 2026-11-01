/**
 * Reporte de grupo en PDF: una hoja por aula con el avance de cada alumno.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ReporteGrupo } from "@/lib/reportes-grupo";

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
const FONDO = rgb(0.96, 0.98, 1);
const NEGRO = rgb(0.09, 0.11, 0.15);
const ROJO = rgb(0.75, 0.16, 0.24);
const VERDE = rgb(0.13, 0.55, 0.36);

const MARGEN = 42;
const ANCHO = 595.28;
const ALTO = 841.89;

function limpiar(texto: string) {
  return texto
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—―]/g, "-")
    .replace(/[^\x20-\x7E°•áéíóúÁÉÍÓÚñÑüÜ]/g, "");
}

function recortar(texto: string, font: PDFFont, tamano: number, ancho: number) {
  const limpio = limpiar(texto);
  if (font.widthOfTextAtSize(limpio, tamano) <= ancho) return limpio;
  let corte = limpio;
  while (corte.length > 3 && font.widthOfTextAtSize(`${corte}…`, tamano) > ancho) {
    corte = corte.slice(0, -1);
  }
  return `${corte}…`;
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

function encabezado(page: PDFPage, normal: PDFFont, negrita: PDFFont, titulo: string) {
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

  y -= 24;
  page.drawText(limpiar(titulo), { x: MARGEN, y, size: 15, font: negrita, color: AZUL });
  y -= 14;
  page.drawLine({ start: { x: MARGEN, y }, end: { x: MARGEN + 80, y }, thickness: 2.2, color: AZUL });
  return y - 16;
}

export async function generarReporteGrupoPdf(datos: ReporteGrupo): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([ANCHO, ALTO]);
  let y = encabezado(page, normal, negrita, "REPORTE DE GRUPO");

  const curso = datos.curso;
  page.drawText(limpiar(`${curso.nombre}`), { x: MARGEN, y, size: 11, font: negrita, color: NEGRO, maxWidth: ANCHO - MARGEN * 2 });
  y -= 14;
  page.drawText(
    limpiar(
      `${curso.clave} · ${curso.semestre}° ${curso.grupo} · ${curso.turno}${curso.aula ? ` · ${curso.aula}` : ""}${
        curso.modulo ? ` · Módulo ${curso.modulo}` : ""
      }`,
    ),
    { x: MARGEN, y, size: 8.4, font: normal, color: GRIS },
  );
  y -= 12;
  page.drawText(limpiar(`Docente(s): ${datos.docentes.join(", ")}`), {
    x: MARGEN,
    y,
    size: 8.4,
    font: normal,
    color: GRIS,
    maxWidth: ANCHO - MARGEN * 2,
  });
  y -= 12;
  page.drawText(limpiar(`Actividades activas del aula: ${datos.actividades}`), {
    x: MARGEN,
    y,
    size: 8.4,
    font: normal,
    color: GRIS,
  });

  // Resumen en tres tarjetas
  y -= 34;
  const anchoTarjeta = (ANCHO - MARGEN * 2 - 24) / 3;
  const tarjetas = [
    { etiqueta: "ALUMNOS", valor: String(datos.filas.length), color: AZUL },
    { etiqueta: "PROMEDIO DEL GRUPO", valor: datos.promedioGrupo === null ? "—" : String(datos.promedioGrupo), color: NEGRO },
    { etiqueta: "ENTREGAS PENDIENTES", valor: String(datos.pendientesTotales), color: datos.pendientesTotales > 0 ? ROJO : VERDE },
  ];
  tarjetas.forEach((tarjeta, indice) => {
    const x = MARGEN + indice * (anchoTarjeta + 12);
    page.drawRectangle({ x, y: y - 6, width: anchoTarjeta, height: 42, color: FONDO, borderColor: BORDE, borderWidth: 0.6 });
    page.drawText(tarjeta.etiqueta, { x: x + 8, y: y + 24, size: 6.6, font: negrita, color: GRIS_CLARO });
    page.drawText(tarjeta.valor, { x: x + 8, y: y + 6, size: 18, font: negrita, color: tarjeta.color });
  });

  y -= 34;

  // Tabla
  const columnas = [
    { titulo: "#", x: MARGEN + 4, ancho: 16 },
    { titulo: "Alumno", x: MARGEN + 24, ancho: 190 },
    { titulo: "Matrícula", x: MARGEN + 218, ancho: 70 },
    { titulo: "Promedio", x: MARGEN + 292, ancho: 50 },
    { titulo: "Asistencia", x: MARGEN + 346, ancho: 58 },
    { titulo: "Entregas", x: MARGEN + 408, ancho: 46 },
    { titulo: "Pendientes", x: MARGEN + 458, ancho: 52 },
  ];

  const dibujarCabeceraTabla = (pagina: PDFPage, yFila: number) => {
    pagina.drawRectangle({
      x: MARGEN,
      y: yFila - 12,
      width: ANCHO - MARGEN * 2,
      height: 16,
      color: FONDO,
      borderColor: BORDE,
      borderWidth: 0.6,
    });
    for (const columna of columnas) {
      pagina.drawText(columna.titulo, { x: columna.x, y: yFila - 8, size: 7.2, font: negrita, color: GRIS });
    }
    return yFila - 20;
  };

  page.drawText(limpiar("Avance por alumno"), { x: MARGEN, y: y + 8, size: 8.6, font: negrita, color: NEGRO });
  y = dibujarCabeceraTabla(page, y);

  let indiceFila = 0;
  for (const fila of datos.filas) {
    if (y < MARGEN + 60) {
      page = pdf.addPage([ANCHO, ALTO]);
      y = encabezado(page, normal, negrita, "REPORTE DE GRUPO (continuación)");
      y = dibujarCabeceraTabla(page, y);
    }

    indiceFila += 1;
    const pendiente = fila.pendientes > 0;
    const valores = [
      String(indiceFila),
      recortar(fila.nombre, normal, 8, 185),
      fila.matricula ?? "—",
      fila.promedio === null ? "—" : String(fila.promedio),
      fila.asistencia === null ? "—" : `${fila.asistencia}%`,
      String(fila.entregas),
      String(fila.pendientes),
    ];

    valores.forEach((valor, posicion) => {
      const esPendiente = posicion === 6 && pendiente;
      page.drawText(limpiar(valor), {
        x: columnas[posicion].x,
        y,
        size: 7.8,
        font: posicion === 1 ? normal : negrita,
        color: esPendiente ? ROJO : NEGRO,
      });
    });

    page.drawLine({ start: { x: MARGEN, y: y - 5 }, end: { x: ANCHO - MARGEN, y: y - 5 }, thickness: 0.4, color: BORDE });
    y -= 15;
  }

  if (datos.filas.length === 0) {
    page.drawText(limpiar("El aula no tiene alumnos inscritos todavía."), {
      x: MARGEN + 4,
      y,
      size: 8.4,
      font: normal,
      color: GRIS_CLARO,
    });
    y -= 16;
  }

  y -= 10;
  page.drawText(
    limpiar(
      `Criterios: promedio = media de las actividades calificadas; asistencia = (asistencias + retardos + justificadas) / sesiones registradas; pendientes = actividades activas sin entrega.${" "}
Asistencia promedio del grupo: ${datos.asistenciaGrupo === null ? "sin registros" : `${datos.asistenciaGrupo}%`}.`,
    ),
    { x: MARGEN, y, size: 6.8, font: normal, color: GRIS_CLARO, maxWidth: ANCHO - MARGEN * 2 },
  );

  // Pie
  const pieY = MARGEN;
  page.drawLine({
    start: { x: MARGEN, y: pieY + 12 },
    end: { x: ANCHO - MARGEN, y: pieY + 12 },
    thickness: 0.8,
    color: BORDE,
  });
  page.drawText(limpiar(`Folio ${datos.folio}`), { x: MARGEN, y: pieY, size: 7, font: negrita, color: GRIS });
  page.drawText(limpiar(`Emitido ${fechaHora(datos.emitidoEn)} · Plataforma institucional CBTIS No. 270`), {
    x: MARGEN,
    y: pieY - 9,
    size: 6.4,
    font: normal,
    color: GRIS_CLARO,
  });

  return pdf.save();
}
