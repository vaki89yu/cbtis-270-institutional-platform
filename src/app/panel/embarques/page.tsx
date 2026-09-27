import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Icono } from "@/components/iconos";
import { PanelRastreoDocente } from "@/components/rastreo/panel-docente";
import { BotonEnviar } from "@/components/form-estado";
import { eliminarEmbarqueAction } from "@/lib/actions/rastreo";
import { embarquesDelAlumno, embarquesDelDocente } from "@/lib/academico/rastreo";
import {
  COLOR_ESTADO_EMBARQUE,
  ESCENARIOS_EMBARQUE,
  ETIQUETA_ESTADO_EMBARQUE,
} from "@/lib/academico/embarques";
import { clasesDelDocente } from "@/lib/consultas";
import { NOMBRE_MODULO } from "@/lib/formatos/catalogo";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Rastreo GPS de embarques" };
export const dynamic = "force-dynamic";

export default async function RastreoPage() {
  const user = await requireUser();
  const galletas = await cookies();
  const aviso = galletas.get("cbtis270_embarque_aviso")?.value ?? null;

  const esDocente = user.rol !== "estudiante";

  const embarques = esDocente
    ? await embarquesDelDocente(user.id, user.rol)
    : await embarquesDelAlumno(user.id);

  const encabezado = (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
        <Icono nombre="gps" tamano={24} className="text-inst-700" />
        Rastreo GPS de embarques
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {esDocente
          ? "Escenarios logísticos reales de los cinco módulos: se crean con folio, ruta y bitácora, y el grupo los sigue en vivo en el mapa."
          : "Los embarques que tu docente abrió para tu módulo. Ábrelos para ver el mapa en vivo, la línea de tiempo y los checkpoints."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-inst-50 px-3 py-1 text-inst-800">
          {ESCENARIOS_EMBARQUE.length} escenarios precargados
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
          {embarques.length} embarques {esDocente ? "creados por ti" : "para tu grupo"}
        </span>
      </div>
    </div>
  );

  const avisoBarra = aviso ? (
    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
      {aviso}
    </p>
  ) : null;

  /* -------------------------------- ALUMNO -------------------------------- */
  if (!esDocente) {
    return (
      <div className="space-y-6">
        {encabezado}
        {avisoBarra}

        {embarques.length === 0 ? (
          <div className="tarjeta p-10 text-center">
            <Icono nombre="gps" tamano={34} className="mx-auto text-slate-400" />
            <h2 className="mt-3 text-base font-bold text-slate-900">Todavía no hay embarques</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              En cuanto tu docente cree embarques para el módulo que cursas aparecerán aquí, con el
              mapa en vivo y la línea de tiempo del recorrido.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {embarques.map((emb) => (
              <Link key={emb.id} href={`/panel/embarques/${emb.id}`} className="tarjeta p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-inst-50 px-2 py-0.5 text-[10px] font-black text-inst-700">
                    {emb.folio}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      COLOR_ESTADO_EMBARQUE[emb.estado] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {ETIQUETA_ESTADO_EMBARQUE[emb.estado] ?? emb.estado}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {emb.modo === "gps" ? "GPS real" : "Simulado"}
                  </span>
                  {emb.operadorId === user.id ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Tú eres el operador
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900">{emb.titulo}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {emb.origenNombre} → {emb.destinoNombre}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  Módulo {emb.modulo} · {emb.distanciaKm} km · avance {Math.round(emb.progreso * 100)}%
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-inst-700">
                  Abrir el mapa en vivo →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------- DOCENTE ------------------------------- */
  const aulas = (await clasesDelDocente(user.id)).map(({ curso, inscritos }) => ({
    id: curso.id,
    nombre: curso.aula ? `${curso.aula} · ${curso.nombre}` : curso.nombre,
    detalle: `${curso.semestre}° ${curso.grupo}${curso.modulo ? ` · Módulo ${curso.modulo}` : ""} · ${inscritos} alumnos`,
  }));

  const creadosPorClave: Record<string, number> = {};
  for (const emb of embarques) {
    if (emb.origen && !creadosPorClave[emb.origen]) creadosPorClave[emb.origen] = emb.id;
  }

  const escenarios = ESCENARIOS_EMBARQUE.map((e) => ({
    clave: e.clave,
    modulo: e.modulo,
    titulo: e.titulo,
    descripcion: e.descripcion,
    origen: e.origen,
    destino: e.destino,
    carga: e.carga,
    unidad: e.unidad,
    distanciaKm: e.distanciaKm,
    velocidadKmh: e.velocidadKmh,
    modoSugerido: e.modoSugerido,
    paradas: e.ruta.filter((p) => p.tipo !== "paso").length,
  }));

  return (
    <div className="space-y-6">
      {encabezado}
      {avisoBarra}

      <PanelRastreoDocente escenarios={escenarios} aulas={aulas} creadosPorClave={creadosPorClave} />

      {/* ------------------------- EMBARQUES CREADOS ------------------------- */}
      <section className="tarjeta p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Icono nombre="ruta" tamano={20} className="text-inst-700" />
          Embarques creados
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Ábrelos para proyectar el mapa en clase, asignar operador y registrar incidencias.
        </p>

        <div className="mt-4 space-y-3">
          {embarques.map((emb) => (
            <div key={emb.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-inst-50 px-2 py-0.5 text-[10px] font-black text-inst-700">
                      {emb.folio}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        COLOR_ESTADO_EMBARQUE[emb.estado] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {ETIQUETA_ESTADO_EMBARQUE[emb.estado] ?? emb.estado}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {emb.modo === "gps" ? "GPS real" : "Simulado"}
                    </span>
                    {emb.operadorNombre ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Operador: {emb.operadorNombre}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900">{emb.titulo}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {emb.origenNombre} → {emb.destinoNombre} · {emb.distanciaKm} km
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                    {NOMBRE_MODULO[emb.modulo] ?? `Módulo ${emb.modulo}`} · avance{" "}
                    {Math.round(emb.progreso * 100)}%
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/panel/embarques/${emb.id}`} className="btn-primario px-3 py-1.5 text-[11px]">
                    Abrir rastreo
                  </Link>
                  <form action={eliminarEmbarqueAction}>
                    <input type="hidden" name="shipmentId" value={emb.id} />
                    <BotonEnviar
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-500"
                      pendienteTexto="…"
                    >
                      Borrar
                    </BotonEnviar>
                  </form>
                </div>
              </div>
            </div>
          ))}
          {embarques.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Todavía no creas embarques. Usa los botones de arriba: un escenario suelto o un módulo
              completo de un solo clic.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
