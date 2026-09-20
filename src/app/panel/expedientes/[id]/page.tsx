import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { expedienteCompletoEstudiante } from "@/lib/consultas";
import { formatoFecha, formatoFechaHora, requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Ficha del Expediente Estudiantil" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ExpedienteDetallePage({ params }: Props) {
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isFinite(studentId)) notFound();

  const user = await requireUser();

  // Si es estudiante y quiere ver el de otro, redirige al suyo
  if (user.rol === "estudiante" && user.id !== studentId) {
    redirect(`/panel/expedientes/${user.id}`);
  }

  const data = await expedienteCompletoEstudiante(studentId);
  if (!data) notFound();

  const { alumno, perfil, tutor, cursos, asistencias, tareas } = data;
  const calificadas = tareas.filter((t) => t.entrega?.calificacion != null);
  const promedio =
    calificadas.length > 0
      ? Math.round(
          calificadas.reduce((acc, t) => acc + (t.entrega?.calificacion ?? 0), 0) / calificadas.length,
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {user.rol !== "estudiante" ? (
          <Link href="/panel/expedientes" className="text-sm font-semibold text-inst-700 hover:underline">
            ← Volver al directorio de alumnos
          </Link>
        ) : (
          <span className="text-xs font-bold uppercase tracking-wider text-inst-700 bg-inst-50 px-3 py-1 rounded-full">
            Ficha Oficial del Alumno
          </span>
        )}
      </div>

      {/* Encabezado del Expediente */}
      <header className="tarjeta p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-inst-700 text-2xl font-black text-white shadow-md">
              {alumno.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Técnico en Logística · DGETI
              </p>
              <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{alumno.nombre}</h1>
              <p className="text-sm text-slate-500">{alumno.email}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              Alumno Regular Activo
            </span>
            <span className="text-xs text-slate-400">Alta: {formatoFecha(alumno.createdAt)}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-4 text-xs text-slate-600">
          <div>
            <span className="block font-bold text-slate-400 uppercase">Matrícula Escolar</span>
            <span className="mt-1 block font-mono text-sm font-bold text-slate-900">
              {alumno.matricula ?? perfil?.numeroControl ?? "Pendiente"}
            </span>
          </div>
          <div>
            <span className="block font-bold text-slate-400 uppercase">Semestre y Grupo</span>
            <span className="mt-1 block text-sm font-bold text-slate-900">
              {alumno.semestre ?? 3}° Semestre · Grupo {perfil?.grupo ?? "E"} ({alumno.turno ?? "Matutino"})
            </span>
          </div>
          <div>
            <span className="block font-bold text-slate-400 uppercase">Docente / Tutor a Cargo</span>
            <span className="mt-1 block text-sm font-bold text-slate-900">
              {tutor ? tutor.nombre : perfil?.tutorDocenteNombre ?? "Sin tutor asignado"}
            </span>
          </div>
          <div>
            <span className="block font-bold text-slate-400 uppercase">Control Escolar</span>
            <span className="mt-1 block font-mono text-sm font-bold text-slate-900">
              {perfil?.numeroControlEscolar ?? "CE-270-PEND"}
            </span>
          </div>
        </div>
      </header>

      {/* Tarjetas de Indicadores */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="tarjeta p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Asistencia Acumulada</p>
          <p className="mt-2 text-3xl font-black text-inst-700">{asistencias.porcentaje}%</p>
          <p className="mt-1 text-xs text-slate-500">
            {asistencias.presentes} asistencias / {asistencias.total} sesiones
          </p>
        </div>
        <div className="tarjeta p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Promedio General</p>
          <p className="mt-2 text-3xl font-black text-sky-700">{promedio}/100 pts</p>
          <p className="mt-1 text-xs text-slate-500">{calificadas.length} actividades evaluadas</p>
        </div>
        <div className="tarjeta p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Submódulos Cursando</p>
          <p className="mt-2 text-3xl font-black text-indigo-700">{cursos.length}</p>
          <p className="mt-1 text-xs text-slate-500">Asignaturas de Logística</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Asignaturas Inscritas */}
        <section className="tarjeta p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Submódulos Inscritos</h2>
          {cursos.length === 0 ? (
            <p className="text-xs text-slate-400">El alumno no está inscrito en ninguna asignatura.</p>
          ) : (
            <div className="space-y-3">
              {cursos.map(({ curso, docente }) => (
                <div key={curso.id} className="rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{curso.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {curso.clave} · {curso.aula ?? "Edificio C"} · Prof. {docente}
                    </p>
                  </div>
                  <Link href={`/panel/clases/${curso.id}`} className="btn-mini">
                    Ver aula →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Historial de Evidencias */}
        <section className="tarjeta p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Historial de Evidencias y Tareas</h2>
          {tareas.length === 0 ? (
            <p className="text-xs text-slate-400">No hay tareas registradas.</p>
          ) : (
            <div className="space-y-2.5">
              {tareas.slice(0, 6).map(({ tarea, curso, entrega }) => (
                <div key={tarea.id} className="rounded-xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{tarea.titulo}</p>
                    <p className="text-slate-500">{curso.nombre}</p>
                  </div>
                  <div>
                    {entrega?.calificacion != null ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                        {entrega.calificacion}/{tarea.puntos} pts
                      </span>
                    ) : entrega ? (
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 font-bold text-sky-700">
                        Entregada (en revisión)
                      </span>
                    ) : (
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 font-bold text-rose-700">
                        Sin entregar
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
