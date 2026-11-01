import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { FormEstado, BotonEnviar } from "@/components/form-estado";
import { Icono } from "@/components/iconos";
import { CUESTIONARIOS, cuestionarioPorClave } from "@/lib/academico/cuestionarios";
import { reactivosParaAdministrar } from "@/lib/academico/banco-reactivos";
import { NOMBRE_MODULO } from "@/lib/formatos/catalogo";
import {
  actualizarReactivoAction,
  archivarReactivoAction,
  crearReactivoAction,
  reactivarReactivoAction,
} from "@/lib/actions/banco";
import { requireRole } from "@/lib/guards";

export const metadata: Metadata = { title: "Banco de reactivos" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ clave?: string }>;
};

const LETRA = ["A", "B", "C", "D"];

export default async function BancoReactivosPage({ searchParams }: Props) {
  const user = await requireRole("docente", "admin");
  const params = await searchParams;

  const clave = String(params.clave ?? "Q-M1-P1");
  const cuestionario = cuestionarioPorClave(clave);
  if (!cuestionario) redirect("/panel/cuestionarios/banco?clave=Q-M1-P1");

  const reactivos = await reactivosParaAdministrar(clave);
  const activos = reactivos.filter((r) => r.activa);
  const archivados = reactivos.filter((r) => !r.activa);
  const propios = activos.filter((r) => user.rol === "admin" || r.autorId === user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/panel/cuestionarios" className="text-sm text-slate-500 hover:text-inst-700">
            ← Cuestionarios
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-slate-900">
            <Icono nombre="cuestionario" tamano={24} className="text-inst-700" />
            Banco de reactivos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Agrega tus propios reactivos a cualquiera de los 15 cuestionarios. Se suman al
            catálogo oficial sólo para tu grupo y se califican en el servidor: las respuestas
            correctas nunca viajan al navegador del alumno.
          </p>
        </div>
        <Link
          href={`/panel/cuestionarios/analitica?clave=${clave}`}
          className="btn-secundario px-3.5 py-2 text-xs"
        >
          Ver analítica de este cuestionario
        </Link>
      </div>

      {/* Selector de cuestionario */}
      <form className="tarjeta flex flex-wrap items-end gap-3 p-4" action="/panel/cuestionarios/banco">
        <label htmlFor="clave" className="min-w-0 flex-1">
          <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
            Cuestionario
          </span>
          <select id="clave" name="clave" defaultValue={clave} className="campo">
            {CUESTIONARIOS.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.clave} · {c.titulo}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-primario px-4 py-2.5 text-sm">
          Abrir
        </button>
      </form>

      {/* Contexto del cuestionario elegido */}
      <section className="tarjeta p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-lg bg-inst-50 px-2.5 py-1 text-inst-800">{cuestionario.clave}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
            {cuestionario.parcial}° parcial
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
            {NOMBRE_MODULO[cuestionario.modulo] ?? `Módulo ${cuestionario.modulo}`}
          </span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
            {cuestionario.preguntas.length} del catálogo
          </span>
          <span className="rounded-full bg-inst-100 px-2.5 py-1 text-inst-800">
            {activos.length} propios
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
            {cuestionario.preguntas.length + activos.length} en total · {cuestionario.minutos} min
          </span>
        </div>
        <h2 className="mt-3 text-lg font-black text-slate-900">{cuestionario.titulo}</h2>
        <p className="mt-1 text-sm text-slate-500">{cuestionario.descripcion}</p>
      </section>

      {/* Alta de reactivo */}
      <section className="tarjeta p-6">
        <h2 className="text-lg font-black text-slate-900">Agregar un reactivo</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cuatro opciones, una correcta y una explicación corta que el alumno verá al enviar.
        </p>

        <FormEstado
          action={crearReactivoAction}
          submitLabel="Agregar al cuestionario"
          pendienteTexto="Guardando…"
          botonClase="btn-primario"
          className="mt-4 space-y-4"
        >
          <input type="hidden" name="clave" value={clave} />
          <div>
            <label htmlFor="enunciado" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Enunciado
            </label>
            <textarea
              id="enunciado"
              name="enunciado"
              required
              rows={3}
              className="campo"
              placeholder="¿Qué documento ampara la mercancía en un cruce internacional?"
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-sm font-semibold text-slate-700">
              Opciones · marca la correcta
            </legend>
            <div className="grid gap-2">
              {LETRA.map((letra, indice) => (
                <label key={letra} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correcta"
                    value={indice}
                    defaultChecked={indice === 0}
                    className="h-4 w-4 shrink-0"
                    aria-label={`La opción ${letra} es la correcta`}
                  />
                  <span className="w-4 text-xs font-black text-slate-400">{letra}</span>
                  <input
                    name={`opcion${indice + 1}`}
                    required={indice < 2}
                    className="campo"
                    placeholder={indice < 2 ? "Obligatoria" : "Opcional"}
                  />
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Mínimo dos opciones; puedes dejar vacías C y D si el reactivo es de dos opciones.
            </p>
          </fieldset>

          <div>
            <label htmlFor="explicacion" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Explicación para el alumno (opcional)
            </label>
            <textarea
              id="explicacion"
              name="explicacion"
              rows={2}
              className="campo"
              placeholder="Se muestra después de enviar el cuestionario."
            />
          </div>
        </FormEstado>
      </section>

      {/* Reactivos propios activos */}
      <section className="tarjeta p-6">
        <h2 className="text-lg font-black text-slate-900">
          Reactivos propios activos
          <span className="ml-2 text-sm font-bold text-slate-400">{activos.length}</span>
        </h2>
        {activos.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Todavía no has agregado reactivos a este cuestionario.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {activos.map((reactivo) => {
              const puedeEditar = user.rol === "admin" || reactivo.autorId === user.id;
              return (
                <li key={reactivo.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-inst-50 px-2 py-0.5 text-[10px] font-black text-inst-700">
                          X-{reactivo.id}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {reactivo.autorNombre ?? "Sin autor"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-slate-900">{reactivo.enunciado}</p>
                      <ol className="mt-2 space-y-0.5 text-xs">
                        {reactivo.opciones.map((opcion, indice) => (
                          <li
                            key={indice}
                            className={
                              indice === reactivo.correcta
                                ? "font-bold text-emerald-800"
                                : "text-slate-600"
                            }
                          >
                            {letraDe(indice)}. {opcion}
                            {indice === reactivo.correcta ? " ✓" : ""}
                          </li>
                        ))}
                      </ol>
                      {reactivo.explicacion ? (
                        <p className="mt-2 text-xs italic text-slate-500">{reactivo.explicacion}</p>
                      ) : null}
                    </div>

                    {puedeEditar ? (
                      <form action={archivarReactivoAction} className="shrink-0">
                        <input type="hidden" name="id" value={reactivo.id} />
                        <input type="hidden" name="clave" value={clave} />
                        <BotonEnviar
                          className="rounded-lg bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700"
                          pendienteTexto="Archivando…"
                        >
                          Archivar
                        </BotonEnviar>
                      </form>
                    ) : (
                      <span className="shrink-0 text-[11px] text-slate-400">Sólo lectura</span>
                    )}
                  </div>

                  {puedeEditar ? (
                    <details className="mt-3 rounded-xl bg-slate-50 p-3">
                      <summary className="cursor-pointer text-xs font-bold text-inst-700">
                        Editar este reactivo
                      </summary>
                      <FormEstado
                        action={actualizarReactivoAction}
                        submitLabel="Guardar cambios"
                        pendienteTexto="Guardando…"
                        botonClase="btn-primario px-3 py-2 text-xs"
                        className="mt-3 space-y-3"
                      >
                        <input type="hidden" name="id" value={reactivo.id} />
                        <input type="hidden" name="clave" value={clave} />
                        <textarea
                          name="enunciado"
                          required
                          rows={2}
                          defaultValue={reactivo.enunciado}
                          className="campo"
                          aria-label="Enunciado"
                        />
                        {[0, 1, 2, 3].map((indice) => (
                          <label key={indice} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correcta"
                              value={indice}
                              defaultChecked={reactivo.correcta === indice}
                              className="h-4 w-4 shrink-0"
                              aria-label={`La opción ${letraDe(indice)} es la correcta`}
                            />
                            <span className="w-4 text-xs font-black text-slate-400">
                              {letraDe(indice)}
                            </span>
                            <input
                              name={`opcion${indice + 1}`}
                              defaultValue={reactivo.opciones[indice] ?? ""}
                              required={indice < 2}
                              className="campo"
                            />
                          </label>
                        ))}
                        <textarea
                          name="explicacion"
                          rows={2}
                          defaultValue={reactivo.explicacion}
                          className="campo"
                          placeholder="Explicación"
                          aria-label="Explicación"
                        />
                      </FormEstado>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Archivados */}
      {archivados.length > 0 ? (
        <section className="tarjeta p-6">
          <h2 className="text-lg font-black text-slate-900">
            Archivados
            <span className="ml-2 text-sm font-bold text-slate-400">{archivados.length}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            No aparecen en el examen. Los intentos viejos se conservan para la analítica.
          </p>
          <ul className="mt-4 space-y-2">
            {archivados.map((reactivo) => {
              const puedeEditar = user.rol === "admin" || reactivo.autorId === user.id;
              return (
                <li
                  key={reactivo.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                >
                  <span className="min-w-0 text-xs text-slate-600">
                    <span className="font-black text-slate-400">X-{reactivo.id}</span>{" "}
                    {reactivo.enunciado}
                  </span>
                  {puedeEditar ? (
                    <form action={reactivarReactivoAction} className="shrink-0">
                      <input type="hidden" name="id" value={reactivo.id} />
                      <input type="hidden" name="clave" value={clave} />
                      <BotonEnviar
                        className="rounded-lg bg-emerald-100 px-3 py-1.5 text-[11px] font-bold text-emerald-800"
                        pendienteTexto="Reactivando…"
                      >
                        Reactivar
                      </BotonEnviar>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-slate-400">
        {propios.length} reactivo(s) bajo tu autoría en este cuestionario. El catálogo oficial no se
        modifica: tus reactivos se suman sólo en la versión que resuelven los alumnos.
      </p>
    </div>
  );
}

function letraDe(indice: number) {
  return LETRA[indice] ?? String(indice + 1);
}
