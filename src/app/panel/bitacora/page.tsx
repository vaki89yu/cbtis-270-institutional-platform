import type { Metadata } from "next";
import Link from "next/link";
import { BotonExportar } from "@/components/boton-exportar";
import { Icono } from "@/components/iconos";
import { consultarBitacora, etiquetaAccion } from "@/lib/bitacora";
import { formatoFechaHora, requireRole } from "@/lib/guards";

export const metadata: Metadata = { title: "Bitácora de auditoría" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    accion?: string;
    entidad?: string;
    desde?: string;
    hasta?: string;
    pagina?: string;
  }>;
};

export default async function BitacoraPage({ searchParams }: Props) {
  await requireRole("admin");
  const params = await searchParams;

  const filtros = {
    q: params.q ?? "",
    accion: params.accion ?? "",
    entidad: params.entidad ?? "",
    desde: params.desde ?? "",
    hasta: params.hasta ?? "",
    pagina: Number(params.pagina ?? 1) || 1,
  };

  const data = await consultarBitacora(filtros);

  const enlace = (pagina: number) => {
    const busqueda = new URLSearchParams();
    if (filtros.q) busqueda.set("q", filtros.q);
    if (filtros.accion) busqueda.set("accion", filtros.accion);
    if (filtros.entidad) busqueda.set("entidad", filtros.entidad);
    if (filtros.desde) busqueda.set("desde", filtros.desde);
    if (filtros.hasta) busqueda.set("hasta", filtros.hasta);
    busqueda.set("pagina", String(pagina));
    return `/panel/bitacora?${busqueda.toString()}`;
  };

  const hayFiltros = Boolean(filtros.q || filtros.accion || filtros.entidad || filtros.desde || filtros.hasta);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Icono nombre="candado" tamano={24} className="text-inst-700" />
            Bitácora de auditoría
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Quién habilitó un formato, quién cambió una calificación, quién exportó qué y cuándo.
            Es el registro que se revisa cuando alguien pregunta «¿quién modificó esto?».
          </p>
        </div>
        <BotonExportar
          tipo="bitacora"
          params={{
            q: filtros.q,
            accion: filtros.accion,
            entidad: filtros.entidad,
            desde: filtros.desde,
            hasta: filtros.hasta,
          }}
          etiqueta="Exportar bitácora"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="tarjeta p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Registros</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{data.total}</p>
          <p className="mt-0.5 text-xs text-slate-500">con los filtros aplicados</p>
        </div>
        <div className="tarjeta p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Actores</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{data.actores}</p>
          <p className="mt-0.5 text-xs text-slate-500">usuarios que han dejado huella</p>
        </div>
        <div className="tarjeta p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Acciones distintas</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{data.acciones.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">tipos de operación registrados</p>
        </div>
        <div className="tarjeta p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Entidades</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{data.entidades.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">tablas u objetos afectados</p>
        </div>
      </div>

      <form className="tarjeta grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" action="/panel/bitacora">
        <label className="lg:col-span-2">
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">
            Buscar
          </span>
          <input
            name="q"
            defaultValue={filtros.q}
            className="campo"
            placeholder="Actor, detalle o entidad"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">
            Acción
          </span>
          <select name="accion" defaultValue={filtros.accion} className="campo">
            <option value="">Todas</option>
            {data.acciones.map((accion) => (
              <option key={accion.valor} value={accion.valor}>
                {etiquetaAccion(accion.valor)} ({accion.total})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">
            Entidad
          </span>
          <select name="entidad" defaultValue={filtros.entidad} className="campo">
            <option value="">Todas</option>
            {data.entidades.map((entidad) => (
              <option key={entidad.valor} value={entidad.valor}>
                {entidad.valor} ({entidad.total})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">
            Desde
          </span>
          <input type="date" name="desde" defaultValue={filtros.desde} className="campo" />
        </label>
        <label>
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">
            Hasta
          </span>
          <input type="date" name="hasta" defaultValue={filtros.hasta} className="campo" />
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className="btn-primario px-4 py-2.5 text-sm">
            Filtrar
          </button>
          {hayFiltros ? (
            <Link href="/panel/bitacora" className="btn-secundario px-4 py-2.5 text-sm">
              Limpiar filtros
            </Link>
          ) : null}
        </div>
      </form>

      <section className="tarjeta p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black text-slate-900">
            Movimientos
            <span className="ml-2 text-sm font-bold text-slate-400">{data.total}</span>
          </h2>
          <p className="text-xs text-slate-500">
            Página {data.pagina} de {data.paginas}
          </p>
        </div>

        {data.filas.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            {hayFiltros
              ? "No hay movimientos con esos filtros."
              : "Todavía no hay movimientos registrados en la bitácora."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Fecha y hora</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Acción</th>
                  <th className="py-2 pr-3">Entidad</th>
                  <th className="py-2">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {data.filas.map((fila) => (
                  <tr key={fila.id} className="border-b border-slate-100 align-top">
                    <td className="whitespace-nowrap py-2 pr-3 text-xs text-slate-500">
                      {formatoFechaHora(fila.createdAt)}
                    </td>
                    <td className="py-2 pr-3 text-xs font-bold text-slate-800">
                      {fila.actor ?? "Sistema"}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full bg-inst-50 px-2 py-0.5 text-[11px] font-bold text-inst-800">
                        {etiquetaAccion(fila.accion)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-xs text-slate-500">
                      {fila.entidad ?? "—"}
                      {fila.entidadId ? ` #${fila.entidadId}` : ""}
                    </td>
                    <td className="py-2 text-xs text-slate-600">{fila.detalle ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.paginas > 1 ? (
          <nav className="mt-4 flex items-center justify-between gap-2 text-xs font-bold">
            {data.pagina > 1 ? (
              <Link href={enlace(data.pagina - 1)} className="btn-mini">
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-slate-400">
              {data.pagina} / {data.paginas}
            </span>
            {data.pagina < data.paginas ? (
              <Link href={enlace(data.pagina + 1)} className="btn-mini">
                Siguiente →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
