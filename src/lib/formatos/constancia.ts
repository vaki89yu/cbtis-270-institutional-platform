/**
 * Constancia de estudios y kardex académico en PDF (pdf-lib).
 *
 * Documentos de una sola fuente tipográfica, pensados para imprimirse en hoja
 * carta/A4 y archivarse: encabezado institucional, datos del alumno, tabla de
 * asignaturas, firmas de dirección y control escolar, y folio verificable.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { DatosConstancia } from "@/lib/constancias";

const INSTITUCION = {
  plantel: "CENTRO DE BACHILLERATO TECNOLÓGICO INDUSTRIAL Y DE SERVICIOS No. 270",
  dependencia: "SECRETARÍA DE EDUCACIÓN PÚBLICA · DGETI · DGPT",
  carrera: "Carrera Técnica en Logística",
  cct: "CCT 08DCT0270T",
  direccion: "Calle Soneto No. 156, Col. Carlos Castillo Peraza · C.P. 32575 · Ciudad Juárez, Chihuahua",
};

const AZUL = rgb(0.114, 0.357, 0.835);
const GRIS = rgb(0.29, 0.34, 0.42);
const GRIS_CLARO = rgb(0.55, 0.6, 0.67);
const BORDE = rgb(0.75, 0.79, 0.85);
const FONDO = rgb(0.96, 0.98, 1);
const NEGRO = rgb(0.09, 0.11, 0.15);

const MARGEN = 46;
const ANCHO = 595.28;
const ALTO = 841.89;

function limpiar(texto: string) {
  return texto
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—―]/g, "-")
    .replace(/[×✕✖]/g, "x")
    .replace(/[^\x20-\x7E°•áéíóúÁÉÍÓÚñÑüÜ]/g, "");
}

function envolver(texto: string, font: PDFFont, tamano: number, ancho: number): string[] {
  const limpio = limpiar(texto);
  if (!limpio) return [""];
  const palabras = limpio.split(/\s+/);
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
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

function promedioTexto(valor: number | null) {
  return valor === null ? "—" : String(valor);
}

export type Fuentes = { normal: PDFFont; negrita: PDFFont };

async function documento() {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([ANCHO, ALTO]);
  return { pdf, page, fuentes: { normal, negrita } as Fuentes };
}

function encabezado(page: PDFPage, fuentes: Fuentes, titulo: string) {
  let y = ALTO - MARGEN;

  page.drawText(limpiar(INSTITUCION.plantel), {
    x: MARGEN,
    y,
    size: 9.2,
    font: fuentes.negrita,
    color: NEGRO,
    maxWidth: ANCHO - MARGEN * 2,
  });
  y -= 12;
  page.drawText(limpiar(INSTITUCION.dependencia), {
    x: MARGEN,
    y,
    size: 7.4,
    font: fuentes.normal,
    color: GRIS_CLARO,
  });
  y -= 11;
  page.drawText(limpiar(`${INSTITUCION.carrera} · ${INSTITUCION.cct}`), {
    x: MARGEN,
    y,
    size: 7.8,
    font: fuentes.negrita,
    color: AZUL,
  });
  y -= 8;
  page.drawText(limpiar(INSTITUCION.direccion), {
    x: MARGEN,
    y,
    size: 6.8,
    font: fuentes.normal,
    color: GRIS_CLARO,
  });
  y -= 10;
  page.drawLine({
    start: { x: MARGEN, y },
    end: { x: ANCHO - MARGEN, y },
    thickness: 1.4,
    color: AZUL,
  });

  y -= 26;
  page.drawText(limpiar(titulo), {
    x: MARGEN,
    y,
    size: 17,
    font: fuentes.negrita,
    color: AZUL,
  });
  y -= 16;
  page.drawLine({
    start: { x: MARGEN, y },
    end: { x: MARGEN + 92, y },
    thickness: 2.4,
    color: AZUL,
  });

  return y - 18;
}

function parrafo(
  page: PDFPage,
  fuentes: Fuentes,
  texto: string,
  y: number,
  opciones: { tamano?: number; ancho?: number; lineHeight?: number; color?: ReturnType<typeof rgb> } = {},
) {
  const tamano = opciones.tamano ?? 10;
  const ancho = opciones.ancho ?? ANCHO - MARGEN * 2;
  const salto = opciones.lineHeight ?? tamano * 1.55;
  const color = opciones.color ?? GRIS;

  for (const linea of envolver(texto, fuentes.normal, tamano, ancho)) {
    page.drawText(linea, { x: MARGEN, y, size: tamano, font: fuentes.normal, color });
    y -= salto;
  }
  return y;
}

function pie(page: PDFPage, fuentes: Fuentes, folio: string, nota: string) {
  const y = MARGEN + 6;
  page.drawLine({
    start: { x: MARGEN, y: y + 12 },
    end: { x: ANCHO - MARGEN, y: y + 12 },
    thickness: 0.8,
    color: BORDE,
  });
  page.drawText(limpiar(`Folio ${folio}`), {
    x: MARGEN,
    y,
    size: 7.2,
    font: fuentes.negrita,
    color: GRIS,
  });
  page.drawText(limpiar(nota), {
    x: MARGEN,
    y: y - 9,
    size: 6.4,
    font: fuentes.normal,
    color: GRIS_CLARO,
    maxWidth: ANCHO - MARGEN * 2,
  });
}

function firmas(page: PDFPage, fuentes: Fuentes, y: number) {
  const ancho = (ANCHO - MARGEN * 2 - 40) / 2;
  const firma = (x: number, cargo: string, nombre: string) => {
    page.drawLine({ start: { x, y: y + 16 }, end: { x: x + ancho, y: y + 16 }, thickness: 0.9, color: GRIS });
    const texto = limpiar(nombre);
    const anchoTexto = fuentes.negrita.widthOfTextAtSize(texto, 8.6);
    page.drawText(texto, {
      x: x + Math.max(0, (ancho - anchoTexto) / 2),
      y: y + 5,
      size: 8.6,
      font: fuentes.negrita,
      color: NEGRO,
    });
    const cargoTexto = limpiar(cargo);
    const anchoCargo = fuentes.normal.widthOfTextAtSize(cargoTexto, 7.4);
    page.drawText(cargoTexto, {
      x: x + Math.max(0, (ancho - anchoCargo) / 2),
      y: y - 5,
      size: 7.4,
      font: fuentes.normal,
      color: GRIS_CLARO,
    });
  };

  firma(MARGEN, "Dirección del plantel", "Ing. Titular de la Dirección");
  firma(MARGEN + ancho + 40, "Control escolar", "Servicios Escolares");
}

/* ----------------------------- CONSTANCIA -------------------------------- */

