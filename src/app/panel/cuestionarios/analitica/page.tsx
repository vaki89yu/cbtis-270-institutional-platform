import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/components/iconos";
import { CUESTIONARIOS, cuestionarioPorClave } from "@/lib/academico/cuestionarios";
import {
  analiticaDeCuestionarios,
  intentosParaAnalitica,
  type ReactivoAnalitica,
} from "@/lib/academico/analitica";
import { requireRole } from "@/lib/guards";

export const metadata: Metadata = { title: "Analítica por reactivo" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ clave?: string }> };

const LETRA = ["A", "B", "C", "D", "E", "F"];

function colorDeAcierto(porcentaje: number | null) {
  if (porcentaje === null) return "bg-slate-100 text-slate-500";
  if (porcentaje >= 80) return "bg-emerald-100 text-emerald-800";
  if (porcentaje >= 60) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function Barra({ porcentaje }: { porcentaje: number }) {
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <span
        className={`block h-full rounded-full ${
          porcentaje >= 80 ? "bg-emerald-500" : porcentaje >= 60 ? "bg-amber-500" : "bg-rose-500"
        }`}
        style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }}
      />
    </span>
  );
}

export default async function AnaliticaPage({ searchParams }: Props) {
  const user = await requireRole("docente", "admin");
  const params = await searchParams;
  const clavePedida = params.clave && cuestionarioPorClave(params.clave) ? params.clave : null;

  const intentos = await intentosParaAnalitica(user);
  const data = await analiticaDeCuestionarios(intentos, clavePedida ? [clavePedida] : undefined);
  const detalle = clavePedida ? (data.porCuestionario[0] ?? null) : null;

  const alcance =
    user.rol === "admin" ? "todo el plantel" : "los alumnos inscritos en tus aulas";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/panel/cuestionarios" className="text-sm text-slate-500 hover:text-inst-700">
            ← Cuestionarios
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-slate-900">
            <Icono nombre="cuestionario" tamano={24} className="text-inst-700" />
            Analítica por reactivo
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Qué reactivos se están fallando y qué distractor está eligiendo el grupo. Se calcula con
            los intentos ya guardados de {alcance}.
          </p>
        </div>
        <Link
          href={clavePedida ? `/panel/cuestionarios/banco?clave=${clavePedida}` : "/panel/cuestionarios/banco"}
          className="btn-secundario px-3.5 py-2 text-xs"
        >
          Editar el banco de reactivos
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="tarjeta p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Intentos</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{data.global.intentos}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            de {data.global.alumnos} {data.global.alumnos === 1 ? "alumno" : "alumnos"}
          </p>
        </div>
        <div className="tarjeta p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Promedio</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{data.global.promedio ?? "—"}</p>
          <p className="mt-0.5 text-xs text-slate-500">sobre 100 puntos</p>
        </div>
        <div className="tarjeta p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Acierto global</p>
          <p className="mt-1 text-3xl font-black text-slate-900">
            {data.global.porcentajeAcierto === null ? "—" : `${data.global.porcentajeAcierto}%`}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {data.global.reactivosEvaluados} reactivos con respuesta
          </p>
        </div>
        <div className="tarjeta p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cuestionarios</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{data.porCuestionario.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">con al menos un intento</p>
        </div>
      </div>

      <form className="tarjeta flex flex-wrap items-end gap-3 p-4" action="/panel/cuestionarios/analitica">
        <label htmlFor="clave" className="min-w-0 flex-1">
          <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
            Alcance
          </span>
          <select id="clave" name="clave" defaultValue={clavePedida ?? ""} className="campo">
            <option value="">Todos los cuestionarios</option>
            {CUESTIONARIOS.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.clave} · {c.titulo}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-primario px-4 py-2.5 text-sm">
          Analizar
        </button>
      </form>

      {/* Detalle de un cuestionario */}
      {detalle ? (
        <>
          <section className="tarjeta p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-inst-700">
                  {detalle.clave} · {detalle.parcial}° parcial
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900">{detalle.titulo}</h2>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  {detalle.intentos} intentos
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  {detalle.alumnos} alumnos
                </span>
                <span
                  className={`rounded-full px-3 py-1 ${colorDeAcierto(detalle.porcentajeAcierto)}`}
                >
                  {detalle.porcentajeAcierto === null ? "sin datos" : `${detalle.porcentajeAcierto}% acierto`}
                </span>
                <span className="rounded-full bg-inst-50 px-3 py-1 text-inst-800">
                  promedio {detalle.promedio ?? "—"}
                </span>
              </div>
            </div>

            {detalle.intentos === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Todavía nadie ha resuelto este cuestionario. Cuando lo hagan, aquí aparece el
                porcentaje de acierto y el distractor que más se elige en cada reactivo.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {detalle.reactivos.map((reactivo) => (
                  <li key={reactivo.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 text-sm font-bold text-slate-900">
                        <span className="mr-1.5 text-xs font-black text-slate-400">
                          {reactivo.posicion + 1}.
                        </span>
                        {reactivo.enunciado}
                        {reactivo.extra ? (
                          <span className="ml-2 rounded bg-inst-50 px-1.5 py-0.5 text-[10px] font-black text-inst-700">
                            propio
                          </span>
                        ) : null}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${colorDeAcierto(
                          reactivo.porcentaje,
                        )}`}
                      >
                        {reactivo.aciertos}/{reactivo.intentos} · {reactivo.porcentaje}%
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <Barra porcentaje={reactivo.porcentaje} />
                    </div>

                    <ul className="mt-2.5 grid gap-1 sm:grid-cols-2">
                      {reactivo.opciones.map((opcion, indice) => {
                        const veces = reactivo.distribucion[indice] ?? 0;
                        const esCorrecta = indice === reactivo.correcta;
                        const esDistractorTop =
                          reactivo.distractorTop?.indice === indice &&
                          reactivo.distractorTop.veces > 0;
                        return (
                          <li
                            key={indice}
                            className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                              esCorrecta
                                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                : esDistractorTop
                                  ? "border-rose-200 bg-rose-50 text-rose-900"
                                  : "border-slate-200 text-slate-600"
                            }`}
                          >
                            <span className="font-black">{LETRA[indice] ?? indice + 1}.</span>
                            <span className="min-w-0 flex-1">
                              {opcion}
                              {esCorrecta ? " · correcta" : ""}
                              {esDistractorTop ? " · el error más común" : ""}
                            </span>
                            <span className="shrink-0 font-bold">{veces}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ReactivosDificiles
            titulo="Los más fallados de este cuestionario"
            reactivos={detalle.reactivos
              .filter((r) => r.intentos >= 2)
              .sort((a, b) => a.porcentaje - b.porcentaje)
              .slice(0, 5)}
          />
        </>
      ) : (
        <>
          <section className="tarjeta p-6">
            <h2 className="text-lg font-black text-slate-900">Por cuestionario</h2>
            {data.porCuestionario.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Todavía no hay intentos que analizar. Pide a tu grupo que resuelva un cuestionario
                desde «Cuestionarios».
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wide text-slate-400">
                      <th className="py-2 pr-3">Cuestionario</th>
                      <th className="py-2 pr-3 text-center">Intentos</th>
                      <th className="py-2 pr-3 text-center">Alumnos</th>
                      <th className="py-2 pr-3 text-center">Promedio</th>
                      <th className="py-2 pr-3 text-center">Acierto</th>
                      <th className="py-2 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.porCuestionario.map((fila) => (
                      <tr key={fila.clave} className="border-b border-slate-100">
                        <td className="py-2 pr-3">
                          <span className="rounded bg-inst-50 px-1.5 py-0.5 text-[10px] font-black text-inst-700">
                            {fila.clave}
                          </span>
                          <span className="ml-2 text-xs text-slate-600">{fila.titulo}</span>
                        </td>
                        <td className="py-2 pr-3 text-center text-xs font-bold text-slate-700">
                          {fila.intentos}
                        </td>
                        <td className="py-2 pr-3 text-center text-xs text-slate-500">{fila.alumnos}</td>
                        <td className="py-2 pr-3 text-center text-xs font-bold text-slate-700">
                          {fila.promedio ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-black ${colorDeAcierto(
                              fila.porcentajeAcierto,
                            )}`}
                          >
                            {fila.porcentajeAcierto === null ? "—" : `${fila.porcentajeAcierto}%`}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <Link
                            href={`/panel/cuestionarios/analitica?clave=${fila.clave}`}
                            className="text-xs font-bold text-inst-700 hover:underline"
                          >
                            Ver reactivos →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <ReactivosDificiles
            titulo="Reactivos más fallados del alcance"
            reactivos={data.masDificiles}
            mostrarCuestionario
          />
        </>
      )}
    </div>
  );
}

function ReactivosDificiles({
  titulo,
  reactivos,
  mostrarCuestionario = false,
}: {
  titulo: string;
  reactivos: Array<ReactivoAnalitica & { clave?: string; titulo?: string }>;
  mostrarCuestionario?: boolean;
}) {
  if (reactivos.length === 0) return null;
  return (
    <section className="tarjeta p-6">
      <h2 className="text-lg font-black text-slate-900">{titulo}</h2>
      <p className="mt-1 text-sm text-slate-500">
        Reactivos con menos de 60% de acierto y al menos dos intentos: candidatos a repasar en clase.
      </p>
      <ol className="mt-3 space-y-2">
        {reactivos.map((reactivo) => (
          <li
            key={`${reactivo.clave ?? ""}-${reactivo.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
          >
            <span className="min-w-0 flex-1 text-xs text-slate-700">
              {mostrarCuestionario && reactivo.clave ? (
                <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500">
                  {reactivo.clave}
                </span>
              ) : null}
              {reactivo.enunciado}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-[11px]">
              <span className="font-bold text-slate-500">
                {reactivo.aciertos}/{reactivo.intentos}
              </span>
              <span className={`rounded-full px-2 py-0.5 font-black ${colorDeAcierto(reactivo.porcentaje)}`}>
                {reactivo.porcentaje}%
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
