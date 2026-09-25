import Link from "next/link";
import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendances, courses, enrollments, users } from "@/db/schema";
import { BotonEnviar, FormEstado } from "@/components/form-estado";
import {
  registrarAsistenciaLoteAction,
  resolverJustificanteAction,
  solicitarJustificanteAction,
} from "@/lib/actions/asistencias";
import {
  clasesDelDocente,
  clasesDelEstudiante,
  justificantesDelEstudiante,
  justificantesParaDocente,
  registrosAsistenciaEstudiante,
  resumenAsistenciaEstudiante,
} from "@/lib/consultas";
import { formatoFecha, requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Control de Asistencia Digital" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ cursoId?: string; fecha?: string }>;
};

export default async function AsistenciasPage({ searchParams }: Props) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};

  // VISTA PARA ESTUDIANTES
  if (user.rol === "estudiante") {
    const resumen = await resumenAsistenciaEstudiante(user.id);
    const registros = await registrosAsistenciaEstudiante(user.id);
    const misClases = await clasesDelEstudiante(user.id);
    const justificantes = await justificantesDelEstudiante(user.id);

    const riesgo = resumen.total > 0 && resumen.porcentaje < 80;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Control de Asistencia Digital</h1>
          <p className="text-sm text-slate-500">
            Registro oficial de asistencias a sesiones de aula y prácticas de almacén escuela.
          </p>
        </div>

        {/* Tarjetas resumen */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="tarjeta p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Porcentaje Asistencia</p>
            <p className={`mt-2 text-3xl font-black ${riesgo ? "text-rose-600" : "text-inst-700"}`}>
              {resumen.porcentaje}%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {resumen.porcentaje >= 80 ? "Acreditación vigente (mínimo 80%)" : "Riesgo de no acreditar"}
            </p>
          </div>
          <div className="tarjeta p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sesiones Totales</p>
            <p className="mt-2 text-3xl font-black text-slate-800">{resumen.total}</p>
            <p className="mt-1 text-xs text-slate-500">Clases impartidas</p>
          </div>
          <div className="tarjeta p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Asistencias</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{resumen.presentes}</p>
            <p className="mt-1 text-xs text-slate-500">A tiempo</p>
          </div>
          <div className="tarjeta p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Retardos</p>
            <p className="mt-2 text-3xl font-black text-amber-600">{resumen.retardos}</p>
            <p className="mt-1 text-xs text-slate-500">2 retardos = 1 falta</p>
          </div>
          <div className="tarjeta p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Faltas / Justif.</p>
            <p className="mt-2 text-3xl font-black text-rose-600">
              {resumen.faltas} <span className="text-sm font-semibold text-sky-700">({resumen.justificados} just.)</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Registradas</p>
          </div>
        </div>

        {riesgo ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <strong>Atención:</strong> Tu porcentaje de asistencia está por debajo del 80% reglamentario. Solicita justificante para las faltas justificadas por salud o causa escolar.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Historial de asistencias */}
          <section className="tarjeta p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Historial de Asistencias</h2>
            {registros.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Aún no hay asistencias registradas para tu cuenta.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {registros.map(({ asistencia, curso, docente }) => {
                  const badgeColor =
                    asistencia.estado === "presente"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : asistencia.estado === "retardo"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : asistencia.estado === "justificado"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-rose-50 text-rose-700 border-rose-200";

                  return (
                    <div key={asistencia.id} className="flex items-center justify-between gap-3 p-3.5">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{curso.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {formatoFecha(asistencia.fecha)} · Prof. {docente}
                        </p>
                        {asistencia.observacion ? (
                          <p className="mt-1 text-xs text-slate-600 italic">“{asistencia.observacion}”</p>
                        ) : null}
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${badgeColor}`}>
                        {asistencia.estado}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Justificantes escolares */}
          <section className="space-y-6">
            <div className="tarjeta p-6">
              <h2 className="text-lg font-bold text-slate-900">Solicitar Justificante</h2>
              <p className="mt-1 text-xs text-slate-500">
                Sube tu comprobante médico o justificación institucional para revisión de tu docente.
              </p>
              <div className="mt-4">
                <FormEstado
                  action={solicitarJustificanteAction}
                  submitLabel="Enviar Justificante"
                  pendienteTexto="Enviando solicitud..."
                  botonClase="btn-primario w-full"
                >
                  <select name="courseId" required className="campo" defaultValue="">
                    <option value="" disabled>Selecciona la asignatura</option>
                    {misClases.map(({ curso }) => (
                      <option key={curso.id} value={curso.id}>{curso.nombre}</option>
                    ))}
                  </select>
                  <input type="date" name="fechaFalta" required className="campo" />
                  <textarea
                    name="motivo"
                    rows={2}
                    required
                    className="campo"
                    placeholder="Motivo de la falta (médico, cita escolar, etc.)"
                  />
                  <input
                    name="documentoUrl"
                    className="campo"
                    placeholder="Enlace a receta o constancia (Drive / enlace)"
                  />
                </FormEstado>
              </div>
            </div>

            <div className="tarjeta p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Mis Justificantes</h3>
              {justificantes.length === 0 ? (
                <p className="mt-3 text-xs text-slate-400">Sin solicitudes enviadas.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {justificantes.map(({ justificante, curso }) => (
                    <div key={justificante.id} className="rounded-xl border border-slate-200 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800">{curso.nombre}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-bold uppercase ${
                            justificante.estado === "aprobado"
                              ? "bg-emerald-50 text-emerald-700"
                              : justificante.estado === "rechazado"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {justificante.estado}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">Fecha: {formatoFecha(justificante.fechaFalta)}</p>
                      <p className="mt-1 text-slate-500">{justificante.motivo}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // VISTA PARA DOCENTES Y ADMINISTRACIÓN
  const misClases = await clasesDelDocente(user.id);
  const cursoSeleccionadoId = params.cursoId ? Number(params.cursoId) : misClases[0]?.curso.id;
  const hoyStr = params.fecha ?? new Date().toISOString().slice(0, 10);

  // Alumnos del curso seleccionado
  const alumnosInscritos = cursoSeleccionadoId
    ? await db
        .select({
          alumno: users,
          asistencia: attendances,
        })
        .from(enrollments)
        .innerJoin(users, eq(users.id, enrollments.studentId))
        .leftJoin(
          attendances,
          and(
            eq(attendances.courseId, cursoSeleccionadoId),
            eq(attendances.studentId, users.id),
            eq(attendances.fecha, new Date(hoyStr + "T12:00:00Z")),
          ),
        )
        .where(eq(enrollments.courseId, cursoSeleccionadoId))
        .orderBy(users.nombre)
    : [];

  const justificantesPendientes = await justificantesParaDocente(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Pase de Lista y Asistencia Digital</h1>
          <p className="text-sm text-slate-500">
            Control de asistencia para aulas de Logística y prácticas en el Almacén Escuela.
          </p>
        </div>
      </div>

      {/* Selector de clase y fecha */}
      <div className="tarjeta p-5">
        <form method="GET" className="grid gap-3 sm:grid-cols-[1.5fr_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Asignatura / Submódulo</label>
            <select name="cursoId" defaultValue={cursoSeleccionadoId} className="campo">
              {misClases.map(({ curso }) => (
                <option key={curso.id} value={curso.id}>
                  {curso.nombre} · {curso.semestre}° {curso.grupo} ({curso.turno})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Fecha de la clase</label>
            <input type="date" name="fecha" defaultValue={hoyStr} className="campo" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-secundario w-full">
              Cargar Alumnos
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1.1fr]">
        {/* Formulario de pase de lista */}
        <section className="tarjeta p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Pase de Lista ({alumnosInscritos.length} alumnos)</h2>
            <span className="text-xs font-semibold text-slate-400">Fecha: {hoyStr}</span>
          </div>

          {alumnosInscritos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No hay alumnos inscritos en este grupo todavía.
            </p>
          ) : (
            <FormEstado
              action={registrarAsistenciaLoteAction}
              submitLabel="Guardar Asistencia de Hoy"
              pendienteTexto="Guardando registros..."
              botonClase="btn-primario w-full mt-4"
            >
              <input type="hidden" name="courseId" value={cursoSeleccionadoId} />
              <input type="hidden" name="fecha" value={hoyStr} />

              <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {alumnosInscritos.map(({ alumno, asistencia }, idx) => {
                  const estadoActual = asistencia?.estado ?? "presente";
                  return (
                    <div key={alumno.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5 hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          <span className="mr-2 text-xs text-slate-400">{idx + 1}.</span>
                          {alumno.nombre}
                        </p>
                        <p className="text-xs text-slate-500">{alumno.matricula ?? alumno.email}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex gap-2">
                          {[
                            ["presente", "P", "bg-emerald-100 text-emerald-800", "border-emerald-300"],
                            ["retardo", "R", "bg-amber-100 text-amber-800", "border-amber-300"],
                            ["falta", "F", "bg-rose-100 text-rose-800", "border-rose-300"],
                            ["justificado", "J", "bg-sky-100 text-sky-800", "border-sky-300"],
                          ].map(([val, letLabel, colorClass, borderClass]) => (
                            <label key={val} className="cursor-pointer text-xs font-bold">
                              <input
                                type="radio"
                                name={`estado_${alumno.id}`}
                                value={val}
                                defaultChecked={estadoActual === val}
                                className="peer sr-only"
                              />
                              <span
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition peer-checked:${borderClass} peer-checked:${colorClass} peer-checked:ring-2 peer-checked:ring-slate-900/10`}
                              >
                                {letLabel}
                              </span>
                            </label>
                          ))}
                        </div>
                        <input
                          name={`obs_${alumno.id}`}
                          defaultValue={asistencia?.observacion ?? ""}
                          placeholder="Nota (opcional)"
                          className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-inst-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </FormEstado>
          )}
        </section>

        {/* Justificantes por resolver */}
        <section className="space-y-4">
          <div className="tarjeta p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Justificantes por Revisar ({justificantesPendientes.filter((j) => j.justificante.estado === "pendiente").length})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Al aprobar un justificante, la falta del alumno se convierte automáticamente en justificada.
            </p>

            {justificantesPendientes.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                No hay solicitudes de justificante pendientes.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {justificantesPendientes.map(({ justificante, alumno, curso }) => (
                  <div key={justificante.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{alumno.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {curso.nombre} · Fecha: {formatoFecha(justificante.fechaFalta)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          justificante.estado === "aprobado"
                            ? "bg-emerald-50 text-emerald-700"
                            : justificante.estado === "rechazado"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {justificante.estado}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-700">“{justificante.motivo}”</p>
                    {justificante.documentoUrl ? (
                      <a
                        href={justificante.documentoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-semibold text-inst-700 hover:underline"
                      >
                        Ver comprobante adjunto →
                      </a>
                    ) : null}

                    {justificante.estado === "pendiente" ? (
                      <form action={resolverJustificanteAction} className="mt-3 flex gap-2 pt-2 border-t border-slate-100">
                        <input type="hidden" name="justificationId" value={justificante.id} />
                        <input
                          name="notaRevision"
                          placeholder="Nota para el alumno"
                          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          name="resolucion"
                          value="aprobado"
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          Aprobar
                        </button>
                        <button
                          type="submit"
                          name="resolucion"
                          value="rechazado"
                          className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700"
                        >
                          Rechazar
                        </button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
