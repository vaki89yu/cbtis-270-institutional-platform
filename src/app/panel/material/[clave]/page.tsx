import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icono } from "@/components/iconos";
import {
  ETIQUETA_MATERIAL,
  materialPorClave,
  materialesDelModulo,
} from "@/lib/academico/materiales";
import { NOMBRE_MODULO } from "@/lib/formatos/catalogo";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ clave: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clave } = await params;
  const material = materialPorClave(decodeURIComponent(clave));
  return { title: material ? material.titulo : "Material de clase" };
}

const COLOR_TIPO: Record<string, string> = {
  apunte: "bg-inst-100 text-inst-800",
  guia: "bg-emerald-100 text-emerald-800",
  video: "bg-violet-100 text-violet-800",
  enlace: "bg-sky-100 text-sky-800",
  caso: "bg-amber-100 text-amber-800",
};

export default async function MaterialPage({ params }: Props) {
  await requireUser();
  const { clave } = await params;
  const material = materialPorClave(decodeURIComponent(clave));
  if (!material) notFound();

  const hermanos = materialesDelModulo(material.modulo).filter((m) => m.clave !== material.clave);

  return (
    <div className="space-y-6">
      <Link href="/panel/clases" className="btn-mini">
        ← Volver a mis aulas
      </Link>

      <article className="tarjeta overflow-hidden">
        <header className="border-b border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${COLOR_TIPO[material.tipo] ?? "bg-slate-100 text-slate-700"}`}>
              {ETIQUETA_MATERIAL[material.tipo]}
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              Módulo {material.modulo} · {NOMBRE_MODULO[material.modulo]}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black leading-tight text-slate-900">
            {material.titulo}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{material.descripcion}</p>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Icono nombre="reloj" tamano={13} />
              {material.duracion}
            </span>
            <span>{material.submodulo}</span>
          </p>

          {material.descargaUrl || material.enlaceExterno ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {material.descargaUrl ? (
                <a href={material.descargaUrl} className="btn-primario px-4 py-2 text-sm" download>
                  Descargar la plantilla en Excel
                </a>
              ) : null}
              {material.enlaceExterno ? (
                <a
                  href={material.enlaceExterno}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secundario px-4 py-2 text-sm"
                >
                  Abrir la fuente oficial ↗
                </a>
              ) : null}
            </div>
          ) : null}
        </header>

        <div className="space-y-7 p-6 sm:p-8">
          {material.contenido.map((seccion, i) => (
            <section key={i}>
              <h2 className="flex items-baseline gap-2 text-lg font-black text-slate-900">
                <span className="text-sm font-black text-inst-500">{i + 1}.</span>
                {seccion.titulo}
              </h2>

              {seccion.parrafos?.map((p, j) => (
                <p key={j} className="mt-2 text-[15px] leading-relaxed text-slate-700">
                  {p}
                </p>
              ))}

              {seccion.lista ? (
                <ul className="mt-3 space-y-1.5">
                  {seccion.lista.map((li, j) => (
                    <li key={j} className="flex gap-2 text-[15px] leading-relaxed text-slate-700">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-inst-500" />
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {seccion.tabla ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                      <tr>
                        {seccion.tabla.encabezados.map((h) => (
                          <th
                            key={h}
                            className="border border-slate-200 bg-slate-100 px-3 py-2 text-left text-xs font-black uppercase tracking-wide text-slate-600"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {seccion.tabla.filas.map((fila, j) => (
                        <tr key={j} className={j % 2 ? "bg-slate-50/60" : ""}>
                          {fila.map((celda, k) => (
                            <td
                              key={k}
                              className={`border border-slate-200 px-3 py-2 align-top text-slate-700 ${
                                k === 0 ? "font-semibold text-slate-900" : ""
                              }`}
                            >
                              {celda}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {seccion.nota ? (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  <Icono nombre="informacion" tamano={16} className="mt-0.5 shrink-0" />
                  {seccion.nota}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      </article>

      {hermanos.length > 0 ? (
        <section className="tarjeta p-6">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Más material del módulo {material.modulo}
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {hermanos.map((m) => (
              <Link
                key={m.clave}
                href={`/panel/material/${m.clave}`}
                className="rounded-xl border border-slate-200 p-3 transition hover:border-inst-300"
              >
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${COLOR_TIPO[m.tipo] ?? "bg-slate-100"}`}>
                  {ETIQUETA_MATERIAL[m.tipo]}
                </span>
                <p className="mt-1 text-sm font-bold text-slate-800">{m.titulo}</p>
                <p className="text-[11px] text-slate-500">{m.duracion}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
