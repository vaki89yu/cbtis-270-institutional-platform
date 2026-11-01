import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendances, courses, userActivity } from "@/db/schema";
import { CopiarEnlace } from "@/components/copiar-enlace";
import { BotonEnviar, FormEstado } from "@/components/form-estado";
import { Icono } from "@/components/iconos";
import { riesgoDelAlumno } from "@/lib/academico/riesgo";
import { expedienteCompletoEstudiante } from "@/lib/consultas";
import { formatoFecha, formatoFechaHora, requireUser } from "@/lib/guards";
import { crearEnlaceTutorAction, revocarEnlaceTutorAction } from "@/lib/actions/tutores";
import { COOKIE_ENLACE_TUTOR, ETIQUETAS_TUTOR, estadoEnlace, listarEnlacesDelAlumno } from "@/lib/tutores";

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

  const riesgo = await riesgoDelAlumno(studentId);

  // Enlaces de consulta para tutores: sólo los gestiona docente o dirección.
  const esGestor = user.rol !== "estudiante";
  const enlacesTutor = esGestor ? await listarEnlacesDelAlumno(studentId) : [];

  let enlaceNuevo: string | null = null;
  if (esGestor) {
    const jar = await cookies();
    const flash = jar.get(COOKIE_ENLACE_TUTOR)?.value;
    if (flash) {
      const [token, idDelFlash] = flash.split("|");
      if (token && Number(idDelFlash) === studentId) {
        const cabeceras = await headers();
        const host = cabeceras.get("x-forwarded-host") ?? cabeceras.get("host") ?? "localhost:3000";
        const protocolo = cabeceras.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
        enlaceNuevo = `${protocolo}://${host}/consulta/${token}`;
      }
    }
  }

  // Sin base de datos (preview) la ficha se arma con lo que haya en el almacén demo.
  let ultimasAsistencias: Array<{ id: number; fecha: Date; estado: string; curso: string | null }> = [];
  let bitacora: Array<typeof userActivity.$inferSelect> = [];
  try {
    ultimasAsistencias = await db
      .select({ id: attendances.id, fecha: attendances.fecha, estado: attendances.estado, curso: courses.nombre })
      .from(attendances)
      .leftJoin(courses, eq(courses.id, attendances.courseId))
      .where(eq(attendances.studentId, studentId))
      .orderBy(desc(attendances.fecha))
      .limit(10);

    // Línea de tiempo: todo lo que le ha pasado al alumno, en orden
    bitacora = await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, studentId))
      .orderBy(desc(userActivity.createdAt))
      .limit(12);
  } catch {
    // La ficha sigue mostrando identidad y enlace de tutores.
  }

  type Hito = { fecha: Date; titulo: string; detalle: string; color: string };
  const hitos: Hito[] = [
    {
      fecha: new Date(alumno.createdAt),
      titulo: "Se registró en la plataforma",
      detalle: tutor ? `Eligió al Prof. ${tutor.nombre} como docente encargado` : "Sin docente encargado",
      color: "bg-inst-100 text-inst-800",
    },
    ...ultimasAsistencias.map((a) => ({
      fecha: new Date(a.fecha),
      titulo:
        a.estado === "presente"
          ? "Asistió a clase"
          : a.estado === "retardo"
            ? "Llegó con retardo"
            : a.estado === "justificado"
              ? "Falta justificada"
              : "Faltó a clase",
      detalle: a.curso ?? "",
      color:
        a.estado === "falta"
          ? "bg-rose-100 text-rose-800"
          : a.estado === "retardo"
            ? "bg-amber-100 text-amber-800"
            : "bg-emerald-100 text-emerald-800",
    })),
    ...tareas
      .filter((t) => t.entrega)
      .slice(0, 10)
      .map((t) => ({
        fecha: new Date(t.entrega!.entregadoEn),
        titulo:
          t.entrega!.calificacion != null
            ? `Evidencia calificada: ${t.entrega!.calificacion}/${t.tarea.puntos}`
            : "Entregó una evidencia",
        detalle: t.tarea.titulo,
        color: t.entrega!.calificacion != null ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-700",
      })),
    ...bitacora.map((b) => ({
      fecha: new Date(b.createdAt),
      titulo: b.accion === "inicio_sesion" ? "Entró a la plataforma" : b.accion,
      detalle: b.detalle ?? "",
      color: "bg-slate-100 text-slate-600",
    })),
  ]
    .filter((h) => !Number.isNaN(h.fecha.getTime()))
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    .slice(0, 18);
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

      {/* Documentos oficiales en PDF */}
      {esGestor || user.id === studentId ? (
        <section className="tarjeta p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Icono nombre="imprimir" tamano={20} className="text-inst-700" />
                Documentos del alumno
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                PDF listos para imprimir o entregar en ventanilla. Cada descarga queda registrada en
                la bitácora con su folio.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/constancias/constancia/${studentId}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primario px-4 py-2 text-xs"
              >
                Constancia de estudios
              </a>
              <a
                href={`/api/constancias/kardex/${studentId}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secundario px-4 py-2 text-xs"
              >
                Kardex académico
              </a>
            </div>
          </div>
        </section>
      ) : null}

      {/* Faltas con justificante descargable */}
      {(() => {
        const faltas = ultimasAsistencias.filter((a) => a.estado === "falta" || a.estado === "justificado");
        if (faltas.length === 0) return null;
        return (
          <section className="tarjeta p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Icono nombre="reloj" tamano={20} className="text-inst-700" />
                  Faltas recientes
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Descarga el justificante de inasistencia para presentarlo en control escolar o
                  enviarlo a la familia. Queda registrado en la bitácora.
                </p>
              </div>
            </div>
            <ul className="mt-3 divide-y divide-slate-100">
              {faltas.slice(0, 6).map((falta) => (
                <li key={falta.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0 text-xs text-slate-600">
                    <span className="block text-sm font-bold text-slate-800">
                      {falta.curso ?? "Asignatura sin nombre"}
                    </span>
                    {formatoFecha(falta.fecha)} ·{" "}
                    <span
                      className={
                        falta.estado === "justificado" ? "font-bold text-sky-700" : "font-bold text-rose-700"
                      }
                    >
                      {falta.estado === "justificado" ? "Falta justificada" : "Falta"}
                    </span>
                  </span>
                  <a
                    href={`/api/justificantes/${falta.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-mini shrink-0"
                  >
                    Justificante PDF
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {/* Enlaces de consulta para tutores */}
      {esGestor ? (
        <section className="tarjeta p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Icono nombre="correo" tamano={20} className="text-inst-700" />
                Enlace de consulta para tutores
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Genera una liga personal para la madre, el padre o el tutor legal. No necesita
                cuenta y sólo puede ver asistencia, promedio, pendientes y alertas de este alumno.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
              {enlacesTutor.length} enlace(s)
            </span>
          </div>

          {enlaceNuevo ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-800">
                Cópialo ahora: no se vuelve a mostrar
              </p>
              <p className="mt-1 text-xs text-emerald-900">
                En la base de datos sólo se guarda el hash del token. Si se pierde, hay que revocarlo
                y generar otro.
              </p>
              <CopiarEnlace url={enlaceNuevo} />
            </div>
          ) : null}

          <FormEstado
            action={crearEnlaceTutorAction}
            submitLabel="Generar enlace"
            pendienteTexto="Generando…"
            botonClase="btn-primario"
            className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr] sm:items-end"
          >
            <input type="hidden" name="studentId" value={studentId} />
            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                Se entrega a
              </span>
              <select name="etiqueta" className="campo" defaultValue="Madre">
                {ETIQUETAS_TUTOR.map((etiqueta) => (
                  <option key={etiqueta} value={etiqueta}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                Vigencia
              </span>
              <select name="dias" className="campo" defaultValue="7">
                <option value="7">7 días</option>
                <option value="15">15 días</option>
                <option value="30">30 días</option>
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                Correo del tutor <span className="font-normal lowercase text-slate-400">(opcional)</span>
              </span>
              <input
                type="email"
                name="emailTutor"
                className="campo"
                placeholder="tutor@correo.com"
                autoComplete="email"
                aria-describedby="ayuda-correo-tutor"
              />
              <span id="ayuda-correo-tutor" className="mt-1 block text-[10px] text-slate-400">
                Si lo capturas, la liga se envía sola por correo (requiere SMTP).
              </span>
            </label>
          </FormEstado>

          {enlacesTutor.length > 0 ? (
            <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4">
              {enlacesTutor.map((enlace) => {
                const estado = estadoEnlace(enlace);
                return (
                  <li
                    key={enlace.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <div className="min-w-0 text-xs text-slate-600">
                      <p className="font-bold text-slate-800">
                        {enlace.etiqueta}
                        <span className="ml-2 font-mono text-[10px] text-slate-400">
                          …{enlace.tokenPista}
                        </span>
                      </p>
                      <p className="mt-0.5">
                        Creado {formatoFechaHora(enlace.createdAt)} por{" "}
                        {enlace.creadoPorNombre ?? "el plantel"} · vence {formatoFechaHora(enlace.expiraEn)}
                      </p>
                      {enlace.tutorEmail ? (
                        <p className="mt-0.5 text-slate-400">Enviado a {enlace.tutorEmail}</p>
                      ) : null}
                      <p className="mt-0.5 text-slate-400">
                        {enlace.accesos} consulta(s)
                        {enlace.ultimoAccesoEn
                          ? ` · última ${formatoFechaHora(enlace.ultimoAccesoEn)}`
                          : " · sin abrir todavía"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          estado === "activo"
                            ? "bg-emerald-100 text-emerald-800"
                            : estado === "expirado"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {estado}
                      </span>
                      {estado !== "revocado" ? (
                        <form action={revocarEnlaceTutorAction}>
                          <input type="hidden" name="id" value={enlace.id} />
                          <input type="hidden" name="studentId" value={studentId} />
                          <BotonEnviar
                            className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700"
                            pendienteTexto="Revocando…"
                          >
                            Revocar
                          </BotonEnviar>
                        </form>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
              Este alumno todavía no tiene enlaces de consulta.
            </p>
          )}
        </section>
      ) : null}

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

      {/* Semáforo de riesgo */}
      {riesgo && user.rol !== "estudiante" ? (
        <section
          className={`tarjeta border-l-4 p-6 ${
            riesgo.nivel === "alto"
              ? "border-l-rose-500"
              : riesgo.nivel === "medio"
                ? "border-l-amber-500"
                : "border-l-emerald-500"
          }`}
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Icono
              nombre={riesgo.nivel === "ninguno" ? "verificado" : "alerta"}
              tamano={20}
              className={riesgo.nivel === "ninguno" ? "text-emerald-600" : "text-rose-600"}
            />
            Alerta temprana ·{" "}
            {riesgo.nivel === "ninguno" ? "sin focos rojos" : `riesgo ${riesgo.nivel}`}
          </h2>
          {riesgo.motivos.length > 0 ? (
            <p className="mt-1 text-sm font-semibold text-slate-700">{riesgo.motivos.join(" · ")}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Va al corriente en asistencia y entregas.</p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-bold sm:grid-cols-4">
            <span className="rounded-lg bg-slate-100 py-2">
              Asistencia {riesgo.porcentajeAsistencia !== null ? `${riesgo.porcentajeAsistencia}%` : "—"}
            </span>
            <span className="rounded-lg bg-slate-100 py-2">Faltas {riesgo.faltas}</span>
            <span className="rounded-lg bg-slate-100 py-2">Sin entregar {riesgo.sinEntregar}</span>
            <span className="rounded-lg bg-slate-100 py-2">
              Promedio {riesgo.promedio !== null ? Math.round(riesgo.promedio / 10 * 10) / 10 : "—"}
            </span>
          </div>
        </section>
      ) : null}

      {/* Línea de tiempo */}
      <section className="tarjeta p-6">
        <h2 className="text-lg font-bold text-slate-900">Línea de tiempo del alumno</h2>
        <p className="mt-1 text-xs text-slate-500">
          Todo en orden: cuándo se registró, cuándo entró, qué entregó y qué faltó.
        </p>
        <ol className="mt-4 space-y-3 border-l-2 border-slate-100 pl-4">
          {hitos.map((h, i) => (
            <li key={`${h.titulo}-${i}`} className="relative">
              <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300" />
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${h.color}`}>
                  {h.titulo}
                </span>
                <span className="text-[11px] text-slate-400">{formatoFechaHora(h.fecha)}</span>
              </div>
              {h.detalle ? <p className="mt-0.5 text-xs text-slate-600">{h.detalle}</p> : null}
            </li>
          ))}
          {hitos.length === 0 ? (
            <li className="text-xs text-slate-400">Sin movimientos registrados todavía.</li>
          ) : null}
        </ol>
      </section>
    </div>
  );
}
