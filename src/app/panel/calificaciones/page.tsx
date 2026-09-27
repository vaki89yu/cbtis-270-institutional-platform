import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignments, courses, submissions, users } from "@/db/schema";
import { Icono } from "@/components/iconos";
import {
  alumnosDelAula,
  aulasDelAlumno,
  concentradoCalificaciones,
} from "@/lib/academico/aula";
import { NOMBRE_MODULO } from "@/lib/formatos/catalogo";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Calificaciones" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ aula?: string }> };

const PARCIALES = [1, 2, 3];

function colorNota(nota: number | null) {
  if (nota === null) return "bg-slate-100 text-slate-400";
  if (nota >= 9) return "bg-emerald-100 text-emerald-800";
  if (nota >= 8) return "bg-sky-100 text-sky-800";
  if (nota >= 7) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

/** Escala 0-100 de las actividades a la escala 5-10 de la boleta. */
function aBoleta(promedio100: number | null): number | null {
  if (promedio100 === null) return null;
  return Math.round((promedio100 / 10) * 10) / 10;
}

export default async function CalificacionesPage({ searchParams }: Props) {
  const user = await requireUser();
  const { aula } = await searchParams;

  /* ------------------------------ ALUMNO: boleta ------------------------------ */
  if (user.rol === "estudiante") {
    const misAulas = await aulasDelAlumno(user.id);

    const boleta = await Promise.all(
      misAulas.map(async ({ curso, docente }) => {
        const filas = await db
          .select({ tarea: assignments, entrega: submissions })
          .from(assignments)
          .leftJoin(
            submissions,
            and(eq(submissions.assignmentId, assignments.id), eq(submissions.studentId, user.id)),
          )
          .where(eq(assignments.courseId, curso.id))
          .orderBy(asc(assignments.parcial), asc(assignments.fechaEntrega));

        const porParcial = PARCIALES.map((p) => {
          const delParcial = filas.filter((f) => (f.tarea.parcial ?? 1) === p);
          const notas = delParcial
            .map((f) => f.entrega?.calificacion)
            .filter((c): c is number => typeof c === "number");
          const promedio =
            notas.length > 0 ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : null;
          return {
            parcial: p,
            actividades: delParcial.length,
            calificadas: notas.length,
            pendientes: delParcial.filter((f) => f.tarea.activa && !f.entrega).length,
            promedio,
          };
        });

        const todas = porParcial
          .map((p) => p.promedio)
          .filter((c): c is number => typeof c === "number");
        const final = todas.length > 0 ? Math.round(todas.reduce((a, b) => a + b, 0) / todas.length) : null;

        return { curso, docente, filas, porParcial, final };
      }),
    );

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Mi boleta</h1>
          <p className="text-sm text-slate-500">
            Lo que llevas en cada aula, parcial por parcial. Se actualiza en cuanto tu docente
            califica una evidencia.
          </p>
        </div>

        {boleta.length === 0 ? (
          <div className="tarjeta p-10 text-center">
            <Icono nombre="evidencias" tamano={36} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              Todavía no estás en ninguna aula. Aparecerá aquí en cuanto tu docente abra la suya.
            </p>
          </div>
        ) : null}

        {boleta.map(({ curso, docente, filas, porParcial, final }) => (
          <section key={curso.id} className="tarjeta overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: curso.color }} />
            <div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {curso.aula ? `${curso.aula} · ` : ""}
                  {curso.nombre}
                </h2>
                <p className="text-xs text-slate-500">
                  {curso.semestre}° {curso.grupo}
                  {curso.modulo ? ` · Módulo ${curso.modulo}` : ""} · Prof. {docente}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Promedio general
                </p>
                <p
                  className={`mt-0.5 inline-block rounded-xl px-4 py-1 text-2xl font-black ${colorNota(
                    aBoleta(final),
                  )}`}
                >
                  {aBoleta(final) ?? "—"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 px-6 sm:grid-cols-3">
              {porParcial.map((p) => (
                <div key={p.parcial} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Parcial {p.parcial}
                  </p>
                  <p className={`mt-1 inline-block rounded-lg px-2.5 py-0.5 text-xl font-black ${colorNota(aBoleta(p.promedio))}`}>
                    {aBoleta(p.promedio) ?? "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {p.calificadas} de {p.actividades} calificadas
                    {p.pendientes > 0 ? ` · te faltan ${p.pendientes} por entregar` : ""}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 divide-y divide-slate-100 px-6 pb-6">
              {filas.map(({ tarea, entrega }) => (
                <div key={tarea.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{tarea.titulo}</p>
                    <p className="text-[11px] text-slate-500">
                      Parcial {tarea.parcial ?? 1}
                      {entrega
                        ? entrega.calificacion != null
                          ? " · calificada"
                          : " · entregada, en revisión"
                        : tarea.activa
                          ? " · sin entregar"
                          : " · no activada"}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg px-3 py-1 text-sm font-black ${colorNota(
                      entrega?.calificacion != null ? aBoleta(entrega.calificacion) : null,
                    )}`}
                  >
                    {entrega?.calificacion != null ? aBoleta(entrega.calificacion) : "—"}
                  </span>
                </div>
              ))}
              {filas.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Tu docente aún no activa actividades en esta aula.
                </p>
              ) : null}
            </div>
            <div className="border-t border-slate-100 px-6 py-3">
              <Link href={`/panel/clases/${curso.id}`} className="btn-mini">
                Entrar al aula
              </Link>
            </div>
          </section>
        ))}
      </div>
    );
  }

  /* --------------------------- DOCENTE: concentrado --------------------------- */
  const misAulas = await db
    .select({ curso: courses })
    .from(courses)
    .where(
      user.rol === "admin" ? eq(courses.activo, true) : and(eq(courses.docenteId, user.id), eq(courses.activo, true)),
    )
    .orderBy(asc(courses.nombre));

  const aulaId = Number(aula ?? misAulas[0]?.curso.id ?? 0);
  const aulaActual = misAulas.find((a) => a.curso.id === aulaId)?.curso ?? null;

  const datos = aulaActual
    ? await concentradoCalificaciones(aulaActual.id)
    : { alumnos: [] as Awaited<ReturnType<typeof alumnosDelAula>>, actividades: [], notas: new Map<string, number>() };

  const actividades = datos.actividades as { id: number; titulo: string; parcial: number | null }[];

  function promedioAlumno(studentId: number, parcial?: number) {
    const relevantes = parcial
      ? actividades.filter((a) => (a.parcial ?? 1) === parcial)
      : actividades;
    const notas = relevantes
      .map((a) => datos.notas.get(`${studentId}|${a.id}`))
      .filter((n): n is number => typeof n === "number");
    if (notas.length === 0) return null;
    return Math.round(notas.reduce((a, b) => a + b, 0) / notas.length);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Concentrado de calificaciones</h1>
          <p className="text-sm text-slate-500">
            Todo el grupo en una sola tabla: alumno por actividad, promedio por parcial y semáforo
            de riesgo.
          </p>
        </div>
        {aulaActual ? (
          <Link href={`/panel/calificaciones/imprimir?aula=${aulaActual.id}`} className="btn-secundario px-4 py-2 text-sm">
            Versión para imprimir
          </Link>
        ) : null}
      </div>

      {misAulas.length === 0 ? (
        <div className="tarjeta p-10 text-center">
          <Icono nombre="aulas" tamano={36} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            Todavía no abres ninguna aula.{" "}
            <Link href="/panel/clases/nueva" className="font-bold text-inst-700 underline">
              Abrir un aula
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {misAulas.map(({ curso }) => (
              <Link
                key={curso.id}
                href={`/panel/calificaciones?aula=${curso.id}`}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  curso.id === aulaId
                    ? "bg-inst-700 text-white"
                    : "border border-slate-300 bg-white text-slate-600 hover:border-inst-400"
                }`}
              >
                {curso.aula ?? curso.clave} · {curso.semestre}° {curso.grupo}
              </Link>
            ))}
          </div>

          {aulaActual ? (
            <section className="tarjeta p-6">
              <h2 className="text-lg font-black text-slate-900">
                {aulaActual.aula ? `${aulaActual.aula} · ` : ""}
                {aulaActual.nombre}
              </h2>
              <p className="text-xs text-slate-500">
                {aulaActual.semestre}° {aulaActual.grupo}
                {aulaActual.modulo
                  ? ` · Módulo ${aulaActual.modulo}: ${NOMBRE_MODULO[aulaActual.modulo]}`
                  : ""}{" "}
                · {datos.alumnos.length} alumnos · {actividades.length} actividades
              </p>

              {datos.alumnos.length === 0 || actividades.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  {datos.alumnos.length === 0
                    ? "Todavía no hay alumnos en esta aula."
                    : "Activa actividades en el aula para empezar a calificar."}
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-200 text-left">
                        <th className="sticky left-0 bg-white px-2 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                          Alumno
                        </th>
                        {actividades.map((a) => (
                          <th
                            key={a.id}
                            className="px-1 py-2 text-center text-[10px] font-bold text-slate-500"
                            title={a.titulo}
                          >
                            <span className="block max-w-[64px] truncate">{a.titulo}</span>
                            <span className="text-[9px] font-semibold text-slate-400">
                              P{a.parcial ?? 1}
                            </span>
                          </th>
                        ))}
                        {PARCIALES.map((p) => (
                          <th key={`p${p}`} className="px-2 py-2 text-center text-[10px] font-black uppercase text-inst-700">
                            P{p}
                          </th>
                        ))}
                        <th className="px-2 py-2 text-center text-[10px] font-black uppercase text-inst-700">
                          Final
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.alumnos.map((al) => {
                        const final = promedioAlumno(al.id);
                        return (
                          <tr key={al.id} className="border-b border-slate-100">
                            <td className="sticky left-0 bg-white px-2 py-2">
                              <Link
                                href={`/panel/expedientes/${al.id}`}
                                className="block max-w-[190px] truncate text-xs font-bold text-slate-800 hover:text-inst-700"
                              >
                                {al.nombre}
                              </Link>
                              <span className="text-[10px] text-slate-400">
                                {al.matricula ?? "sin matrícula"}
                              </span>
                            </td>
                            {actividades.map((a) => {
                              const nota = datos.notas.get(`${al.id}|${a.id}`) ?? null;
                              return (
                                <td key={a.id} className="px-1 py-2 text-center">
                                  <span
                                    className={`inline-block min-w-[30px] rounded-md px-1 py-0.5 text-[11px] font-bold ${colorNota(
                                      aBoleta(nota),
                                    )}`}
                                  >
                                    {aBoleta(nota) ?? "—"}
                                  </span>
                                </td>
                              );
                            })}
                            {PARCIALES.map((p) => {
                              const prom = promedioAlumno(al.id, p);
                              return (
                                <td key={`p${p}`} className="px-2 py-2 text-center">
                                  <span className={`inline-block rounded-md px-1.5 py-0.5 text-xs font-black ${colorNota(aBoleta(prom))}`}>
                                    {aBoleta(prom) ?? "—"}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-2 py-2 text-center">
                              <span className={`inline-block rounded-md px-2 py-0.5 text-sm font-black ${colorNota(aBoleta(final))}`}>
                                {aBoleta(final) ?? "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-4 text-[11px] text-slate-400">
                Verde 9 o más · azul 8 · ámbar 7 · rojo reprobado. Las actividades se califican
                sobre 100 y la boleta muestra la escala 0-10.
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
