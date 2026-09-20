import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignments, courses, enrollments, submissions, users } from "@/db/schema";
import { BotonEnviar } from "@/components/form-estado";
import { calificarEntregaAction, entregarTareaAction } from "@/lib/actions/plataforma";
import { formatoFechaHora, requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TareaDetallePage({ params }: Props) {
  const { id } = await params;
  const tareaId = Number(id);
  if (!Number.isFinite(tareaId)) notFound();

  const user = await requireUser();

  const filas = await db
    .select({ tarea: assignments, curso: courses, docente: users.nombre })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .innerJoin(users, eq(users.id, courses.docenteId))
    .where(eq(assignments.id, tareaId))
    .limit(1);

  const fila = filas[0];
  if (!fila) notFound();
  const { tarea, curso, docente } = fila;

  const esDocente = user.rol === "admin" || curso.docenteId === user.id;
  const vencida = new Date(tarea.fechaEntrega).getTime() < Date.now();

  if (esDocente) {
    const entregas = await db
      .select({ entrega: submissions, alumno: users })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.studentId))
      .leftJoin(
        submissions,
        and(eq(submissions.assignmentId, tareaId), eq(submissions.studentId, enrollments.studentId)),
      )
      .where(eq(enrollments.courseId, curso.id))
      .orderBy(asc(users.nombre));

    const entregadas = entregas.filter((e) => e.entrega);
    const calificadas = entregas.filter((e) => e.entrega?.calificacion != null);

    return (
      <div className="space-y-6">
        <Link href={`/panel/clases/${curso.id}`} className="text-sm text-slate-500 hover:text-inst-700">
          ← {curso.nombre}
        </Link>

        <header className="tarjeta p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {curso.clave} · {curso.semestre}° {curso.grupo}
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">{tarea.titulo}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Entrega: {formatoFechaHora(tarea.fechaEntrega)} · Valor: {tarea.puntos} puntos
          </p>
          {tarea.instrucciones ? (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {tarea.instrucciones}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              {entregas.length} estudiantes
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
              {entregadas.length} entregas
            </span>
            <span className="rounded-full bg-inst-50 px-3 py-1 text-inst-700">
              {calificadas.length} calificadas
            </span>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Entregas del grupo</h2>
          {entregas.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Todavía no hay estudiantes inscritos en esta clase.
            </p>
          ) : (
            entregas.map(({ entrega, alumno }) => (
              <article key={alumno.id} className="tarjeta p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{alumno.nombre}</p>
                    <p className="text-xs text-slate-500">{alumno.matricula ?? alumno.email}</p>
                  </div>
                  {entrega ? (
                    <span className="text-xs text-slate-500">
                      Entregó {formatoFechaHora(entrega.entregadoEn)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-600">
                      Sin entregar
                    </span>
                  )}
                </div>

                {entrega ? (
                  <>
                    {entrega.contenido ? (
                      <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {entrega.contenido}
                      </p>
                    ) : null}
                    {entrega.url ? (
                      <a
                        href={entrega.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-semibold text-inst-700 hover:underline"
                      >
                        Ver archivo entregado →
                      </a>
                    ) : null}

                    <form
                      action={calificarEntregaAction}
                      className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[110px_1fr_auto]"
                    >
                      <input type="hidden" name="submissionId" value={entrega.id} />
                      <input type="hidden" name="assignmentId" value={tarea.id} />
                      <input
                        type="number"
                        name="calificacion"
                        min={0}
                        max={tarea.puntos}
                        defaultValue={entrega.calificacion ?? ""}
                        placeholder="Puntos"
                        className="campo"
                      />
                      <input
                        name="retroalimentacion"
                        defaultValue={entrega.retroalimentacion ?? ""}
                        placeholder="Retroalimentación para el estudiante"
                        className="campo"
                      />
                      <BotonEnviar className="btn-primario" pendienteTexto="Guardando...">
                        {entrega.calificacion != null ? "Actualizar" : "Calificar"}
                      </BotonEnviar>
                    </form>
                  </>
                ) : null}
              </article>
            ))
          )}
        </section>
      </div>
    );
  }

  // Vista del estudiante
  const inscrito = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, curso.id), eq(enrollments.studentId, user.id)))
    .limit(1);

  const propias = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.assignmentId, tareaId), eq(submissions.studentId, user.id)))
    .limit(1);
  const entrega = propias[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/panel/clases/${curso.id}`} className="text-sm text-slate-500 hover:text-inst-700">
        ← {curso.nombre}
      </Link>

      <header className="tarjeta p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {curso.clave} · Prof. {docente}
        </p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">{tarea.titulo}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Fecha límite: {formatoFechaHora(tarea.fechaEntrega)} · Valor: {tarea.puntos} puntos
        </p>
        {vencida && !entrega ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
            La fecha límite ya pasó. Puedes entregar, pero tu docente verá la entrega como extemporánea.
          </p>
        ) : null}
        {tarea.instrucciones ? (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {tarea.instrucciones}
          </p>
        ) : null}
      </header>

      {entrega?.calificacion != null ? (
        <div className="tarjeta border-l-4 border-l-inst-600 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-inst-700">Calificación</p>
          <p className="mt-1 text-3xl font-black text-inst-700">
            {entrega.calificacion}
            <span className="text-base text-slate-400">/{tarea.puntos}</span>
          </p>
          {entrega.retroalimentacion ? (
            <p className="mt-3 text-sm text-slate-600">
              <strong className="text-slate-700">Retroalimentación:</strong> {entrega.retroalimentacion}
            </p>
          ) : null}
        </div>
      ) : null}

      <section className="tarjeta p-6">
        <h2 className="text-lg font-bold text-slate-900">
          {entrega ? "Mi entrega" : "Entregar actividad"}
        </h2>
        {inscrito.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Debes estar inscrito en la clase para poder entregar esta tarea.
          </p>
        ) : (
          <form action={entregarTareaAction} className="mt-4 space-y-3">
            <input type="hidden" name="assignmentId" value={tarea.id} />
            <textarea
              name="contenido"
              rows={5}
              defaultValue={entrega?.contenido ?? ""}
              className="campo"
              placeholder="Escribe tu respuesta, resumen o comentarios sobre la actividad..."
            />
            <input
              name="url"
              defaultValue={entrega?.url ?? ""}
              className="campo"
              placeholder="Enlace a tu archivo (Drive, GitHub, etc.)"
            />
            <div className="flex items-center gap-3">
              <BotonEnviar className="btn-primario" pendienteTexto="Enviando...">
                {entrega ? "Actualizar entrega" : "Entregar tarea"}
              </BotonEnviar>
              {entrega ? (
                <span className="text-xs text-slate-500">
                  Última entrega: {formatoFechaHora(entrega.entregadoEn)}
                </span>
              ) : null}
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
