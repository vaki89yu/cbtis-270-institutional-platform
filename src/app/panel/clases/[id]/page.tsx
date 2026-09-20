import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  classPosts,
  classSessions,
  courses,
  enrollments,
  materials,
  submissions,
  users,
} from "@/db/schema";
import { BotonEnviar } from "@/components/form-estado";
import {
  crearMaterialAction,
  crearTareaAction,
  eliminarClaseAction,
  eliminarMaterialAction,
  eliminarSesionAction,
  eliminarTareaAction,
  inscribirseAction,
  programarSesionAction,
  publicarEnMuroAction,
} from "@/lib/actions/plataforma";
import { formatoFechaHora, requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ClaseDetallePage({ params }: Props) {
  const { id } = await params;
  const courseId = Number(id);
  if (!Number.isFinite(courseId)) notFound();

  const user = await requireUser();

  const filas = await db
    .select({ curso: courses, docente: users.nombre, docenteEmail: users.email })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.docenteId))
    .where(eq(courses.id, courseId))
    .limit(1);

  const fila = filas[0];
  if (!fila) notFound();
  const { curso, docente, docenteEmail } = fila;

  const esDocente = user.rol === "admin" || curso.docenteId === user.id;
  const inscripcion = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.studentId, user.id)))
    .limit(1);
  const estaInscrito = inscripcion.length > 0;

  const [listaMateriales, sesiones, alumnos, publicaciones] = await Promise.all([
    db.select().from(materials).where(eq(materials.courseId, courseId)).orderBy(desc(materials.createdAt)),
    db
      .select()
      .from(classSessions)
      .where(eq(classSessions.courseId, courseId))
      .orderBy(asc(classSessions.inicia)),
    db
      .select({ id: users.id, nombre: users.nombre, matricula: users.matricula, email: users.email })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.studentId))
      .where(eq(enrollments.courseId, courseId))
      .orderBy(asc(users.nombre)),
    db
      .select({ post: classPosts, autor: users.nombre, rol: users.rol })
      .from(classPosts)
      .innerJoin(users, eq(users.id, classPosts.autorId))
      .where(eq(classPosts.courseId, courseId))
      .orderBy(desc(classPosts.createdAt))
      .limit(20),
  ]);

  const tareas = esDocente
    ? await db
        .select({
          tarea: assignments,
          entregas: sql<number>`count(${submissions.id})::int`,
          porCalificar: sql<number>`count(*) filter (where ${submissions.id} is not null and ${submissions.calificacion} is null)::int`,
        })
        .from(assignments)
        .leftJoin(submissions, eq(submissions.assignmentId, assignments.id))
        .where(eq(assignments.courseId, courseId))
        .groupBy(assignments.id)
        .orderBy(asc(assignments.fechaEntrega))
    : await db
        .select({ tarea: assignments, entrega: submissions })
        .from(assignments)
        .leftJoin(
          submissions,
          and(eq(submissions.assignmentId, assignments.id), eq(submissions.studentId, user.id)),
        )
        .where(eq(assignments.courseId, courseId))
        .orderBy(asc(assignments.fechaEntrega));

  const puedePublicar = esDocente || estaInscrito;

  return (
    <div className="space-y-6">
      <Link href="/panel/clases" className="text-sm text-slate-500 hover:text-inst-700">
        ← Volver a mis aulas
      </Link>

      <header className="tarjeta overflow-hidden">
        <div className="h-2" style={{ backgroundColor: curso.color }} />
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {curso.clave} · {curso.especialidad ?? "Tronco común"}
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">{curso.nombre}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {curso.semestre}° semestre · Grupo {curso.grupo} · Turno {curso.turno} ·{" "}
              {curso.aula ?? "Aula por asignar"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Docente: <strong className="text-slate-700">{docente}</strong> ({docenteEmail})
            </p>
            {curso.descripcion ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{curso.descripcion}</p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full bg-inst-50 px-3 py-1.5 text-xs font-bold text-inst-700">
              {alumnos.length} alumnos
            </span>
            {!esDocente && user.rol === "estudiante" && !estaInscrito ? (
              <form action={inscribirseAction}>
                <input type="hidden" name="courseId" value={courseId} />
                <BotonEnviar className="btn-primario" pendienteTexto="Inscribiendo...">
                  Inscribirme al submódulo
                </BotonEnviar>
              </form>
            ) : null}
            {esDocente ? (
              <form action={eliminarClaseAction}>
                <input type="hidden" name="courseId" value={courseId} />
                <BotonEnviar className="btn-mini text-rose-600" pendienteTexto="...">
                  Eliminar aula
                </BotonEnviar>
              </form>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* SESIONES */}
          <section className="tarjeta p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">🎥 Prácticas y sesiones</h2>
            </div>

            {esDocente ? (
              <details className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-inst-700">
                  + Programar práctica o sesión
                </summary>
                <form action={programarSesionAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="courseId" value={courseId} />
                  <input name="tema" required className="campo sm:col-span-2" placeholder="Tema de la práctica o sesión" />
                  <input
                    name="descripcion"
                    className="campo sm:col-span-2"
                    placeholder="Actividades previstas (opcional)"
                  />
                  <input type="datetime-local" name="inicia" required className="campo" />
                  <select name="modalidad" className="campo" defaultValue="Virtual">
                    <option>Virtual</option>
                    <option>Presencial</option>
                    <option>Híbrida</option>
                  </select>
                  <input name="enlace" className="campo" placeholder="https://meet.google.com/..." />
                  <input
                    type="number"
                    name="duracionMin"
                    className="campo"
                    defaultValue={50}
                    min={20}
                    step={5}
                    placeholder="Duración (min)"
                  />
                  <div className="sm:col-span-2">
                    <BotonEnviar className="btn-primario" pendienteTexto="Programando...">
                      Programar
                    </BotonEnviar>
                  </div>
                </form>
              </details>
            ) : null}

            {sesiones.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                Sin prácticas ni sesiones programadas.
              </p>
            ) : (
              <ul className="space-y-3">
                {sesiones.map((sesion) => {
                  const pasada = new Date(sesion.inicia).getTime() < Date.now();
                  return (
                    <li
                      key={sesion.id}
                      className={`rounded-xl border px-4 py-3 ${
                        pasada ? "border-slate-200 bg-slate-50 opacity-75" : "border-inst-200 bg-inst-50/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-800">{sesion.tema}</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-inst-700">
                          {sesion.modalidad} · {sesion.duracionMin} min
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{formatoFechaHora(sesion.inicia)}</p>
                      {sesion.descripcion ? (
                        <p className="mt-1 text-xs text-slate-600">{sesion.descripcion}</p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-3">
                        {sesion.enlace ? (
                          <a
                            href={sesion.enlace}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-inst-700 hover:underline"
                          >
                            Entrar a la videollamada →
                          </a>
                        ) : null}
                        {esDocente ? (
                          <form action={eliminarSesionAction}>
                            <input type="hidden" name="courseId" value={courseId} />
                            <input type="hidden" name="sesionId" value={sesion.id} />
                            <BotonEnviar className="text-xs font-semibold text-rose-600" pendienteTexto="...">
                              Eliminar
                            </BotonEnviar>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* TAREAS */}
          <section className="tarjeta p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">📝 Actividades y evidencias</h2>

            {esDocente ? (
              <details className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-inst-700">
                  + Nueva actividad
                </summary>
                <form action={crearTareaAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="courseId" value={courseId} />
                  <input name="titulo" required className="campo sm:col-span-2" placeholder="Título de la actividad o evidencia" />
                  <textarea
                    name="instrucciones"
                    rows={3}
                    className="campo sm:col-span-2"
                    placeholder="Instrucciones y criterios de evaluación"
                  />
                  <input type="datetime-local" name="fechaEntrega" required className="campo" />
                  <div className="grid grid-cols-2 gap-2">
                    <select name="parcial" className="campo" defaultValue="1">
                      <option value="1">1er Parcial</option>
                      <option value="2">2do Parcial</option>
                      <option value="3">3er Parcial</option>
                    </select>
                    <input
                      type="number"
                      name="puntos"
                      className="campo"
                      defaultValue={100}
                      min={1}
                      max={100}
                      placeholder="Puntos"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <BotonEnviar className="btn-primario" pendienteTexto="Publicando...">
                      Publicar actividad
                    </BotonEnviar>
                  </div>
                </form>
              </details>
            ) : null}

            {tareas.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                Aún no hay actividades asignadas.
              </p>
            ) : (
              <ul className="space-y-3">
                {tareas.map((item) => {
                  const tarea = item.tarea;
                  const entrega = "entrega" in item ? item.entrega : null;
                  const vencida = new Date(tarea.fechaEntrega).getTime() < Date.now();
                  return (
                    <li key={tarea.id} className="rounded-xl border border-slate-200 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/panel/tareas/${tarea.id}`}
                            className="text-sm font-bold text-slate-800 hover:text-inst-700"
                          >
                            {tarea.titulo}
                          </Link>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Entrega: {formatoFechaHora(tarea.fechaEntrega)} · {tarea.puntos} pts
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {esDocente && "entregas" in item ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              {item.entregas} entregas · {item.porCalificar} sin calificar
                            </span>
                          ) : entrega ? (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                entrega.calificacion != null
                                  ? "bg-inst-50 text-inst-700"
                                  : "bg-sky-50 text-sky-700"
                              }`}
                            >
                              {entrega.calificacion != null
                                ? `Calificada: ${entrega.calificacion}/${tarea.puntos}`
                                : "Entregada"}
                            </span>
                          ) : (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                vencida ? "bg-rose-50 text-rose-700" : "bg-inst-50 text-inst-700"
                              }`}
                            >
                              {vencida ? "Vencida" : "Pendiente"}
                            </span>
                          )}
                          {esDocente ? (
                            <form action={eliminarTareaAction}>
                              <input type="hidden" name="courseId" value={courseId} />
                              <input type="hidden" name="tareaId" value={tarea.id} />
                              <BotonEnviar className="text-xs font-semibold text-rose-600" pendienteTexto="...">
                                ✕
                              </BotonEnviar>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* MURO */}
          <section className="tarjeta p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">💬 Muro operativo del grupo</h2>
            {puedePublicar ? (
              <form action={publicarEnMuroAction} className="mb-5 space-y-3">
                <input type="hidden" name="courseId" value={courseId} />
                <textarea
                  name="contenido"
                  rows={2}
                  required
                  className="campo"
                  placeholder="Comparte un aviso, recordatorio o duda con el grupo..."
                />
                <BotonEnviar className="btn-secundario" pendienteTexto="Publicando...">
                  Publicar
                </BotonEnviar>
              </form>
            ) : (
              <p className="mb-5 text-sm text-slate-500">
                Inscríbete al submódulo para participar en el muro.
              </p>
            )}

            {publicaciones.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                Todavía no hay publicaciones.
              </p>
            ) : (
              <ul className="space-y-3">
                {publicaciones.map(({ post, autor, rol }) => (
                  <li key={post.id} className="rounded-xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {autor}{" "}
                        <span className="text-[11px] font-medium uppercase text-slate-400">{rol}</span>
                      </p>
                      <span className="text-[11px] text-slate-400">{formatoFechaHora(post.createdAt)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{post.contenido}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* MATERIAL */}
          <section className="tarjeta p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">📚 Formatos y material logístico</h2>

            {esDocente ? (
              <details className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-inst-700">
                  + Agregar material
                </summary>
                <form action={crearMaterialAction} className="mt-4 space-y-3">
                  <input type="hidden" name="courseId" value={courseId} />
                  <input name="titulo" required className="campo" placeholder="Kardex, layout, orden de compra..." />
                  <input name="descripcion" className="campo" placeholder="Descripción breve" />
                  <select name="tipo" className="campo" defaultValue="apunte">
                    <option value="apunte">Apunte</option>
                    <option value="enlace">Enlace</option>
                    <option value="video">Video</option>
                    <option value="practica">Práctica</option>
                    <option value="lectura">Lectura</option>
                  </select>
                  <input name="url" className="campo" placeholder="https://..." />
                  <BotonEnviar className="btn-primario w-full" pendienteTexto="Guardando...">
                    Guardar material
                  </BotonEnviar>
                </form>
              </details>
            ) : null}

            {listaMateriales.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                Sin material publicado.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {listaMateriales.map((material) => (
                  <li key={material.id} className="rounded-xl border border-slate-200 px-3.5 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{material.titulo}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">{material.tipo}</p>
                        {material.descripcion ? (
                          <p className="mt-1 text-xs text-slate-600">{material.descripcion}</p>
                        ) : null}
                        {material.url ? (
                          <a
                            href={material.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-xs font-semibold text-inst-700 hover:underline"
                          >
                            Abrir recurso →
                          </a>
                        ) : null}
                      </div>
                      {esDocente ? (
                        <form action={eliminarMaterialAction}>
                          <input type="hidden" name="courseId" value={courseId} />
                          <input type="hidden" name="materialId" value={material.id} />
                          <BotonEnviar className="text-xs font-semibold text-rose-600" pendienteTexto="...">
                            ✕
                          </BotonEnviar>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* LISTA */}
          <section className="tarjeta p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">👥 Lista del grupo</h2>
            {alumnos.length === 0 ? (
              <p className="text-sm text-slate-500">Sin alumnos inscritos.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {alumnos.map((alumno, i) => (
                  <li key={alumno.id} className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-700">
                      <span className="mr-2 text-xs text-slate-400">{i + 1}.</span>
                      {alumno.nombre}
                    </span>
                    {esDocente ? (
                      <span className="text-[11px] text-slate-400">{alumno.matricula ?? alumno.email}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