export async function generarConstanciaEstudiosPdf(datos: DatosConstancia): Promise<Uint8Array> {
  const { pdf, page, fuentes } = await documento();
  let y = encabezado(page, fuentes, "CONSTANCIA DE ESTUDIOS");

  const alumno = datos.alumno;
  y = parrafo(page, fuentes, "A QUIEN CORRESPONDA", y, { tamano: 9, color: NEGRO });
  y -= 4;

  const identidad = `${alumno.nombre}, con matrícula ${alumno.matricula ?? "pendiente de asignar"}${
    datos.numeroControl ? ` y número de control ${datos.numeroControl}` : ""
  },`;
  y = parrafo(
    page,
    fuentes,
    `${identidad} se encuentra inscrito(a) en el ${alumno.semestre ?? "—"}° semestre de la ${
      INSTITUCION.carrera
    }, grupo ${datos.grupo ?? "sin asignar"}, turno ${
      alumno.turno ?? "sin asignar"
    }, en este plantel, durante el ciclo escolar en curso.`,
    y,
  );
  y -= 4;

  const promedioTxt =
    datos.promedioGeneral === null
      ? null
      : `un promedio general de ${datos.promedioGeneral} puntos sobre 100`;
  const asistenciaTxt =
    datos.asistencia.total === 0
      ? null
      : `una asistencia acumulada del ${datos.asistencia.porcentaje}% (${
          datos.asistencia.presentes + datos.asistencia.retardos + datos.asistencia.justificados
        } de ${datos.asistencia.total} sesiones registradas)`;

  let avance = `El alumno(a) cursa ${datos.cursos.length} asignatura(s)`;
  if (promedioTxt && asistenciaTxt) avance += `, con ${promedioTxt} y ${asistenciaTxt}`;
  else if (promedioTxt) avance += `, con ${promedioTxt}`;
  else if (asistenciaTxt) avance += `, con ${asistenciaTxt}`;
  avance += ".";

  y = parrafo(page, fuentes, avance, y);

  if (datos.cursos.length > 0) {
    y -= 6;
    page.drawText(limpiar("Asignaturas inscritas"), {
      x: MARGEN,
      y,
      size: 9,
      font: fuentes.negrita,
      color: NEGRO,
    });
    y -= 6;
    page.drawRectangle({
      x: MARGEN,
      y: y - 12,
      width: ANCHO - MARGEN * 2,
      height: 15,
      color: FONDO,
      borderColor: BORDE,
      borderWidth: 0.6,
    });
    page.drawText("Clave", { x: MARGEN + 6, y: y - 8, size: 7.6, font: fuentes.negrita, color: GRIS });
    page.drawText("Asignatura", { x: MARGEN + 62, y: y - 8, size: 7.6, font: fuentes.negrita, color: GRIS });
    page.drawText("Docente", { x: MARGEN + 330, y: y - 8, size: 7.6, font: fuentes.negrita, color: GRIS });
    y -= 18;

    for (const curso of datos.cursos) {
      if (y < 190) break;
      page.drawText(limpiar(curso.clave).slice(0, 18), {
        x: MARGEN + 6,
        y,
        size: 8,
        font: fuentes.normal,
        color: GRIS,
      });
      const nombre = envolver(curso.nombre, fuentes.normal, 8, 255)[0] ?? "";
      page.drawText(nombre, { x: MARGEN + 62, y, size: 8, font: fuentes.normal, color: NEGRO });
      const docente = envolver(curso.docente, fuentes.normal, 8, 150)[0] ?? "";
      page.drawText(docente, { x: MARGEN + 330, y, size: 8, font: fuentes.normal, color: GRIS });
      y -= 13;
    }
  }

  if (datos.tutorDocente) {
    y -= 2;
    y = parrafo(page, fuentes, `Docente encargado del grupo: ${datos.tutorDocente}.`, y, {
      tamano: 9,
      color: GRIS,
    });
  }

  y -= 8;
  y = parrafo(
    page,
    fuentes,
    `Se extiende la presente constancia a solicitud del interesado(a), en Ciudad Juárez, Chihuahua, a ${fechaLarga(
      datos.emitidoEn,
    )}, para los usos y efectos legales a que haya lugar.`,
    y,
  );

  firmas(page, fuentes, Math.max(y - 40, 96));
  pie(
    page,
    fuentes,
    datos.folio,
    "Documento generado desde la plataforma institucional del CBTIS No. 270. Su autenticidad se verifica con el folio ante Servicios Escolares.",
  );

  return pdf.save();
}

