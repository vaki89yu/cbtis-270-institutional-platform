import type { FormatoDinamico } from "@/lib/formatos/catalogo";

type Datos = Record<string, string | string[]>;

const INST = {
  plantel: "CENTRO DE BACHILLERATO TECNOLÓGICO INDUSTRIAL Y DE SERVICIOS No. 270",
  sep: "GOBIERNO DE MÉXICO · SECRETARÍA DE EDUCACIÓN PÚBLICA",
  dgeti: "DIRECCIÓN GENERAL DE EDUCACIÓN TECNOLÓGICA INDUSTRIAL Y DE SERVICIOS",
  dgpt: "DIRECCIÓN GENERAL DE PREPARATORIAS TÉCNICAS",
  carrera: "CARRERA TÉCNICA EN LOGÍSTICA",
  cct: "08DCT0270T",
  direccion: "Calle Soneto No. 156, Col. Carlos Castillo Peraza",
  ciudad: "C.P. 32575 · Ciudad Juárez, Chihuahua, México",
  tel: "Tel. (656) 887 4342",
  mail: "contacto@cbtis270.edu.mx",
  web: "www.cbtis270.edu.mx",
};

const NOMBRE_MODULO: Record<number, string> = {
  1: "Gestiona la adquisición de mercancías y servicios",
  2: "Organiza el flujo de mercancías en almacén",
  3: "Gestiona el tráfico de mercancías de importación y exportación",
  4: "Gestiona la distribución física de mercancías",
  5: "Cotiza costos de la cadena de suministro",
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function folio(codigo: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `F-${INST.cct}-${codigo}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function fechaLarga(): string {
  const d = new Date();
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

function val(datos: Datos, id: string): string {
  const v = datos[id];
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return String(v ?? "").trim();
}

function filas(datos: Datos, id: string): string[][] {
  const v = datos[id];
  if (!Array.isArray(v)) return [];
  return v.map((fila) => String(fila).split("|"));
}

function celdasTabla(datos: Datos, id: string, columnas: string[], totalFilas: number): string {
  const data = filas(datos, id);
  let html = "";
  for (let i = 0; i < totalFilas; i++) {
    const fila = data[i] ?? [];
    const tiene = fila.some((c) => String(c ?? "").trim() !== "");
    html += `<tr class="${tiene ? "fila-dato" : "fila-vacia"}">`;
    columnas.forEach((_, ci) => {
      const c = esc(fila[ci] ?? "");
      html += `<td>${c || "&mdash;"}</td>`;
    });
    html += "</tr>";
  }
  return html;
}

export function generarHtmlImprimible(formato: FormatoDinamico, datos: Datos): string {
  const F = folio(formato.codigo);
  const semestre = val(datos, "semestre");
  const grupo = val(datos, "grupo");
  const turno = val(datos, "turno");
  const nombreModulo = NOMBRE_MODULO[formato.modulo] ?? "";

  const camposLlenos = formato.secciones.reduce(
    (acc, s) => acc + s.campos.filter((c) => c.tipo !== "tabla" && val(datos, c.id)).length,
    0,
  );
  const camposTotales = formato.secciones.reduce(
    (acc, s) => acc + s.campos.filter((c) => c.tipo !== "tabla").length,
    0,
  );

  const seccionesHtml = formato.secciones
    .map((seccion, si) => {
      const romano = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][si] ?? String(si + 1);

      const camposTexto = seccion.campos.filter((c) => c.tipo !== "tabla");
      const tablas = seccion.campos.filter((c) => c.tipo === "tabla");

      const camposHtml = camposTexto
        .map((c) => {
          const v = val(datos, c.id);
          const esLargo = c.tipo === "textoLargo";
          return `
          <div class="campo ${esLargo ? "campo-largo" : ""}">
            <div class="campo-etiqueta">${esc(c.etiqueta)}${c.requerido ? ' <span class="req">*</span>' : ""}</div>
            <div class="campo-valor ${v ? "" : "vacio"}">${v ? esc(v) : "&mdash;"}</div>
          </div>`;
        })
        .join("");

      const tablasHtml = tablas
        .map((t) => {
          const cols = t.columnas ?? [];
          const filasN = t.filasTabla ?? 5;
          return `
          <div class="tabla-bloque">
            <div class="tabla-titulo">${esc(t.etiqueta)}</div>
            <table class="tabla-datos">
              <thead>
                <tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>
              </thead>
              <tbody>${celdasTabla(datos, t.id, cols, filasN)}</tbody>
            </table>
          </div>`;
        })
        .join("");

      return `
      <section class="seccion">
        <div class="seccion-encabezado">
          <span class="seccion-numero">${romano}</span>
          <span class="seccion-titulo">${esc(seccion.titulo)}</span>
        </div>
        ${camposHtml ? `<div class="campos-grid">${camposHtml}</div>` : ""}
        ${tablasHtml}
      </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(formato.titulo)} · CBTIS 270</title>
<style>
  @page { size: A4; margin: 13mm 11mm 15mm 11mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --azul-900: #0e1f47;
    --azul-700: #17295a;
    --azul-500: #1b5bd5;
    --azul-300: #2f7ae5;
    --dorado: #c89b3c;
    --dorado-claro: #e6c574;
    --gris-tinta: #1c2535;
    --gris-suave: #5a6a80;
    --borde: #c4d2e6;
    --fondo-suave: #f6f9ff;
    --serif: "Georgia", "Times New Roman", "Cambria", serif;
    --sans: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  html, body {
    background: #fff; color: var(--gris-tinta);
    font-family: var(--sans); font-size: 10pt; line-height: 1.45;
  }
  -webkit-print-color-adjust: exact; print-color-adjust: exact;

  /* ===== MARCA DE AGUA ===== */
  .marca-agua {
    position: fixed; top: 46%; left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-family: var(--serif); font-size: 96pt; font-weight: 900; letter-spacing: 14px;
    color: rgba(23, 41, 90, 0.05);
    z-index: 0; pointer-events: none; user-select: none;
  }
  .marca-agua-sub {
    position: fixed; top: 60%; left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-family: var(--sans); font-size: 22pt; font-weight: 700; letter-spacing: 10px;
    color: rgba(27, 91, 213, 0.06);
    z-index: 0; pointer-events: none; user-select: none;
  }
  .marca-agua-2 {
    position: fixed; top: 82%; left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-family: var(--serif); font-size: 30pt; font-weight: 800; letter-spacing: 6px;
    color: rgba(200, 155, 60, 0.05);
    z-index: 0; pointer-events: none; user-select: none;
  }

  .pagina {
    position: relative; z-index: 1; max-width: 186mm; margin: 0 auto;
    background:
      linear-gradient(to bottom, rgba(246,249,255,0.6), rgba(255,255,255,0) 70mm),
      #fff;
    padding: 6mm 6mm 4mm; border: .6pt solid #e3ebf7; border-radius: 4pt;
    box-shadow: 0 0 0 2.5pt #17295a inset, 0 0 0 3.4pt #c89b3c inset;
  }

  /* ===== ENCABEZADO OFICIAL ===== */
  .oficial {
    border: 2.5pt solid var(--azul-500); border-radius: 4pt; overflow: hidden;
    margin-bottom: 5mm; box-shadow: 0 3pt 8pt rgba(23,41,90,0.18);
  }
  .oficial-top {
    background: linear-gradient(95deg, var(--azul-900) 0%, var(--azul-700) 42%, var(--azul-500) 78%, var(--azul-300) 100%);
    color: #fff; padding: 8pt 11pt; position: relative;
  }
  .oficial-top::after {
    content: ""; position: absolute; right: 10pt; top: 8pt; width: 30pt; height: 30pt;
    border: 1.5pt solid rgba(230,197,116,0.85); border-radius: 50%;
    background: radial-gradient(circle, rgba(230,197,116,0.25), transparent 70%);
  }
  .oficial-sep { font-family: var(--sans); font-size: 6.6pt; letter-spacing: 1.4px; text-transform: uppercase; opacity: .95; }
  .oficial-dgeti { font-family: var(--sans); font-size: 6pt; letter-spacing: .7px; opacity: .85; margin-top: 1pt; }
  .oficial-plantel { font-family: var(--serif); font-size: 11pt; font-weight: 800; margin-top: 4pt; letter-spacing: .3px; }
  .oficial-carrera { font-family: var(--sans); font-size: 7.2pt; margin-top: 2pt; letter-spacing: 1.8px; font-weight: 600; color: var(--dorado-claro); }

  .oficial-datos { display: flex; justify-content: space-between; gap: 8pt; padding: 5pt 11pt; background: linear-gradient(180deg, #eef4ff, #f6f9ff); border-top: 1pt solid #d7e5ff; }
  .oficial-izq { font-family: var(--sans); font-size: 6.6pt; color: #3c4a5c; line-height: 1.55; }
  .oficial-der { text-align: right; }
  .cct-etiqueta { font-family: var(--sans); font-size: 5.8pt; letter-spacing: 1px; color: #6b7a8d; text-transform: uppercase; }
  .cct-valor { font-family: var(--serif); font-size: 13pt; font-weight: 900; color: var(--azul-700); letter-spacing: .5px; }
  .folio-caja {
    margin-top: 3pt; border: 1pt solid var(--azul-500); border-radius: 3pt; padding: 2pt 6pt;
    background: #fff; display: inline-block; position: relative;
  }
  .folio-caja::before { content: "◆"; color: var(--dorado); font-size: 6pt; margin-right: 3pt; }
  .folio-etiqueta { font-family: var(--sans); font-size: 5.4pt; letter-spacing: 1px; color: var(--azul-500); text-transform: uppercase; }
  .folio-valor { font-family: var(--sans); font-size: 7.4pt; font-weight: 700; color: var(--azul-700); word-break: break-all; }

  /* ===== TÍTULO DEL DOCUMENTO ===== */
  .doc-tipo {
    text-align: center; background: linear-gradient(90deg, var(--azul-900), var(--azul-500));
    color: #fff; padding: 5pt; border-radius: 3pt; font-family: var(--sans);
    font-size: 8.2pt; font-weight: 700; letter-spacing: 3.6px; text-transform: uppercase; margin-bottom: 3mm;
    box-shadow: 0 2pt 6pt rgba(27,91,213,0.25);
  }
  .doc-titulo {
    text-align: center; font-family: var(--serif); font-size: 16pt; font-weight: 900;
    color: var(--azul-700); line-height: 1.22; margin-bottom: 2mm;
  }
  .doc-sub { text-align: center; font-family: var(--sans); font-size: 7.4pt; color: #55637a; margin-bottom: 3mm; }
  .doc-sub strong { color: var(--azul-500); }
  .doc-sep {
    height: 2.6pt; background: linear-gradient(90deg, var(--azul-500), var(--dorado) 50%, var(--azul-500));
    border-radius: 2pt; margin-bottom: 4mm; position: relative;
  }
  .doc-sep::after {
    content: "✦"; position: absolute; left: 50%; top: -3.5pt; transform: translateX(-50%);
    color: var(--dorado); font-size: 8pt; background: #fff; padding: 0 3pt;
  }

  /* ===== RESUMEN VISUAL ===== */
  .resumen {
    display: flex; align-items: center; gap: 8pt; margin-bottom: 5mm; padding: 6pt 9pt;
    background: linear-gradient(90deg, #f3f7ff, #eef4ff); border: .8pt solid #d7e5ff; border-radius: 4pt;
  }
  .resumen-item { text-align: center; min-width: 30pt; }
  .resumen-num { font-family: var(--serif); font-size: 13pt; font-weight: 900; color: var(--azul-700); line-height: 1; }
  .resumen-label { font-family: var(--sans); font-size: 5.4pt; text-transform: uppercase; letter-spacing: .8px; color: #6b7a8d; margin-top: 2pt; }
  .resumen-divisor { width: 1pt; height: 16pt; background: #c4d2e6; }
  .resumen-barra { flex: 1; height: 7pt; background: #fff; border: .6pt solid var(--borde); border-radius: 4pt; overflow: hidden; }
  .resumen-barra-fill { height: 100%; background: linear-gradient(90deg, var(--azul-500), var(--azul-300)); border-radius: 4pt; }

  /* ===== IDENTIFICACIÓN ===== */
  .id-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4pt; margin-bottom: 5mm; }
  .id-celda {
    border: .8pt solid var(--borde); border-radius: 3pt; padding: 4pt 6pt; background: #fbfdff;
    box-shadow: inset 0 0 0 1pt rgba(27,91,213,0.04);
  }
  .id-etiqueta { font-family: var(--sans); font-size: 6pt; text-transform: uppercase; letter-spacing: .8px; color: #6b7a8d; font-weight: 700; }
  .id-valor { font-family: var(--serif); font-size: 8.6pt; font-weight: 700; color: #12161c; margin-top: 1.5pt; border-bottom: .6pt dotted #b9c8de; padding-bottom: 2pt; }
  .id-celda { position: relative; padding-left: 14pt; }
  .id-celda::before {
    content: "◉"; position: absolute; left: 5pt; top: 5pt; color: var(--azul-500); font-size: 7pt;
    background: var(--dorado-claro); border-radius: 50%; width: 12pt; height: 12pt;
    display: flex; align-items: center; justify-content: center; color: var(--azul-900);
  }

  /* ===== SECCIONES ===== */
  .seccion { margin-bottom: 5mm; break-inside: auto; }
  .seccion-encabezado {
    display: flex; align-items: center; gap: 7pt;
    background: linear-gradient(90deg, var(--azul-900), var(--azul-300));
    color: #fff; padding: 4pt 8pt; border-radius: 3pt; margin-bottom: 3.5mm;
    box-shadow: 0 2pt 5pt rgba(23,41,90,0.2);
  }
  .seccion-numero {
    background: linear-gradient(135deg, var(--dorado-claro), var(--dorado));
    color: var(--azul-900); font-family: var(--serif); font-weight: 900; font-size: 9pt;
    width: 18pt; height: 18pt; display: flex; align-items: center; justify-content: center;
    border-radius: 2pt; flex-shrink: 0; box-shadow: 0 1pt 2pt rgba(0,0,0,0.2);
  }
  .seccion-titulo { font-family: var(--sans); font-size: 8pt; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; }

  .campos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4pt; }
  .campo {
    border: .8pt solid var(--borde); border-radius: 3pt; padding: 4pt 6pt; background: #fff;
    break-inside: avoid; position: relative;
  }
  .campo::before {
    content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 2.4pt;
    background: linear-gradient(180deg, var(--azul-500), var(--azul-300)); border-radius: 3pt 0 0 3pt;
  }
  .campo-largo { grid-column: 1 / -1; }
  .campo-etiqueta { font-family: var(--sans); font-size: 6pt; text-transform: uppercase; letter-spacing: .6px; color: #5a6a80; font-weight: 700; }
  .campo-valor {
    font-family: var(--sans); font-size: 8.6pt; color: #12161c; margin-top: 2pt; padding: 2.5pt 4pt;
    background: var(--fondo-suave); border-radius: 2pt;
  }
  .campo-valor.vacio { color: #9aa8bb; background: #fbfcfe; }
  .req { color: #b3261e; font-weight: 800; }

  /* ===== TABLAS ===== */
  .tabla-bloque { margin-top: 4pt; break-inside: auto; }
  .tabla-titulo { font-family: var(--sans); font-size: 6.6pt; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; color: var(--azul-700); margin-bottom: 2pt; }
  .tabla-titulo::before { content: "▸ "; color: var(--dorado); }
  .tabla-datos { width: 100%; border-collapse: collapse; margin-bottom: 3pt; }
  .tabla-datos th {
    background: linear-gradient(180deg, var(--azul-700), var(--azul-900)); color: #fff;
    font-family: var(--sans); font-size: 6.2pt; text-transform: uppercase; letter-spacing: .4px;
    padding: 4pt 3pt; border: .6pt solid var(--azul-700); text-align: left;
  }
  .tabla-datos td {
    border: .6pt solid var(--borde); padding: 3.4pt 3pt; font-family: var(--sans); font-size: 7pt;
    height: 14pt; vertical-align: top; color: #12161c;
  }
  .fila-vacia td { color: #c4d2e6; background: #fbfcfe; }
  .fila-dato td { background: var(--fondo-suave); }

  /* ===== DICTAMEN ===== */
  .dictamen { border: 1.4pt solid var(--azul-500); border-radius: 4pt; margin-top: 6mm; break-inside: avoid; overflow: hidden; box-shadow: 0 3pt 9pt rgba(23,41,90,0.12); }
  .dictamen-cab {
    background: linear-gradient(90deg, var(--azul-900), var(--azul-500));
    color: #fff; padding: 4pt 8pt; font-family: var(--sans); font-size: 7.8pt; font-weight: 800;
    letter-spacing: 2.2px; text-transform: uppercase; display: flex; align-items: center; gap: 6pt;
  }
  .dictamen-cab::before { content: "❖"; color: var(--dorado-claro); font-size: 10pt; }
  .dictamen-cuerpo { padding: 7pt 9pt; background: #fbfdff; }
  .dictamen-texto { font-family: var(--serif); font-size: 8.2pt; text-align: justify; color: #232c3b; line-height: 1.62; }
  .dictamen-texto strong { color: var(--azul-700); }
  .dictamen-firma-linea { margin-top: 7pt; font-family: var(--sans); font-size: 7.2pt; font-weight: 700; color: var(--azul-500); }

  /* ===== OBSERVACIONES ===== */
  .observaciones { margin-top: 5mm; break-inside: avoid; }
  .obs-titulo { font-family: var(--sans); font-size: 7.2pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1.6px; color: var(--azul-700); border-bottom: 1.4pt solid var(--azul-500); padding-bottom: 2pt; margin-bottom: 5pt; }
  .obs-titulo::before { content: "✎ "; color: var(--dorado); }
  .obs-linea { height: 15pt; border-bottom: .6pt dotted #9fb2cd; }

  /* ===== FIRMAS ===== */
  .firmas { margin-top: 7mm; break-inside: avoid; }
  .firmas-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14pt 20pt; }
  .firma { text-align: center; }
  .firma-linea { border-top: 1pt solid #12161c; padding-top: 3pt; position: relative; }
  .firma-linea::before { content: "✓"; position: absolute; left: 0; top: -8pt; color: var(--azul-500); font-size: 7pt; }
  .firma-nombre { font-family: var(--sans); font-size: 6.8pt; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: var(--azul-700); }
  .firma-cargo { font-family: var(--sans); font-size: 6.2pt; color: #6b7a8d; }

  /* ===== SELLO ===== */
  .sello-zona { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6mm; break-inside: avoid; }
  .sello {
    width: 92pt; height: 92pt; border: 2pt double var(--azul-500); border-radius: 50%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: var(--azul-500); text-align: center; opacity: .82; position: relative;
    background: radial-gradient(circle, rgba(27,91,213,0.06), transparent 70%);
  }
  .sello::before { content: "★"; position: absolute; top: 6pt; font-size: 7pt; color: var(--dorado); }
  .sello-siglas { font-family: var(--serif); font-size: 15pt; font-weight: 900; letter-spacing: 1px; }
  .sello-plantel { font-family: var(--sans); font-size: 5.4pt; font-weight: 700; letter-spacing: 1.1px; text-transform: uppercase; margin-top: 2pt; }
  .sello-cct { font-family: var(--sans); font-size: 5pt; margin-top: 1pt; letter-spacing: .6px; }
  .sello-ciudad { font-family: var(--sans); font-size: 5pt; margin-top: 3pt; }

  .info-extra { font-family: var(--sans); font-size: 6.2pt; color: #55637a; text-align: right; line-height: 1.6; }
  .info-extra strong { color: var(--azul-700); }

  /* ===== PIE ===== */
  .pie {
    margin-top: 8mm; border-top: 1.2pt solid var(--azul-500); padding-top: 4pt;
    display: flex; justify-content: space-between; align-items: center; gap: 8pt;
    font-family: var(--sans); font-size: 6pt; color: #5a6a80;
  }
  .pie strong { color: var(--azul-700); }
  .pie-pag { font-weight: 800; color: var(--azul-500); white-space: nowrap; }

  .no-print { margin: 0 0 8mm 0; text-align: center; }
  .no-print button {
    background: linear-gradient(90deg, var(--azul-500), var(--azul-700)); color: #fff; border: 0;
    border-radius: 6pt; padding: 9pt 26pt; font-size: 11pt; font-weight: 700; cursor: pointer; font-family: var(--sans);
  }
  .no-print button:hover { filter: brightness(1.08); }
  .no-print span { display: block; margin-top: 4pt; font-size: 7pt; color: #6b7a8d; }

  @media print {
    .no-print { display: none !important; }
    body { font-size: 9.2pt; }
    .seccion, .tabla-bloque, .dictamen, .firmas, .sello-zona { break-inside: avoid; }
    .campo { break-inside: avoid; }
    .pagina { box-shadow: 0 0 0 2.5pt var(--azul-700) inset, 0 0 0 3.4pt var(--dorado) inset; border: none; }
  }
</style>
</head>
<body>

<div class="marca-agua">CBTIS 270</div>
<div class="marca-agua-sub">LOGÍSTICA</div>
<div class="marca-agua-2">DGETI</div>

<div class="pagina">

  <div class="no-print">
    <button onclick="window.print()"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><path d="M6.5 9V3.5h11V9"/><rect x="3" y="9" width="18" height="7.5" rx="2"/><path d="M6.5 14h11v6.5h-11Z"/></svg>Imprimir / Guardar como PDF</button>
    <span>Usa "Guardar como PDF" en el diálogo de impresión para conservar el diseño institucional.</span>
  </div>

  <!-- ENCABEZADO OFICIAL -->
  <header class="oficial">
    <div class="oficial-top">
      <div class="oficial-sep">${INST.sep}</div>
      <div class="oficial-dgeti">${INST.dgeti} · ${INST.dgpt}</div>
      <div class="oficial-plantel">${INST.plantel}</div>
      <div class="oficial-carrera">${INST.carrera}</div>
    </div>
    <div class="oficial-datos">
      <div class="oficial-izq">
        ${INST.direccion}<br>
        ${INST.ciudad}<br>
        ${INST.tel} · ${INST.mail}<br>
        ${INST.web}
      </div>
      <div class="oficial-der">
        <div class="cct-etiqueta">Clave de Centro de Trabajo</div>
        <div class="cct-valor">${INST.cct}</div>
        <div class="folio-caja">
          <div class="folio-etiqueta">Folio del documento</div>
          <div class="folio-valor">${F}</div>
        </div>
      </div>
    </div>
  </header>

  <!-- TÍTULO -->
  <div class="doc-tipo">Dictamen documental institucional</div>
  <h1 class="doc-titulo">${esc(formato.titulo)}</h1>
  <p class="doc-sub">
    <strong>${esc(formato.codigo)}</strong> · Módulo ${formato.modulo}: ${esc(nombreModulo)}<br>
    Referencia normativa: <strong>${esc(formato.referenciaNormativa)}</strong> · Registro: ${camposLlenos} de ${camposTotales} campos
  </p>
  <div class="doc-sep"></div>

  <!-- BARRA DE RESUMEN VISUAL -->
  <div class="resumen">
    <div class="resumen-item">
      <div class="resumen-num">${formato.secciones.length}</div>
      <div class="resumen-label">Secciones</div>
    </div>
    <div class="resumen-divisor"></div>
    <div class="resumen-item">
      <div class="resumen-num">${camposTotales}</div>
      <div class="resumen-label">Campos</div>
    </div>
    <div class="resumen-divisor"></div>
    <div class="resumen-item">
      <div class="resumen-num">${camposLlenos}</div>
      <div class="resumen-label">Capturados</div>
    </div>
    <div class="resumen-divisor"></div>
    <div class="resumen-item">
      <div class="resumen-num">${formato.firmas.length}</div>
      <div class="resumen-label">Firmas</div>
    </div>
    <div class="resumen-barra">
      <div class="resumen-barra-fill" style="width:${camposTotales ? Math.round((camposLlenos / camposTotales) * 100) : 0}%"></div>
    </div>
  </div>

  <!-- IDENTIFICACIÓN -->
  <div class="id-grid">
    <div class="id-celda"><div class="id-etiqueta">Alumno responsable</div><div class="id-valor">${esc(val(datos, "alumno")) || "&mdash;"}</div></div>
    <div class="id-celda"><div class="id-etiqueta">Matrícula / No. de control</div><div class="id-valor">${esc(val(datos, "matricula")) || "&mdash;"}</div></div>
    <div class="id-celda"><div class="id-etiqueta">Semestre y grupo</div><div class="id-valor">${semestre ? `${semestre}°` : "&mdash;"} · ${esc(grupo) || "&mdash;"}</div></div>
    <div class="id-celda"><div class="id-etiqueta">Turno</div><div class="id-valor">${esc(turno) || "&mdash;"}</div></div>
    <div class="id-celda"><div class="id-etiqueta">Docente responsable</div><div class="id-valor">${esc(val(datos, "docente")) || "&mdash;"}</div></div>
    <div class="id-celda"><div class="id-etiqueta">Fecha de elaboración</div><div class="id-valor">${esc(val(datos, "fecha")) || "&mdash;"}</div></div>
  </div>

  <!-- SECCIONES -->
  ${seccionesHtml}

  <!-- DICTAMEN -->
  <div class="dictamen">
    <div class="dictamen-cab">Dictamen institucional</div>
    <div class="dictamen-cuerpo">
      <p class="dictamen-texto">
        El presente documento fue elaborado en la <strong>Plataforma Institucional de Logística del CBTIS No. 270</strong>
        (CCT ${INST.cct}) y refleja la información capturada por el estudiante responsable en el marco del
        <strong>Módulo ${formato.modulo}: ${esc(nombreModulo)}</strong>, correspondiente al plan de estudios de la
        <strong>${INST.carrera}</strong> de la ${INST.dgeti}.
      </p>
      <p class="dictamen-texto" style="margin-top:5pt">
        Se deja constancia de que los datos asentados son proporcionados por el estudiante bajo
        <strong>protesta de decir verdad</strong>, y su validación académica corresponde al docente responsable del
        submódulo. Este formato forma parte del <strong>portafolio de evidencias</strong> del alumno y su vigencia
        queda sujeta al periodo lectivo en que fue emitido.
      </p>
      <p class="dictamen-firma-linea">Emitido en Ciudad Juárez, Chihuahua, a ${fechaLarga()}.</p>
    </div>
  </div>

  <!-- OBSERVACIONES -->
  <div class="observaciones">
    <div class="obs-titulo">Observaciones y validación docente</div>
    <div class="obs-linea"></div>
    <div class="obs-linea"></div>
    <div class="obs-linea"></div>
    <div class="obs-linea"></div>
  </div>

  <!-- SELLO Y FIRMAS -->
  <div class="sello-zona">
    <div class="sello">
      <div class="sello-siglas">CBTIS</div>
      <div class="sello-plantel">No. 270</div>
      <div class="sello-cct">CCT ${INST.cct}</div>
      <div class="sello-ciudad">Ciudad Juárez, Chih.</div>
    </div>
    <div class="info-extra">
      <strong>Plataforma Institucional de Logística</strong><br>
      ${INST.plantel}<br>
      Documento generado digitalmente · ${esc(formato.codigo)}<br>
      ${esc(F)}
    </div>
  </div>

  <div class="firmas">
    <div class="firmas-grid">
      ${formato.firmas
        .map(
          (f) => `
        <div class="firma">
          <div class="firma-linea"></div>
          <div class="firma-nombre">${esc(f)}</div>
        </div>`,
        )
        .join("")}
    </div>
  </div>

  <!-- PIE -->
  <div class="pie">
    <div>
      <strong>${INST.plantel}</strong><br>
      ${INST.direccion} · ${INST.ciudad}
    </div>
    <div class="pie-pag">${esc(formato.codigo)} · ${esc(F)}</div>
  </div>

</div>
</body>
</html>`;
}

export function abrirImprimible(formato: FormatoDinamico, datos: Datos) {
  const html = generarHtmlImprimible(formato, datos);
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
