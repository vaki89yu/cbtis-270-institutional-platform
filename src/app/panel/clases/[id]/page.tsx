import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, users } from "@/db/schema";
import { BotonEnviar } from "@/components/form-estado";
import { Icono } from "@/components/iconos";
import {
  ETIQUETA_EVIDENCIA,
  actividadPorClave,
  actividadesDelModulo,
  type TipoEvidencia,
} from "@/lib/academico/actividades";
import {
  actividadesDelAlumnoEnAula,
  actividadesDelAula,
  alumnosDelAula,
  asistenciasDeSesion,
  historialPasesDeLista,
  paseDeListaAbierto,
  promedioDelAlumno,
  sincronizarGrupoDelAula,
} from "@/lib/academico/aula";
import {
  abrirPaseDeListaAction,
  activarActividadAction,
  ajustarAsistenciaAction,
  calificarEvidenciaAction,
  cerrarPaseDeListaAction,
  desactivarActividadAction,
  entregarEvidenciaAction,
  marcarMiAsistenciaAction,
  sincronizarGrupoAction,
} from "@/lib/actions/aula";
import { alternarAccesoFormatoAction } from "@/lib/actions/formatos-acceso";
import { listarHabilitaciones } from "@/lib/formatos/acceso";
import { FORMATOS_DINAMICOS, NOMBRE_MODULO } from "@/lib/formatos/catalogo";
import { PLANTILLAS_EXCEL } from "@/lib/formatos/plantillas";
import { formatoFechaHora, requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const COLOR_ESTADO: Record<string, string> = {
  presente: "bg-emerald-100 text-emerald-800",
  retardo: "bg-amber-100 text-amber-800",
  falta: "bg-rose-100 text-rose-800",
  justificado: "bg-sky-100 text-sky-800",
};

export default async function AulaPage({ params }: Props) {
  const { id } = await params;
  const courseId = Number(id);
  if (!Number.isFinite(courseId)) notFound();

  const user = await requireUser();

  const [fila] = await db
    .select({ curso: courses, docente: users.nombre })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.docenteId))
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!fila) notFound();
  const { curso, docente } = fila;

  const esDocente = user.rol === "admin" || curso.docenteId === user.id;

  // La lista del grupo se arma sola con los registros de los alumnos
  if (esDocente) await sincronizarGrupoDelAula(courseId);

  const alumnos = await alumnosDelAula(courseId);
  const esAlumnoDelAula = alumnos.some((a) => a.id === user.id);
  if (!esDocente && !esAlumnoDelAula) {
    return (
      <div className="space-y-6">
        <Link href="/panel/clases" className="btn-mini">
          ← Mis aulas
        </Link>
        <div className="tarjeta p-10 text-center">
          <Icono nombre="candado" tamano={36} className="mx-auto text-slate-400" />
          <h1 className="mt-3 text-lg font-black text-slate-900">Esta aula no es tuya</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            El aula {curso.aula ?? curso.clave} es de {curso.semestre}° {curso.grupo} con el Prof.{" "}
            {docente}. Sólo aparece para los alumnos de ese semestre y grupo que lo eligieron como
            docente en su registro.
          </p>
        </div>
      </div>
    );
  }

  const sesionAbierta = await paseDeListaAbierto(courseId);
  const registros = sesionAbierta ? await asistenciasDeSesion(sesionAbierta.id) : [];
  const mapaRegistros = new Map(registros.map((r) => [r.asistencia.studentId, r.asistencia]));
  const miRegistro = sesionAbierta ? mapaRegistros.get(user.id) ?? null : null;

  const habilitaciones = await listarHabilitaciones();
  const clavesDelAula = new Set(
    habilitaciones
      .filter((h) => h.docenteId === curso.docenteId && h.semestre === curso.semestre && h.grupo === curso.grupo)
      .map((h) => h.codigo),
  );

  const moduloAula = curso.modulo ?? null;
  const formatosModulo = moduloAula
    ? FORMATOS_DINAMICOS.filter((f) => f.modulo === moduloAula)
    : FORMATOS_DINAMICOS;
  const plantillasModulo = moduloAula
    ? PLANTILLAS_EXCEL.filter((p) => p.modulo === moduloAula)
    : PLANTILLAS_EXCEL;

  const precargadas = actividadesDelModulo(moduloAula);

  return (
    <div className="space-y-6">
      <Link href="/panel/clases" className="btn-mini">
        ← Mis aulas
      </Link>

      {/* Encabezado del aula */}
      <header className="tarjeta overflow-hidden">
        <div className="h-2" style={{ backgroundColor: curso.color }} />
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {curso.clave} · {curso.turno}
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">
              {curso.aula ? `${curso.aula} · ` : ""}
              {curso.nombre}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {curso.semestre}° {curso.grupo}
              {moduloAula ? ` · Módulo ${moduloAula}: ${NOMBRE_MODULO[moduloAula]}` : ""} · Prof.{" "}
              {docente}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-inst-50 px-3 py-1 text-xs font-bold text-inst-700">
              {alumnos.length} alumnos en lista
            </span>
            {sesionAbierta ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                Pase de lista abierto
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* ---------------------------- PASE DE LISTA ---------------------------- */}
      <section className="tarjeta p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Icono nombre="asistencias" tamano={20} className="text-inst-700" />
          Pase de lista
        </h2>

        {esDocente ? (
          sesionAbierta ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-800">
                  Abierto desde {formatoFechaHora(sesionAbierta.fecha)}
                  {sesionAbierta.tema ? ` · ${sesionAbierta.tema}` : ""} · tolerancia{" "}
                  {sesionAbierta.toleranciaMin} min
                </p>
                <form action={cerrarPaseDeListaAction}>
                  <input type="hidden" name="courseId" value={courseId} />
                  <input type="hidden" name="sessionId" value={sesionAbierta.id} />
                  <BotonEnviar className="btn-secundario px-4 py-2 text-xs" pendienteTexto="Cerrando...">
                    Cerrar lista y marcar faltas
                  </BotonEnviar>
                </form>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {alumnos.map((a) => {
                  const reg = mapaRegistros.get(a.id);
                  return (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{a.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {a.matricula ?? "sin matrícula"}
                          {reg?.origen === "alumno" ? " · se registró solo" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            reg ? COLOR_ESTADO[reg.estado] : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {reg ? reg.estado : "sin registrar"}
                        </span>
                        {["presente", "retardo", "falta", "justificado"].map((estado) => (
                          <form key={estado} action={ajustarAsistenciaAction}>
                            <input type="hidden" name="courseId" value={courseId} />
                            <input type="hidden" name="sessionId" value={sesionAbierta.id} />
                            <input type="hidden" name="studentId" value={a.id} />
                            <input type="hidden" name="estado" value={estado} />
                            <BotonEnviar
                              className="rounded-md border border-slate-300 px-1.5 py-1 text-[10px] font-bold uppercase text-slate-600"
                              pendienteTexto="..."
                            >
                              {estado.slice(0, 1)}
                            </BotonEnviar>
                          </form>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {alumnos.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-500">
                    Todavía no hay alumnos que te hayan elegido como docente en {curso.semestre}°{" "}
                    {curso.grupo}.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <form action={abrirPaseDeListaAction} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="courseId" value={courseId} />
              <label className="text-xs font-bold text-slate-600">
                Tema de la clase de hoy
                <input
                  name="tema"
                  className="campo mt-1 w-72"
                  placeholder="Control de inventarios: conteo cíclico"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Tolerancia
                <select name="tolerancia" defaultValue="10" className="campo mt-1 w-28">
                  {[5, 10, 15, 20].map((t) => (
                    <option key={t} value={t}>
                      {t} min
                    </option>
                  ))}
                </select>
              </label>
              <BotonEnviar className="btn-primario px-5 py-2.5 text-sm" pendienteTexto="Abriendo...">
                Abrir pase de lista
              </BotonEnviar>
            </form>
          )
        ) : sesionAbierta ? (
          miRegistro ? (
            <div className="mt-4 rounded-xl bg-emerald-50 p-5 text-center">
              <Icono nombre="verificado" tamano={30} className="mx-auto text-emerald-700" />
              <p className="mt-2 text-sm font-bold text-emerald-800">
                Tu asistencia quedó registrada como {miRegistro.estado}
              </p>
              <p className="text-xs text-emerald-700">
                Ya le llegó al Prof. {docente}. {formatoFechaHora(miRegistro.createdAt)}
              </p>
            </div>
          ) : (
            <form action={marcarMiAsistenciaAction} className="mt-4 text-center">
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="sessionId" value={sesionAbierta.id} />
              <p className="text-sm text-slate-600">
                El Prof. {docente} abrió el pase de lista
                {sesionAbierta.tema ? ` · ${sesionAbierta.tema}` : ""}. Tienes{" "}
                {sesionAbierta.toleranciaMin} minutos de tolerancia.
              </p>
              <BotonEnviar className="btn-primario mt-3 px-6 py-3 text-base" pendienteTexto="Registrando...">
                Registrar mi asistencia
              </BotonEnviar>
            </form>
          )
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            El pase de lista está cerrado. Aparecerá aquí cuando tu docente lo abra en clase.
          </p>
        )}

        {esDocente ? <HistorialAsistencia courseId={courseId} /> : null}
      </section>

      {/* ---------------------------- ACTIVIDADES ---------------------------- */}
      {esDocente ? (
        <ActividadesDocente courseId={courseId} modulo={moduloAula} precargadas={precargadas} />
      ) : (
        <ActividadesAlumno courseId={courseId} studentId={user.id} />
      )}

      {/* ----------------------------- FORMATOS ----------------------------- */}
      <section className="tarjeta p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Icono nombre="formatos" tamano={20} className="text-inst-700" />
          Formatos del aula
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {esDocente
            ? `Al activarlos aquí quedan disponibles para ${curso.semestre}° ${curso.grupo}.`
            : "Formatos que tu docente activó para esta clase."}
        </p>

        <div className="mt-4 space-y-2">
          {[...formatosModulo.map((f) => ({ codigo: f.codigo, titulo: f.titulo, tipo: "llenable" as const, url: `/panel/formatos/${f.codigo}` })),
            ...plantillasModulo.map((p) => ({ codigo: p.codigo, titulo: p.titulo, tipo: "plantilla" as const, url: p.url }))]
            .filter((f) => esDocente || clavesDelAula.has(f.codigo))
            .map((f) => {
              const activo = clavesDelAula.has(f.codigo);
              return (
                <div
                  key={f.codigo}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">
                      {f.codigo}
                    </span>
                    <p className="truncate text-sm font-semibold text-slate-800">{f.titulo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {esDocente ? (
                      <form action={alternarAccesoFormatoAction}>
                        <input type="hidden" name="codigo" value={f.codigo} />
                        <input type="hidden" name="tipo" value={f.tipo} />
                        <input type="hidden" name="modulo" value={moduloAula ?? 1} />
                        <input type="hidden" name="habilitar" value={activo ? "0" : "1"} />
                        <BotonEnviar
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                            activo
                              ? "bg-emerald-100 text-emerald-800"
                              : "border border-slate-300 bg-slate-100 text-slate-600"
                          }`}
                          pendienteTexto="..."
                        >
                          {activo ? "Activo para el grupo" : "Activar"}
                        </BotonEnviar>
                      </form>
                    ) : null}
                    <Link href={f.url} className="btn-mini">
                      {f.tipo === "llenable" ? "Abrir" : "Descargar"}
                    </Link>
                  </div>
                </div>
              );
            })}
          {!esDocente && clavesDelAula.size === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Tu docente aún no activa formatos para esta clase.
            </p>
          ) : null}
        </div>
      </section>

      {/* --------------------------- LISTA DEL GRUPO --------------------------- */}
      {esDocente ? (
        <section className="tarjeta p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Icono nombre="usuarios" tamano={20} className="text-inst-700" />
              Lista del grupo ({alumnos.length})
            </h2>
            <form action={sincronizarGrupoAction}>
              <input type="hidden" name="courseId" value={courseId} />
              <BotonEnviar className="btn-mini" pendienteTexto="Actualizando...">
                Actualizar lista
              </BotonEnviar>
            </form>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Se llena sola con los alumnos que te eligieron como docente y cursan {curso.semestre}°{" "}
            {curso.grupo}.
          </p>
          <div className="mt-4 divide-y divide-slate-100">
            {alumnos.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{a.nombre}</p>
                  <p className="text-xs text-slate-500">{a.email}</p>
                </div>
                <Link href={`/panel/expedientes/${a.id}`} className="btn-mini">
                  Expediente
                </Link>
              </div>
            ))}
            {alumnos.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Aún no hay alumnos registrados contigo en {curso.semestre}° {curso.grupo}.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------ Subcomponentes ------------------------------ */

async function HistorialAsistencia({ courseId }: { courseId: number }) {
  const historial = await historialPasesDeLista(courseId);
  if (historial.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold text-slate-700">Clases anteriores</h3>
      <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {historial.map(({ sesion, presentes, retardos, faltas }) => (
          <div key={sesion.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
            <span className="font-semibold text-slate-700">
              {formatoFechaHora(sesion.fecha)}
              {sesion.tema ? ` · ${sesion.tema}` : ""}
            </span>
            <span className="flex gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                {presentes} presentes
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                {retardos} retardos
              </span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-800">
                {faltas} faltas
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

async function ActividadesDocente({
  courseId,
  modulo,
  precargadas,
}: {
  courseId: number;
  modulo: number | null;
  precargadas: ReturnType<typeof actividadesDelModulo>;
}) {
  const activas = await actividadesDelAula(courseId);
  const porOrigen = new Map(activas.filter((a) => a.tarea.origen).map((a) => [a.tarea.origen!, a]));

  return (
    <section className="tarjeta p-6">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
        <Icono nombre="evidencias" tamano={20} className="text-inst-700" />
        Actividades del plan de estudios
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {modulo
          ? `Ya vienen cargadas las del Módulo ${modulo}. Actívalas cuando toque verlas en clase.`
          : "Asigna un módulo al aula para ver sus actividades precargadas."}
      </p>

      <div className="mt-4 space-y-3">
        {precargadas.map((act) => {
          const fila = porOrigen.get(act.clave);
          const activa = fila?.tarea.activa ?? false;
          return (
            <div key={act.clave} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-inst-50 px-2 py-0.5 text-[10px] font-black text-inst-700">
                      {act.parcial}° parcial
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {ETIQUETA_EVIDENCIA[act.evidencia as TipoEvidencia]}
                    </span>
                    {act.formatoCodigo ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Usa {act.formatoCodigo}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900">{act.titulo}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{act.instrucciones}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{act.submodulo}</p>
                  {fila ? (
                    <p className="mt-2 text-[11px] font-bold text-inst-700">
                      {fila.entregas} entregas · {fila.porCalificar} por calificar ·{" "}
                      <Link href={`/panel/tareas/${fila.tarea.id}`} className="underline">
                        revisar y calificar
                      </Link>
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0">
                  {activa ? (
                    <form action={desactivarActividadAction}>
                      <input type="hidden" name="courseId" value={courseId} />
                      <input type="hidden" name="assignmentId" value={fila!.tarea.id} />
                      <BotonEnviar
                        className="rounded-lg bg-emerald-100 px-3 py-1.5 text-[11px] font-bold text-emerald-800"
                        pendienteTexto="..."
                      >
                        Activa · ocultar
                      </BotonEnviar>
                    </form>
                  ) : (
                    <form action={activarActividadAction}>
                      <input type="hidden" name="courseId" value={courseId} />
                      <input type="hidden" name="clave" value={act.clave} />
                      <BotonEnviar className="btn-primario px-3 py-1.5 text-[11px]" pendienteTexto="...">
                        Activar para el grupo
                      </BotonEnviar>
                    </form>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {precargadas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Edita el aula y asígnale un módulo para cargar sus actividades.
          </p>
        ) : null}
      </div>
    </section>
  );
}

async function ActividadesAlumno({ courseId, studentId }: { courseId: number; studentId: number }) {
  const actividades = await actividadesDelAlumnoEnAula(courseId, studentId);
  const promedio = await promedioDelAlumno(courseId, studentId);

  return (
    <section className="tarjeta p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Icono nombre="evidencias" tamano={20} className="text-inst-700" />
          Actividades de la clase
        </h2>
        {promedio !== null ? (
          <span className="rounded-full bg-inst-50 px-3 py-1 text-xs font-bold text-inst-700">
            Tu promedio: {promedio}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {actividades.map(({ tarea, entrega }) => {
          const plantilla = tarea.origen ? actividadPorClave(tarea.origen) : null;
          return (
            <div key={tarea.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-inst-50 px-2 py-0.5 text-[10px] font-black text-inst-700">
                  {tarea.parcial}° parcial
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {ETIQUETA_EVIDENCIA[(tarea.evidencia ?? "documento") as TipoEvidencia]}
                </span>
                {plantilla?.formatoCodigo ? (
                  <Link
                    href={`/panel/formatos/${plantilla.formatoCodigo}`}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800"
                  >
                    Abrir {plantilla.formatoCodigo} →
                  </Link>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-bold text-slate-900">{tarea.titulo}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{tarea.instrucciones}</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-400">
                Entrega: {formatoFechaHora(tarea.fechaEntrega)} · {tarea.puntos} puntos
              </p>

              {entrega?.calificacion !== null && entrega?.calificacion !== undefined ? (
                <div className="mt-3 rounded-lg bg-emerald-50 p-3">
                  <p className="text-sm font-bold text-emerald-800">
                    Calificada: {entrega.calificacion} / {tarea.puntos}
                  </p>
                  {entrega.retroalimentacion ? (
                    <p className="mt-1 text-xs text-emerald-700">{entrega.retroalimentacion}</p>
                  ) : null}
                </div>
              ) : (
                <form action={entregarEvidenciaAction} className="mt-3 space-y-2">
                  <input type="hidden" name="courseId" value={courseId} />
                  <input type="hidden" name="assignmentId" value={tarea.id} />
                  <textarea
                    name="contenido"
                    rows={2}
                    defaultValue={entrega?.contenido ?? ""}
                    className="campo text-sm"
                    placeholder="Describe tu evidencia o pega aquí tu respuesta"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      name="url"
                      defaultValue={entrega?.url ?? ""}
                      className="campo flex-1 text-sm"
                      placeholder="Enlace a tu archivo (Drive, PDF, foto)"
                    />
                    <BotonEnviar className="btn-primario px-4 py-2 text-xs" pendienteTexto="Enviando...">
                      {entrega ? "Actualizar entrega" : "Entregar evidencia"}
                    </BotonEnviar>
                  </div>
                  {entrega ? (
                    <p className="text-[11px] font-semibold text-emerald-700">
                      Entregada el {formatoFechaHora(entrega.entregadoEn)} · puedes reemplazarla
                      mientras no la califiquen.
                    </p>
                  ) : null}
                </form>
              )}
            </div>
          );
        })}
        {actividades.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Tu docente aún no activa actividades en esta aula.
          </p>
        ) : null}
      </div>
    </section>
  );
}