/* -------------------------------- KARDEX ---------------------------------- */

export async function generarKardexPdf(datos: DatosConstancia): Promise<Uint8Array> {
  const { pdf, page, fuentes } = await documento();
  let y = encabezado(page, fuentes, "KARDEX ACADÉMICO");

  const alumno = datos.alumno;
  const filas: Array<[string, string]> = [
    ["Alumno", alumno.nombre],
    ["Matrícula", alumno.matricula ?? "—"],
    ["Número de control", datos.numeroControl ?? "—"],
    ["Semestre / grupo", `${alumno.semestre ?? "—"}° · ${datos.grupo ?? "—"}`],
    ["Turno", alumno.turno ?? "—"],
    ["Especialidad", alumno.especialidad ?? INSTITUCION.carrera],
    ["Docente encargado", datos.tutorDocente ?? "Sin asignar"],
    ["Promedio general", promedioTexto(datos.promedioGeneral)],
  ];

  const anchoColumna = (ANCHO - MARGEN * 2) / 2;
  for (let i = 0; i < filas.length; i += 2) {
    const [claveA, valorA] = filas[i];
    page.drawText(limpiar(claveA.toUpperCase()), {
      x: MARGEN,
      y,
      size: 6.6,
      font: fuentes.negrita,
      color: GRIS_CLARO,
    });
    page.drawText(limpiar(valorA), {
      x: MARGEN,
      y: y - 10,
      size: 8.6,
      font: fuentes.negrita,
      color: NEGRO,
      maxWidth: anchoColumna - 10,
    });

    const otra = filas[i + 1];
    if (otra) {
      const [claveB, valorB] = otra;
      page.drawText(limpiar(claveB.toUpperCase()), {
        x: MARGEN + anchoColumna,
        y,
        size: 6.6,
        font: fuentes.negrita,
        color: GRIS_CLARO,
      });
      page.drawText(limpiar(valorB), {
        x: MARGEN + anchoColumna,
        y: y - 10,
        size: 8.6,
        font: fuentes.negrita,
        color: NEGRO,
        maxWidth: anchoColumna - 10,
      });
    }
    y -= 26;
  }

  y -= 4;
  page.drawLine({
    start: { x: MARGEN, y },
    end: { x: ANCHO - MARGEN, y },
    thickness: 0.8,
    color: BORDE,
  });
  y -= 18;

  const columnas = [
    { titulo: "Clave", x: MARGEN + 4, ancho: 52 },
    { titulo: "Asignatura", x: MARGEN + 60, ancho: 190 },
    { titulo: "Docente", x: MARGEN + 254, ancho: 110 },
    { titulo: "P1", x: MARGEN + 368, ancho: 24 },
    { titulo: "P2", x: MARGEN + 396, ancho: 24 },
    { titulo: "P3", x: MARGEN + 424, ancho: 24 },
    { titulo: "Prom.", x: MARGEN + 452, ancho: 34 },
    { titulo: "Estado", x: MARGEN + 490, ancho: 52 },
  ];

  page.drawRectangle({
    x: MARGEN,
    y: y - 13,
    width: ANCHO - MARGEN * 2,
    height: 17,
    color: FONDO,
    borderColor: BORDE,
    borderWidth: 0.6,
  });
  for (const columna of columnas) {
    page.drawText(columna.titulo, {
      x: columna.x,
      y: y - 8,
      size: 7.4,
      font: fuentes.negrita,
      color: GRIS,
    });
  }
  y -= 20;

  if (datos.calificaciones.length === 0) {
    page.drawText(limpiar("Sin asignaturas registradas todavía."), {
      x: MARGEN + 4,
      y,
      size: 8.4,
      font: fuentes.normal,
      color: GRIS_CLARO,
    });
    y -= 16;
  }

  for (const calificacion of datos.calificaciones) {
    if (y < 180) break;
    const estado =
      calificacion.promedio === null
        ? "En curso"
        : calificacion.promedio >= 70
          ? "Acreditada"
          : "No acreditada";

    const celdas = [
      limpiar(calificacion.clave).slice(0, 16),
      envolver(calificacion.nombre, fuentes.normal, 8, 180)[0] ?? "",
      envolver(calificacion.docente, fuentes.normal, 8, 104)[0] ?? "",
      promedioTexto(calificacion.parciales[0]),
      promedioTexto(calificacion.parciales[1]),
      promedioTexto(calificacion.parciales[2]),
      promedioTexto(calificacion.promedio),
      estado,
    ];

    celdas.forEach((valor, indice) => {
      page.drawText(valor, {
        x: columnas[indice].x,
        y,
        size: 7.8,
        font: indice === 6 || indice === 7 ? fuentes.negrita : fuentes.normal,
        color: indice === 7 && estado === "No acreditada" ? rgb(0.75, 0.16, 0.24) : NEGRO,
        maxWidth: columnas[indice].ancho + 6,
      });
    });

    page.drawLine({
      start: { x: MARGEN, y: y - 5 },
      end: { x: ANCHO - MARGEN, y: y - 5 },
      thickness: 0.4,
      color: BORDE,
    });
    y -= 16;
  }

  y -= 10;
  page.drawText(limpiar("Resumen de asistencia"), {
    x: MARGEN,
    y,
    size: 8.4,
    font: fuentes.negrita,
    color: NEGRO,
  });
  y -= 13;
  page.drawText(
    limpiar(
      `Sesiones registradas: ${datos.asistencia.total} · Asistencias: ${datos.asistencia.presentes} · Retardos: ${
        datos.asistencia.retardos
      } · Faltas: ${datos.asistencia.faltas} · Justificadas: ${datos.asistencia.justificados} · Asistencia: ${
        datos.asistencia.porcentaje
      }%`,
    ),
    { x: MARGEN, y, size: 7.8, font: fuentes.normal, color: GRIS, maxWidth: ANCHO - MARGEN * 2 },
  );

  y -= 22;
  page.drawText(
    limpiar(
      "Criterio de acreditación del plantel: promedio mínimo de 70 puntos sobre 100 por asignatura. Las calificaciones parciales son el promedio de las actividades calificadas del parcial.",
    ),
    { x: MARGEN, y, size: 6.8, font: fuentes.normal, color: GRIS_CLARO, maxWidth: ANCHO - MARGEN * 2 },
  );

  firmas(page, fuentes, Math.max(y - 44, 96));
  pie(
    page,
    fuentes,
    datos.folio,
    `Kardex emitido el ${fechaLarga(datos.emitidoEn)} desde la plataforma institucional del CBTIS No. 270. Documento informativo: el registro oficial es el de Servicios Escolares.`,
  );

  return pdf.save();
}
