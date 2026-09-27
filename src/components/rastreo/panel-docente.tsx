"use client";

import { useState } from "react";
import { BotonEnviar } from "@/components/form-estado";
import { Icono } from "@/components/iconos";
import { crearEmbarqueAction, crearEmbarquesDelModuloAction } from "@/lib/actions/rastreo";

export type EscenarioResumen = {
  clave: string;
  modulo: number;
  titulo: string;
  descripcion: string;
  origen: string;
  destino: string;
  carga: string;
  unidad: string;
  distanciaKm: number;
  velocidadKmh: number;
  modoSugerido: "simulado" | "gps";
  paradas: number;
};

export type AulaResumen = { id: number; nombre: string; detalle: string };

/**
 * Panel del docente: catálogo de escenarios y carga masiva por módulo.
 *
 * El aula a la que se vinculan los embarques se elige una sola vez arriba y se
 * aplica a todos los botones de abajo.
 */
export function PanelRastreoDocente({
  escenarios,
  aulas,
  creadosPorClave,
}: {
  escenarios: EscenarioResumen[];
  aulas: AulaResumen[];
  creadosPorClave: Record<string, number>;
}) {
  const [aulaId, setAulaId] = useState<string>("");
  const modulos = Array.from(new Set(escenarios.map((e) => e.modulo))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <section className="tarjeta p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Icono nombre="gps" tamano={20} className="text-inst-700" />
              Cargar embarques al aula
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Elige el aula una vez y crea embarques uno por uno o todo un módulo completo: el folio,
              la ruta y los eventos se generan solos.
            </p>
          </div>
          <label className="text-xs font-bold text-slate-600">
            Vincular al aula
            <select
              value={aulaId}
              onChange={(e) => setAulaId(e.target.value)}
              className="campo mt-1 w-64"
            >
              <option value="">Sin aula (escenario de demostración)</option>
              {aulas.map((aula) => (
                <option key={aula.id} value={String(aula.id)}>
                  {aula.nombre} · {aula.detalle}
                </option>
              ))}
            </select>
          </label>
        </div>

        {aulas.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
            Todavía no abres un aula. Puedes crear embarques de demostración sin aula; cuando abras
            una, créalos otra vez vinculados para que el grupo reciba el aviso.
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((modulo) => {
            const delModulo = escenarios.filter((e) => e.modulo === modulo);
            const yaCreados = delModulo.filter((e) => creadosPorClave[e.clave]).length;
            return (
              <div key={modulo} className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-inst-700">
                  Módulo {modulo}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {delModulo.length} embarques del módulo
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {yaCreados > 0 ? `${yaCreados} ya creados · no se duplican` : "Ninguno creado todavía"}
                </p>
                <form action={crearEmbarquesDelModuloAction} className="mt-3">
                  <input type="hidden" name="modulo" value={modulo} />
                  <input type="hidden" name="courseId" value={aulaId} />
                  <BotonEnviar className="btn-primario w-full px-3 py-2 text-xs" pendienteTexto="Creando…">
                    Crear todo el Módulo {modulo}
                  </BotonEnviar>
                </form>
              </div>
            );
          })}
        </div>
      </section>

      {modulos.map((modulo) => (
        <section key={modulo} className="tarjeta p-6">
          <h2 className="text-lg font-black text-slate-900">
            Escenarios del Módulo {modulo}
          </h2>
          <div className="mt-4 space-y-3">
            {escenarios
              .filter((e) => e.modulo === modulo)
              .map((escenario) => {
                const shipmentId = creadosPorClave[escenario.clave];
                return (
                  <div key={escenario.clave} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-inst-50 px-2 py-0.5 text-[10px] font-black text-inst-700">
                            {escenario.clave}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {escenario.distanciaKm} km · {escenario.paradas} paradas
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              escenario.modoSugerido === "gps"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-sky-100 text-sky-800"
                            }`}
                          >
                            {escenario.modoSugerido === "gps" ? "Conviene GPS real" : "Conviene simulado"}
                          </span>
                          {shipmentId ? (
                            <a
                              href={`/panel/embarques/${shipmentId}`}
                              className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800"
                            >
                              Ya creado · abrir
                            </a>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900">{escenario.titulo}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {escenario.descripcion}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-400">
                          {escenario.origen} → {escenario.destino} · {escenario.carga} · {escenario.unidad}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <form action={crearEmbarqueAction}>
                          <input type="hidden" name="escenario" value={escenario.clave} />
                          <input type="hidden" name="courseId" value={aulaId} />
                          <BotonEnviar
                            className="btn-secundario px-3 py-1.5 text-[11px]"
                            pendienteTexto="Creando…"
                          >
                            {shipmentId ? "Crear otro igual" : "Crear embarque"}
                          </BotonEnviar>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
