import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/components/iconos";
import { CUESTIONARIOS, TOTAL_PREGUNTAS } from "@/lib/academico/cuestionarios";
import { resumenDelAlumno, resultadosPorDocente } from "@/lib/academico/evaluaciones";
import { NOMBRE_MODULO } from "@/lib/formatos/catalogo";
import { formatoFechaHora, requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Cuestionarios" };
export const dynamic = "force-dynamic";

function colorDeCalificacion(calificacion: number | null) {
  if (calificacion === null) return "bg-slate-100 text-slate-500";
  if (calificacion >= 90) return "bg-emerald-100 text-emerald-800";
  if (calificacion >= 70) return "bg-inst-100 text-inst-800";
  if (calificacion >= 60) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

export default async function CuestionariosPage() {
  const user = await requireUser();
  const modulos = Array.from(new Set(CUESTIONARIOS.map((c) => c.modulo))).sort((a, b) => a - b);

  const encabezado = (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
        <Icono nombre="cuestionario" tamano={24} className="text-inst-700" />
        Cuestionarios del plan de estudios
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Evaluaciones autocalificables que se resuelven dentro de la plataforma: cronómetro,
        calificación instantánea y la explicación de cada reactivo al terminar.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-inst-50 px-3 py-1 text-inst-800">
          {CUESTIONARIOS.length} cuestionarios
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
          {TOTAL_PREGUNTAS} reactivos en el banco
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
          Uno por parcial en los cinco módulos
        </span>
      </div>
    </div>
  );

  /* -------------------------------- ALUMNO -------------------------------- */
  if (user.rol === "estudiante") {
    const resumen = await resumenDelAlumno(user.id);
    const resueltos = resumen.filter((r) => r.intentos > 0).length;
    const promedio = (() => {
      const conMarca = resumen.filter((r) => r.mejor);
      if (conMarca.length === 0) return null;
      return Math.round(
        conMarca.reduce((a, r) => a + (r.mejor?.calificacion ?? 0), 0) / conMarca.length,
      );
    })();

    return (
      <div className="space-y-6">
        {encabezado}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="tarjeta p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Resueltos</p>
            <p className="mt-1 text-3xl font-black text-slate-900">
              {resueltos}
              <span className="text-base font-bold text-slate-400"> / {CUESTIONARIOS.length}</span>
            </p>
          </div>
          <div className="tarjeta p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Promedio de mejores marcas
            </p>
            <p className="mt-1 text-3xl font-black text-slate-900">{promedio ?? "—"}</p>
          </div>
          <div className="tarjeta p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Intentos totales</p>
            <p className="mt-1 text-3xl font-black text-slate-900">
              {resumen.reduce((a, r) => a + r.intentos, 0)}
            </p>
          </div>
        </div>

        {modulos.map((modulo) => (
          <section key={modulo} className="tarjeta p-6">
            <h2 className="text-lg font-black text-slate-900">
              Módulo {modulo}
              <span className="ml-2 text-sm font-semibold text-slate-400">
                {NOMBRE_MODULO[modulo]?.replace(/^Módulo [IVX]+ · /, "") ?? ""}
              </span>
            </h2>
            <div className="mt-4 space-y-3">
              {resumen
                .filter((r) => r.cuestionario.modulo === modulo)
                .map(({ cuestionario, intentos, mejor }) => (
                  <div key={cuestionario.clave} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-inst-50 px-2 py-0.5 text-[10px] font-black text-inst-700">
                            {cuestionario.parcial}° parcial
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {cuestionario.preguntas.length} reactivos · {cuestionario.minutos} min
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${colorDeCalificacion(
                              mejor?.calificacion ?? null,
                            )}`}
                          >
                            {mejor ? `Mejor marca: ${mejor.calificacion}` : "Sin resolver"}
                          </span>
                          {intentos > 0 ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                              {intentos} {intentos === 1 ? "intento" : "intentos"}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          {cuestionario.titulo}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">{cuestionario.descripcion}</p>
                      </div>
                      <Link
                        href={`/panel/cuestionarios/${cuestionario.clave}`}
                        className="btn-primario shrink-0 px-3 py-1.5 text-[11px]"
                      >
                        {mejor ? "Volver a intentar" : "Resolver"}
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  /* ------------------------------- DOCENTE ------------------------------- */
  const { filas } = await resultadosPorDocente(user.id);

  return (
    <div className="space-y-6">
      {encabezado}

      <p className="rounded-xl border border-inst-200 bg-inst-50 px-4 py-3 text-sm text-inst-900">
        Tus alumnos resuelven estos cuestionarios desde su panel. Aquí ves el resultado de cada
        intento; el banco de respuestas correctas nunca se muestra en pantalla antes de enviar.
      </p>

      <section className="tarjeta p-6">
        <h2 className="text-lg font-black text-slate-900">Resultados de tus grupos</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3">Alumno</th>
                <th className="py-2 pr-3">Aula</th>
                <th className="py-2 pr-3">Cuestionario</th>
                <th className="py-2 pr-3 text-center">Aciertos</th>
                <th className="py-2 pr-3 text-center">Calificación</th>
                <th className="py-2 pr-3 text-center">Tiempo</th>
                <th className="py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ intento, alumno, aula }) => (
                <tr key={intento.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-bold text-slate-900">{alumno}</td>
                  <td className="py-2 pr-3 text-xs text-slate-500">{aula ?? "—"}</td>
                  <td className="py-2 pr-3 text-xs text-slate-600">
                    {CUESTIONARIOS.find((c) => c.clave === intento.cuestionarioClave)?.titulo ??
                      intento.cuestionarioClave}
                  </td>
                  <td className="py-2 pr-3 text-center text-xs font-bold text-slate-700">
                    {intento.correctas}/{intento.total}
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-black ${colorDeCalificacion(
                        intento.calificacion,
                      )}`}
                    >
                      {intento.calificacion}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-center text-xs text-slate-500">
                    {Math.floor(intento.duracionSeg / 60)}:
                    {String(intento.duracionSeg % 60).padStart(2, "0")}
                  </td>
                  <td className="py-2 text-xs text-slate-400">{formatoFechaHora(intento.createdAt)}</td>
                </tr>
              ))}
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                    Todavía ningún alumno de tus aulas ha resuelto un cuestionario.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {modulos.map((modulo) => (
        <section key={modulo} className="tarjeta p-6">
          <h2 className="text-lg font-black text-slate-900">Módulo {modulo}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {CUESTIONARIOS.filter((c) => c.modulo === modulo).map((c) => (
              <div key={c.clave} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-inst-50 px-2 py-0.5 text-[10px] font-black text-inst-700">
                    {c.clave}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {c.preguntas.length} reactivos · {c.minutos} min
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-900">{c.titulo}</p>
                <p className="mt-1 text-xs text-slate-600">{c.descripcion}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
