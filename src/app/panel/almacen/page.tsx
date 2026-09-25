import Link from "next/link";
import { Icono } from "@/components/iconos";
import type { Metadata } from "next";
import { FormEstado } from "@/components/form-estado";
import {
  actualizarEstadoPracticaAction,
  programarPracticaAlmacenAction,
} from "@/lib/actions/almacen";
import { clasesDelDocente, practicasAlmacen } from "@/lib/consultas";
import { formatoFechaHora, requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Almacén Escuela (Edificio C) · Logística" };
export const dynamic = "force-dynamic";

export default async function AlmacenPage() {
  const user = await requireUser();
  const practicas = await practicasAlmacen(user.rol === "docente" ? user.id : undefined);
  const misClases = user.rol === "docente" || user.rol === "admin" ? await clasesDelDocente(user.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-inst-700 bg-inst-50 px-3 py-1 rounded-full">
            Instalaciones Prácticas
          </span>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Almacén Escuela (Edificio C)</h1>
          <p className="text-sm text-slate-500">
            Centro de simulación industrial para prácticas de estiba, picking, conteo cíclico y operación de montacargas.
          </p>
        </div>
      </div>

      {/* Tarjeta de Seguridad Obligatoria */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-5 text-slate-900 shadow-sm">
        <div className="flex items-start gap-3">
          <Icono nombre="alerta" tamano={26} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <h2 className="text-sm font-bold text-amber-900">Equipo de Protección Personal (EPP) Obligatorio</h2>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Conforme a la norma <strong>NOM-006-STPS-2014</strong>, queda estrictamente prohibido ingresar al Almacén Escuela sin:
            </p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-4 text-xs font-semibold text-amber-900">
              <li className="flex items-center gap-2"><Icono nombre="chaleco" tamano={17} className="shrink-0" /> Chaleco reflejante reglamentario</li>
              <li className="flex items-center gap-2"><Icono nombre="calzado" tamano={17} className="shrink-0" /> Calzado con casquillo de acero</li>
              <li className="flex items-center gap-2"><Icono nombre="casco" tamano={17} className="shrink-0" /> Casco de seguridad en racks altos</li>
              <li className="flex items-center gap-2"><Icono nombre="guantes" tamano={17} className="shrink-0" /> Guantes para manejo de tarimas</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Lista de Prácticas Programadas */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Agenda de Prácticas en el Almacén ({practicas.length})
          </h2>

          {practicas.length === 0 ? (
            <p className="tarjeta p-8 text-center text-sm text-slate-500">
              No hay prácticas programadas actualmente en el Almacén Escuela.
            </p>
          ) : (
            <div className="space-y-4">
              {practicas.map(({ practica, curso, docente }) => {
                const estadoBadge =
                  practica.estado === "concluida"
                    ? "bg-slate-100 text-slate-700"
                    : practica.estado === "en_curso"
                      ? "bg-amber-100 text-amber-800 animate-pulse"
                      : "bg-emerald-100 text-emerald-800";

                return (
                  <article key={practica.id} className="tarjeta p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs font-bold uppercase text-slate-400">
                          {curso.nombre} · Prof. {docente}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">{practica.titulo}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${estadoBadge}`}>
                        {practica.estado.replace("_", " ")}
                      </span>
                    </div>

                    <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      <p>
                        <strong>Fecha y hora:</strong> {formatoFechaHora(practica.fechaPractica)}
                      </p>
                      <p>
                        <strong>Duración:</strong> {practica.duracionMinutos} minutos
                      </p>
                      <p>
                        <strong>Área asignada:</strong> {practica.areaAlmacen}
                      </p>
                      <p>
                        <strong>Cupo máximo:</strong> {practica.cupoMaximo} alumnos
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 space-y-1.5">
                      <p>
                        <strong className="text-slate-900">Objetivo:</strong> {practica.objetivo}
                      </p>
                      <p>
                        <strong className="text-slate-900">Equipos a utilizar:</strong> {practica.equiposUtilizados}
                      </p>
                      <p>
                        <strong className="text-slate-900">EPP requerido:</strong> {practica.equipoSeguridadObligatorio}
                      </p>
                    </div>

                    {user.rol === "docente" || user.rol === "admin" ? (
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <span className="text-xs text-slate-400">Actualizar estado:</span>
                        <div className="flex gap-2">
                          <form action={actualizarEstadoPracticaAction}>
                            <input type="hidden" name="practicaId" value={practica.id} />
                            <input type="hidden" name="estado" value="en_curso" />
                            <button
                              type="submit"
                              className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-white hover:bg-amber-600"
                            >
                              Iniciar Práctica
                            </button>
                          </form>
                          <form action={actualizarEstadoPracticaAction}>
                            <input type="hidden" name="practicaId" value={practica.id} />
                            <input type="hidden" name="estado" value="concluida" />
                            <button
                              type="submit"
                              className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                            >
                              Concluir
                            </button>
                          </form>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Programador de Práctica (solo docentes) */}
        <section className="space-y-6">
          {user.rol === "docente" || user.rol === "admin" ? (
            <div className="tarjeta p-6">
              <h2 className="text-lg font-bold text-slate-900">Programar Práctica en Almacén</h2>
              <p className="mt-1 text-xs text-slate-500">
                Agenda el uso de racks, montacargas o transpaletas para tu grupo.
              </p>

              <div className="mt-4">
                <FormEstado
                  action={programarPracticaAlmacenAction}
                  submitLabel="Agendar Práctica Oficial"
                  pendienteTexto="Reservando instalaciones..."
                  botonClase="btn-primario w-full"
                >
                  <select name="courseId" required className="campo" defaultValue="">
                    <option value="" disabled>Selecciona la asignatura</option>
                    {misClases.map(({ curso }) => (
                      <option key={curso.id} value={curso.id}>
                        {curso.nombre} ({curso.semestre}° {curso.grupo})
                      </option>
                    ))}
                  </select>

                  <input name="titulo" required className="campo" placeholder="Título de la práctica (ej. Picking por lote)" />
                  <textarea name="objetivo" rows={2} required className="campo" placeholder="Objetivo pedagógico de la práctica" />
                  
                  <select name="areaAlmacen" className="campo" defaultValue="Zona de Racks y Estantería A">
                    <option value="Zona de Racks y Estantería A">Zona de Racks y Estantería A</option>
                    <option value="Muelle de Embarque y Descarga">Muelle de Embarque y Descarga</option>
                    <option value="Patio de Maniobras y Tráfico">Patio de Maniobras y Tráfico</option>
                    <option value="Área de Emplayado y Paletizado">Área de Emplayado y Paletizado</option>
                  </select>

                  <input type="datetime-local" name="fechaPractica" required className="campo" />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" name="duracionMinutos" defaultValue={100} min={30} step={10} className="campo" placeholder="Minutos" />
                    <input type="number" name="cupoMaximo" defaultValue={30} min={10} max={45} className="campo" placeholder="Cupo máx." />
                  </div>

                  <input
                    name="equiposUtilizados"
                    className="campo"
                    placeholder="Equipos (montacargas, transpaleta, lectores)"
                  />
                  <input
                    name="equipoSeguridadObligatorio"
                    className="campo"
                    placeholder="Seguridad (chaleco, botas con casquillo, casco)"
                  />
                </FormEstado>
              </div>
            </div>
          ) : (
            <div className="tarjeta p-6 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Normas de Convivencia en Almacén</h3>
              <ul className="text-xs space-y-2 text-slate-600">
                <li>• No correr ni jugar en pasillos con montacargas en movimiento.</li>
                <li>• Respetar la delimitación de líneas amarillas de paso peatonal.</li>
                <li>• Devolver lectores láser y transpaletas limpias a su estación.</li>
                <li>• Reportar cualquier estiba inestable al docente responsable.</li>
              </ul>
            </div>
          )}

          {/* Ficha técnica del almacén */}
          <div className="tarjeta p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ficha del Almacén Escuela</h3>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p><strong>Ubicación:</strong> Edificio C · Planta Baja</p>
              <p><strong>Capacidad de almacenamiento:</strong> 40 posiciones de tarima estándar</p>
              <p><strong>Equipamiento activo:</strong> 1 Montacargas contrabalanceado eléctrico, 2 Transpaletas hidráulicas de 2.5 t, 8 Lectores de código de barras 2D</p>
              <p><strong>Software:</strong> Plataforma Institucional CBTIS 270</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
