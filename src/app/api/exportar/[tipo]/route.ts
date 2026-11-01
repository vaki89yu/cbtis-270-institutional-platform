import { getCurrentUser } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  construirExportacion,
  esTipoExportacion,
  nombreDeArchivo,
  tablaACsv,
  type TablaExportable,
} from "@/lib/exportacion";

export const dynamic = "force-dynamic";

const AZUL = "FF1D5BD5";

type Contexto = { params: Promise<{ tipo: string }> };

/** Ancho de columna razonable sin pasarse del límite de Excel. */
function anchoDeColumna(tabla: TablaExportable, indice: number) {
  const largo = Math.max(
    tabla.encabezados[indice]?.length ?? 0,
    ...tabla.filas.map((fila) => String(fila[indice] ?? "").length),
  );
  return Math.min(Math.max(largo + 2, 10), 60);
}

async function generarXlsx(tabla: TablaExportable, meta: { usuario: string }): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  libro.creator = "CBTIS No. 270 · Plataforma de Logística";
  libro.created = new Date();

  const hoja = libro.addWorksheet(tabla.hoja, {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const columnas = Math.max(tabla.encabezados.length, 2);
  hoja.mergeCells(1, 1, 1, columnas);
  hoja.getCell(1, 1).value = `CBTIS No. 270 · ${tabla.titulo}`;
  hoja.getCell(1, 1).font = { bold: true, size: 13, color: { argb: "FF0F172A" } };
  hoja.getCell(1, 1).alignment = { vertical: "middle" };

  hoja.mergeCells(2, 1, 2, columnas);
  hoja.getCell(2, 1).value = `Generado el ${new Date().toLocaleString("es-MX")} por ${meta.usuario}`;
  hoja.getCell(2, 1).font = { size: 10, color: { argb: "FF64748B" } };

  const filaEncabezado = hoja.getRow(4);
  filaEncabezado.values = tabla.encabezados;
  filaEncabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
  filaEncabezado.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  filaEncabezado.height = 28;
  filaEncabezado.eachCell((celda) => {
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
    celda.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  for (const fila of tabla.filas) hoja.addRow(fila);

  hoja.columns.forEach((_, indice) => {
    hoja.getColumn(indice + 1).width = anchoDeColumna(tabla, indice);
  });

  hoja.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: tabla.encabezados.length },
  };

  if (tabla.nota) {
    hoja.addRow([]);
    const filaNota = hoja.addRow([tabla.nota]);
    hoja.mergeCells(filaNota.number, 1, filaNota.number, columnas);
    filaNota.getCell(1).font = { italic: true, size: 9, color: { argb: "FF64748B" } };
  }

  // `writeBuffer` devuelve un Buffer de Node: se copia a un ArrayBuffer limpio
  // para poder responderlo tal cual desde el route handler.
  const buffer = Buffer.from(await libro.xlsx.writeBuffer());
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function GET(request: Request, contexto: Contexto) {
  const { tipo } = await contexto.params;
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Inicia sesión para exportar." }, { status: 401 });
  }

  if (!esTipoExportacion(tipo)) {
    return Response.json({ ok: false, error: "Ese reporte no existe." }, { status: 404 });
  }

  const url = new URL(request.url);
  const formato = url.searchParams.get("formato") === "csv" ? "csv" : "xlsx";

  const resultado = await construirExportacion(tipo, user, url.searchParams);
  if (!resultado.ok) {
    return Response.json({ ok: false, error: resultado.error }, { status: resultado.status });
  }

  const nombre = nombreDeArchivo(tipo, formato, url.searchParams);
  const cabeceras = {
    "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename="${nombre}"`,
  };

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "exportacion_generada",
    entidad: "export",
    entidadId: tipo,
    detalle: `${tipo} en ${formato.toUpperCase()} · ${resultado.tabla.filas.length} fila(s)`,
  });

  if (formato === "csv") {
    return new Response(tablaACsv(resultado.tabla), {
      headers: {
        ...cabeceras,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  }

  const archivo = await generarXlsx(resultado.tabla, { usuario: user.nombre });
  const tipoXlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return new Response(archivo, {
    headers: {
      ...cabeceras,
      "Content-Type": tipoXlsx,
    },
  });
}
