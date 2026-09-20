import Link from "next/link";
import type { Metadata } from "next";
import { catalogoFormatosLogistica } from "@/lib/consultas";
import { requireUser } from "@/lib/guards";
import { FORMATOS_DINAMICOS, NOMBRE_MODULO } from "@/lib/formatos/catalogo";

export const metadata: Metadata = { title: "Biblioteca de Formatos Logísticos" };
export const dynamic = "force-dynamic";

const ARCHIVOS: Record<string, { url: string; ext: string }> = {
  "FOR-LOG-01": { url: "/formatos/FOR-LOG-01_Kardex-de-Control-de-Existencias_CBTIS270.xlsx", ext: "xlsx" },
  "FOR-LOG-02": { url: "/formatos/FOR-LOG-02_Orden-de-Compra_CBTIS270.xlsx", ext: "xlsx" },
  "FOR-LOG-03": { url: "/formatos/FOR-LOG-03_Carta-Porte-Guia-de-Llenado_CBTIS270.xlsx", ext: "xlsx" },
  "FOR-LOG-04": { url: "/formatos/FOR-LOG-04_Costeo-de-Fletes-y-Rutas_CBTIS270.xlsx", ext: "xlsx" },
  "FOR-LOG-05": { url: "/formatos/FOR-LOG-05_Pedimento-Aduanal-A1_CBTIS270.xlsx", ext: "xlsx" },
  "FOR-LOG-06": { url: "/formatos/FOR-LOG-06_Checklist-Montacargas-y-Seguridad_CBTIS270.xlsx", ext: "xlsx" },
};

export default async function FormatosPage() {
  await requireUser();
  const descargables = await catalogoFormatosLogistica();

  // Agrupar los formatos llenables por módulo
  const porModulo = [1, 2, 3, 4, 5].map((m) => ({
    modulo: m,
    nombre: NOMBRE_MODULO[m],
    formatos: FORMATOS_DINAMICOS.filter((f) => f.modulo === m),
  }));

  return (
    <div className="space-y-8">
      <div>
        <span className="rounded-full bg-inst-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-inst-700">
          Herramientas de industria
        </span>
        <h1 className="mt-2 text-2xl font-black text-slate-900">Biblioteca de Formatos Logísticos</h1>
        <p className="text-sm text-slate-500">
          Dos modos de trabajo: <strong>llenar en línea</strong> y descargar en PDF con membrete
          institucional, o descargar la plantilla Excel completa de cada formato.
        </p>
      </div>

      {/* SECCIÓN A: LLENABLES EN PLATAFORMA */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-800">
              Llenar en línea · PDF institucional
            </span>
            <h2 className="mt-2 text-xl font-black text-slate-900">
              Formatos llenables por módulo ({FORMATOS_DINAMICOS.length})
            </h2>
          </div>
        </div>

        {porModulo.map(({ modulo, nombre, formatos }) => (
          <div key={modulo} className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <span className="rounded-lg bg-inst-700 px-2 py-1 text-[11px] font-black text-white">
                M{modulo}
              </span>
              {nombre}
            </h3>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {formatos.map((f) => (
                <Link
                  key={f.codigo}
                  href={`/panel/formatos/${f.codigo}`}
                  className="tarjeta group flex flex-col justify-between p-5 transition hover:shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-inst-50 px-2.5 py-1 text-[11px] font-black text-inst-700">
                        {f.codigo}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Llenable
                      </span>
                    </div>
                    <h4 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-inst-700">
                      {f.titulo}
                    </h4>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{f.descripcion}</p>
                    <p className="mt-3 text-[10px] font-semibold text-slate-400">
                      {f.secciones.length} secciones ·{" "}
                      {f.secciones.reduce((a, s) => a + s.campos.length, 0)} campos ·{" "}
                      {f.firmas.length} firmas
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-inst-700">
                    Llenar y ver dictamen imprimible →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* SECCIÓN B: PLANTILLAS EXCEL DESCARGABLES */}
      <section className="space-y-5 border-t border-slate-200 pt-8">
        <div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
            Plantillas Excel con datos de ejemplo
          </span>
          <h2 className="mt-2 text-xl font-black text-slate-900">
            Descarga directa de plantillas ({descargables.length})
          </h2>
          <p className="text-sm text-slate-500">
            Archivos .xlsx con encabezado institucional, ejemplos cargados e instrucciones.
          </p>
        </div>

        <div className="tarjeta divide-y divide-slate-100">
          {descargables.map((f) => {
            const info = ARCHIVOS[f.codigo];
            return (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">
                    {f.codigo}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{f.titulo}</p>
                    <p className="truncate text-xs text-slate-500">{f.categoria}</p>
                  </div>
                </div>
                <a
                  href={info?.url ?? "#"}
                  download
                  className="btn-secundario px-4 py-2 text-xs"
                >
                  Descargar .{info?.ext ?? "xlsx"}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      <div className="tarjeta p-5 text-xs text-slate-600">
        <strong className="text-slate-900">Nota institucional:</strong> Los formatos fueron elaborados por
        la Plataforma de Logística del CBTIS No. 270 (CCT 08DCT0270T, Ciudad Juárez, Chihuahua) con fines
        exclusivamente académicos. Cada PDF generado incluye membrete institucional, folio, bloque de firmas
        y control de páginas.
      </div>

      <Link href="/panel" className="btn-secundario inline-flex">
        ← Volver al panel
      </Link>
    </div>
  );
}
