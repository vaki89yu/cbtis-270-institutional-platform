import type { Metadata } from "next";
import Image from "next/image";
import { Icono } from "@/components/iconos";
import { datosParaTutor, resolverEnlace } from "@/lib/tutores";
import { formatoFecha, formatoFechaHora } from "@/lib/guards";

export const dynamic = "force-dynamic";

/** Vista privada: nunca se indexa ni se comparte en buscadores. */
export const metadata: Metadata = {
  title: "Consulta para tutores",
  robots: { index: false, follow: false, nocache: true },
};

type Props = { params: Promise<{ token: string }> };

function Encabezado() {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div className="flex items-center gap-3">
        <Image src="/images/logo-cbtis270.png" alt="CBTIS No. 270" width={44} height={44} className="h-11 w-11 rounded-xl object-contain" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-inst-700">CBTIS No. 270</p>
          <p className="text-sm font-bold text-slate-800">Consulta para tutores · Logística</p>
        </div>
      </div>
      <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 sm:block">
        Sólo lectura
      </span>
    </header>
  );
}

function EnlaceInvalido() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Encabezado />
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <Icono nombre="alerta" tamano={26} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <h1 className="text-lg font-black text-amber-900">Este enlace ya no está disponible</h1>
            <p className="mt-1 text-sm text-amber-800">
              Puede haber caducado, haber sido revocado por el plantel o estar incompleto. Por
              seguridad no mostramos información de ningún alumno.
            </p>
            <p className="mt-3 text-sm text-amber-800">
              Solicita un enlace nuevo al docente encargado o a control escolar del plantel.
            </p>
          </div>
        </div>
      </div>
      <p className="mt-6 text-xs text-slate-400">
        Plataforma institucional de la Carrera Técnica en Logística · CBTIS No. 270
      </p>
    </main>
  );
}

export default async function ConsultaTutorPage({ params }: Props) {
  const { token } = await params;
  const enlace = await resolverEnlace(decodeURIComponent(token));
  if (!enlace) return <EnlaceInvalido />;

  const data = await datosParaTutor(enlace.alumno);
  const riesgo = data.nivelRiesgo;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Encabezado />

      {/* Ficha del alumno */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Alumno
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">{data.alumno.nombre}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Matrícula {data.alumno.matricula ?? "pendiente"} · {data.alumno.semestre ?? "—"}° semestre
              {data.alumno.grupo ? ` · Grupo ${data.alumno.grupo}` : ""} · {data.alumno.turno ?? "Turno pendiente"}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Docente encargado:{" "}
              <strong className="text-slate-700">{data.docenteEncargado ?? "Sin asignar"}</strong>
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
            Enlace de {enlace.enlace.etiqueta}
          </span>
        </div>
      </section>

      {/* Indicadores */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Asistencia</p>
          <p className="mt-1 text-3xl font-black text-inst-700">
            {data.asistencia.porcentaje === null ? "—" : `${data.asistencia.porcentaje}%`}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {data.asistencia.presentes + data.asistencia.retardos + data.asistencia.justificados} de{" "}
            {data.asistencia.total} sesiones
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Promedio</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{data.promedio ?? "—"}</p>
          <p className="mt-0.5 text-xs text-slate-500">sobre 100 puntos</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
            Actividades pendientes
          </p>
          <p className="mt-1 text-3xl font-black text-amber-600">{data.pendientes.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {data.pendientes.filter((p) => p.vencida).length} ya vencidas
          </p>
        </div>
        <div
          className={`rounded-2xl border p-5 shadow-sm ${
            riesgo === "alto"
              ? "border-rose-200 bg-rose-50"
              : riesgo === "medio"
                ? "border-amber-200 bg-amber-50"
                : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Semáforo</p>
          <p
            className={`mt-1 text-2xl font-black ${
              riesgo === "alto" ? "text-rose-700" : riesgo === "medio" ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {riesgo === "alto" ? "Atención" : riesgo === "medio" ? "Seguimiento" : "Al corriente"}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {data.motivosRiesgo.length > 0 ? data.motivosRiesgo.join(" · ") : "Sin alertas por ahora"}
          </p>
        </div>
      </section>

      {/* Asistencia por aula */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">Asistencia por asignatura</h2>
        {data.aulas.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Todavía no hay aulas inscritas ni asistencias registradas.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Asignatura</th>
                  <th className="py-2 pr-3">Docente</th>
                  <th className="py-2 pr-2 text-center">Asist.</th>
                  <th className="py-2 pr-2 text-center">Retardos</th>
                  <th className="py-2 pr-2 text-center">Faltas</th>
                  <th className="py-2 pr-2 text-center">Justif.</th>
                  <th className="py-2 text-center">%</th>
                </tr>
              </thead>
              <tbody>
                {data.aulas.map((aula) => (
                  <tr key={aula.cursoId} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-xs font-bold text-slate-800">{aula.curso}</td>
                    <td className="py-2 pr-3 text-xs text-slate-500">{aula.docente}</td>
                    <td className="py-2 pr-2 text-center text-xs text-emerald-700">{aula.presentes}</td>
                    <td className="py-2 pr-2 text-center text-xs text-amber-700">{aula.retardos}</td>
                    <td className="py-2 pr-2 text-center text-xs text-rose-700">{aula.faltas}</td>
                    <td className="py-2 pr-2 text-center text-xs text-sky-700">{aula.justificados}</td>
                    <td className="py-2 text-center text-xs font-black text-slate-800">
                      {aula.porcentaje === null ? "—" : `${aula.porcentaje}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-slate-400">
          Criterio del plantel: retardo y falta justificada cuentan como asistencia.
        </p>
      </section>

      {/* Promedio por parcial */}
      <section className="grid gap-3 sm:grid-cols-3">
        {data.parciales.map((parcial) => (
          <div key={parcial.parcial} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
              {parcial.parcial}° parcial
            </p>
            <p className="mt-1 text-3xl font-black text-slate-900">{parcial.promedio ?? "—"}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {parcial.evaluadas === 0
                ? "Sin actividades calificadas"
                : `${parcial.evaluadas} actividad(es) calificada(s)`}
            </p>
          </div>
        ))}
      </section>

      {/* Actividades pendientes */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">Actividades por entregar</h2>
        {data.pendientes.length === 0 ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            Todo entregado por ahora. Sin pendientes.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.pendientes.slice(0, 12).map((pendiente) => (
              <li
                key={pendiente.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
              >
                <span className="min-w-0 text-sm text-slate-800">
                  <span className="font-bold">{pendiente.titulo}</span>
                  <span className="block text-xs text-slate-500">
                    {pendiente.curso} · {pendiente.parcial}° parcial
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    pendiente.vencida ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {pendiente.vencida ? "Venció el " : "Entrega "}
                  {formatoFecha(pendiente.fechaEntrega)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Aviso de privacidad y vigencia */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-500">
        <p className="font-bold text-slate-700">Este enlace es personal</p>
        <p className="mt-1">
          Muestra únicamente la información académica de {data.alumno.nombre.split(" ")[0]} y no
          permite modificarla. Compártelo sólo con quien ejerce la tutoría legal. Si lo reenviaste
          por error, pide al plantel que lo revoque y se emita uno nuevo.
        </p>
        <p className="mt-2">
          Vigente hasta {formatoFechaHora(enlace.enlace.expiraEn)} · Consulta generada el{" "}
          {formatoFechaHora(data.actualizadoEn)}.
        </p>
      </section>

      <footer className="pb-6 text-center text-[11px] text-slate-400">
        CBTIS No. 270 · DGETI · Carrera Técnica en Logística
      </footer>
    </main>
  );
}
