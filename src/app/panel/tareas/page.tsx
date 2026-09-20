import Link from "next/link";
import type { Metadata } from "next";
import { tareasDelDocente, tareasDelEstudiante } from "@/lib/consultas";
import { formatoFechaHora, requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Evidencias y Calificaciones por Parcial" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ parcial?: string }>;
};

export default async function TareasPage({ searchParams }: Props) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};
  const parcialFiltro = params.parcial ? Number(params.parcial) : null;

  if (user.rol === "estudiante") {
    const todas = await tareasDelEstudiante(user.id);
    const tareas = parcialFiltro ? todas.filter((t) => t.tarea.parcial === parcialFiltro) : todas;

    const pendientes = tareas.filter((t) => !t.entrega);
    const entregadas = tareas.filter((t) => t.entrega && t.entrega.calificacion == null);
    const calificadas = tareas.filter((t) => t.entrega?.calificacion != null);

    // Promedios por parcial
    const promedioDe = (parc: number) => {
      const deParcial = todas.filter((t) => t.tarea.parcial === parc && t.entrega?.calificacion != null);
      if (deParcial.length === 0) return "—";
      const sum = deParcial.reduce((acc, t) => acc + (t.entrega?.calificacion ?? 0), 0);
      return Math.round(sum / deParcial.length);
    };

    const promP1 = promedioDe(1);
    const promP2 = promedioDe(2);
    const promP3 = promedioDe(3);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-inst-700 bg-inst-50 px-3 py-1 rounded-full">
              Evaluación DGETI
            </span>
            <h1 className="mt-2 text-2xl font-black text-slate-900">Evidencias y Calificaciones</h1>
            <p className="text-sm text-slate-500">
              Evaluación formativa y concentrado de actividades por parcial (1°, 2° y 3° Parcial).
            </p>
          </div>
        </div>

        {/* Tarjetas de Promedio por Parcial */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["1er Parcial", promP1, "1"],
            ["2do Parcial", promP2, "2"],
            ["3er Parcial", promP3, "3"],
          ].map(([nombre, prom, num]) => {
            const activo = parcialFiltro === Number(num);
            return (
              <Link
                key={num}
                href={activo ? "/panel/tareas" : `/panel/tareas?parcial=${num}`}
                className={`tarjeta p-5 transition hover:shadow-md ${
                  activo ? "ring-2 ring-inst-600 bg-inst-50/50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">{nombre}</span>
                  {activo ? (
                    <span className="text-[10px] bg-inst-700 text-white font-bold px-2 py-0.5 rounded-full">
                      Filtrado
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-3xl font-black text-inst-700">
                  {prom}
                  {prom !== "—" ? <span className="text-sm font-normal text-slate-400">/100 pts</span> : ""}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {todas.filter((t) => t.tarea.parcial === Number(num)).length} actividades asignadas
                </p>
              </Link>
            );
          })}
        </div>

        {/* Pestañas de filtro */}
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          <Link
            href="/panel/tareas"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              !parcialFiltro ? "bg-inst-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todos los Parciales ({todas.length})
          </Link>
          {[1, 2, 3].map((num) => (
            <Link
              key={num}
              href={`/panel/tareas?parcial=${num}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                parcialFiltro === num ? "bg-inst-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {num}° Parcial ({todas.filter((t) => t.tarea.parcial === num).length})
            </Link>
          ))}
        </div>

        {/* Secciones por Estado */}
        {[
          { titulo: "Pendientes de Entrega", items: pendientes, color: "text-rose-600" },
          { titulo: "Entregadas (En Revisión del Docente)", items: entregadas, color: "text-sky-700" },
          { titulo: "Calificadas con Retroalimentación", items: calificadas, color: "text-emerald-700" },
        ].map((grupo) => (
          <section key={grupo.titulo} className="space-y-3">
            <h2 className={`text-sm font-bold uppercase tracking-wider ${grupo.color}`}>
              {grupo.titulo} ({grupo.items.length})
            </h2>

            {grupo.items.length === 0 ? (
              <p className="tarjeta p-6 text-center text-xs text-slate-400">
                Sin actividades en esta categoría para el periodo seleccionado.
              </p>
            ) : (
              <div className="tarjeta divide-y divide-slate-100">
                {grupo.items.map(({ tarea, curso, entrega }) => (
                  <Link
                    key={tarea.id}
                    href={`/panel/tareas/${tarea.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-1.5 rounded-full" style={{ backgroundColor: curso.color }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{tarea.titulo}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {tarea.parcial}° Parcial
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {curso.nombre} · Límite: {formatoFechaHora(tarea.fechaEntrega)}
                        </p>
                      </div>
                    </div>

                    <div>
                      {entrega?.calificacion != null ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          {entrega.calificacion}/{tarea.puntos} pts
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600">{tarea.puntos} pts max.</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    );
  }

  // VISTA PARA DOCENTES
  const todas = await tareasDelDocente(user.id, user.rol === "docente");
  const tareas = parcialFiltro ? todas.filter((t) => t.tarea.parcial === parcialFiltro) : todas;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-inst-700 bg-inst-50 px-3 py-1 rounded-full">
            Centro de Evaluación
          </span>
          <h1 className="mt-2 text-2xl font-black text-slate-900">
            {user.rol === "docente" ? "Evidencias y Calificaciones de mis Aulas" : "Evidencias del Plantel"}
          </h1>
          <p className="text-sm text-slate-500">
            Revisión de entregas de estudiantes y asignación de calificaciones con retroalimentación.
          </p>
        </div>
      </div>

      {/* Pestañas de parciales */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <Link
          href="/panel/tareas"
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            !parcialFiltro ? "bg-inst-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Todos los Parciales ({todas.length})
        </Link>
        {[1, 2, 3].map((num) => (
          <Link
            key={num}
            href={`/panel/tareas?parcial=${num}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              parcialFiltro === num ? "bg-inst-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {num}° Parcial ({todas.filter((t) => t.tarea.parcial === num).length})
          </Link>
        ))}
      </div>

      {tareas.length === 0 ? (
        <p className="tarjeta p-10 text-center text-sm text-slate-500">
          No hay actividades publicadas para este periodo. Puedes crearlas desde el detalle de cada aula.
        </p>
      ) : (
        <div className="tarjeta divide-y divide-slate-100">
          {tareas.map(({ tarea, curso, entregas, porCalificar }) => (
            <Link
              key={tarea.id}
              href={`/panel/tareas/${tarea.id}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <span className="h-10 w-1.5 rounded-full" style={{ backgroundColor: curso.color }} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{tarea.titulo}</p>
                    <span className="rounded-full bg-inst-50 px-2 py-0.5 text-[10px] font-bold text-inst-700">
                      {tarea.parcial}° Parcial
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {curso.nombre} · {curso.semestre}° {curso.grupo} · Entrega {formatoFechaHora(tarea.fechaEntrega)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {entregas} entregas
                </span>
                {porCalificar > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                    {porCalificar} por calificar
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                    Al corriente
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
