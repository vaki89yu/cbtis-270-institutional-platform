import type { TipoExportacion } from "@/lib/exportacion";

type Props = {
  tipo: TipoExportacion;
  /** Filtros que se arrastran al archivo (aula, clave, fechas…) */
  params?: Record<string, string | number | null | undefined>;
  etiqueta?: string;
  /** Versión pequeña para encabezados de tabla */
  compacto?: boolean;
};

function enlace(tipo: TipoExportacion, params: Props["params"], formato: "xlsx" | "csv") {
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params ?? {})) {
    if (valor === null || valor === undefined || String(valor).trim() === "") continue;
    busqueda.set(clave, String(valor));
  }
  busqueda.set("formato", formato);
  return `/api/exportar/${tipo}?${busqueda.toString()}`;
}

/**
 * Dos enlaces de descarga (XLSX y CSV) que respetan los filtros de la pantalla.
 * Es un componente de servidor: no necesita JavaScript en el cliente.
 */
export function BotonExportar({ tipo, params, etiqueta = "Exportar", compacto = false }: Props) {
  const base = compacto
    ? "rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:border-inst-300 hover:text-inst-700"
    : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-inst-300 hover:text-inst-700";

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{etiqueta}</span>
      <a
        href={enlace(tipo, params, "xlsx")}
        className={base}
        title="Descargar en Excel (.xlsx)"
        rel="nofollow"
      >
        XLSX
      </a>
      <a
        href={enlace(tipo, params, "csv")}
        className={base}
        title="Descargar en CSV (separado por punto y coma)"
        rel="nofollow"
      >
        CSV
      </a>
    </div>
  );
}
