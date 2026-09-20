import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  avisosRecientes,
  catalogoFormatosLogistica,
  clasesDelDocente,
  clasesDelEstudiante,
  estadisticasGenerales,
  practicasAlmacen,
  proximasSesiones,
  resumenAsistenciaEstudiante,
  tareasDelDocente,
  tareasDelEstudiante,
} from "@/lib/consultas";
import { formatoFecha, formatoFechaHora, requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

function Tarjeta({ titulo, valor, pie }: { titulo: string; valor: string | number; pie?: string }) {
  return (
    <div className="tarjeta p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</p>
      <p className="mt-2 text-3xl font-black text-inst-700">{valor}</p>
      {pie ? <p className="mt-1 text-xs text-slate-500">{pie}</p> : null}
    </div>
  );
}

function Seccion({
  titulo,
  accion,
  children,
}: {
  titulo: string;
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="tarjeta p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

function Vacio({ texto }: { texto: string }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
      {texto}
    </p>
  );
}

export default async function PanelPage() {
  const user = await requireUser();
  const avisos = await avisosRecientes(3);

  const saludo = `Hola, ${user.nombre.split(" ")[0]}`;

  if (user.rol === "estudiante") {
    const clases = await clasesDelEstudiante(user.id);
    const tareas = await tareasDelEstudiante(user.id);
    const sesiones = await proximasSesiones(clases.map((c) => c.curso.id));
    const asistencia = await resumenAsistenciaEstudiante(user.id);
    const practicas = await practicasAlmacen();
    const formatos = await catalogoFormatosLogistica();

    const pendientes = tareas.filter((t) => !t.entrega);
    const calificadas = tareas.filter((t) => t.entrega?.calificacion != null);
    const promedio =
      calificadas.length > 0
        ? Math.round(
            calificadas.reduce((acc, t) => acc + (t.entrega?.calificacion ?? 0), 0) /
              calificadas.length,
          )
        : 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{saludo} 👋</h1>
            <p className="text-sm text-slate-500">
              {user.especialidad ?? "Carrera Técnica en Logística"} · {user.semestre ?? 3}° semestre ·{" "}
              {user.turno ?? "Matutino"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/panel/asistencias" className="btn-secundario text-xs">
              📋 Mi Asistencia ({asistencia.porcentaje}%)
            </Link>
            <Link href={`/panel/expedientes/${user.id}`} className="btn-primario text-xs">
              🗂️ Mi Expediente
            </Link>
          </div>
        </div>

        {/* Indicadores Principales */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Tarjeta titulo="Mis Aulas" valor={clases.length} pie="Submódulos activos" />
          <Tarjeta
            titulo="Asistencia"
            valor={`${asistencia.porcentaje}%`}
            pie={asistencia.porcentaje >= 80 ? "Acreditación vigente" : "⚠️ Riesgo de inasistencia"}
          />
          <Tarjeta titulo="Tareas Pendientes" valor={pendientes.length} pie="Por entregar" />
          <Tarjeta titulo="Promedio Parcial" valor={`${promedio}/100`} pie="Actividades evaluadas" />
          <Tarjeta titulo="Formatos Listos" valor={formatos.length} pie="Descarga inmediata" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tareas Próximas */}
          <Seccion
            titulo="Evidencias Próximas por Entregar"
            accion={
              <Link href="/panel/tareas" className="text-sm font-semibold text-inst-700 hover:underline">
                Ver todas ({pendientes.length})
              </Link>
            }
          >
            {pendientes.length === 0 ? (
              <Vacio texto="No tienes tareas pendientes. ¡Excelente trabajo!" />
            ) : (
              <ul className="space-y-3">
                {pendientes.slice(0, 4).map(({ tarea, curso }) => (
                  <li key={tarea.id}>
                    <Link
                      href={`/panel/tareas/${tarea.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-inst-300 hover:bg-inst-50/40"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{tarea.titulo}</span>
                          <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                            {tarea.parcial}° Parcial
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">{curso.nombre}</span>
                      </div>
                      <span className="text-xs font-semibold text-rose-600">
                        {formatoFechaHora(tarea.fechaEntrega)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          {/* Prácticas en Almacén Escuela */}
          <Seccion
            titulo="Prácticas en Almacén Escuela"
            accion={
              <Link href="/panel/almacen" className="text-sm font-semibold text-inst-700 hover:underline">
                Ver agenda
              </Link>
            }
          >
            {practicas.length === 0 ? (
              <Vacio texto="No hay prácticas programadas en el Almacén Escuela esta semana." />
            ) : (
              <ul className="space-y-3">
                {practicas.slice(0, 3).map(({ practica, curso }) => (
                  <li key={practica.id} className="rounded-xl border border-slate-200 px-4 py-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-900">{practica.titulo}</p>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold uppercase text-emerald-800 text-[10px]">
                        {practica.estado}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-500">
                      {curso.nombre} · {formatoFechaHora(practica.fechaPractica)} ({practica.areaAlmacen})
                    </p>
                    <p className="mt-1 text-amber-900 bg-amber-50 rounded-lg p-2 font-semibold">
                      🦺 EPP Obligatorio: {practica.equipoSeguridadObligatorio}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>
        </div>

        {/* Mis Clases */}
        <Seccion
          titulo="Mis Aulas de Logística"
          accion={
            <Link href="/panel/clases" className="text-sm font-semibold text-inst-700 hover:underline">
              Catálogo de Aulas
            </Link>
          }
        >
          {clases.length === 0 ? (
            <Vacio texto="Aún no estás inscrito en ningún submódulo. Ve al catálogo para inscribirte." />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {clases.map(({ curso, docente }) => (
                <Link
                  key={curso.id}
                  href={`/panel/clases/${curso.id}`}
                  className="rounded-2xl border border-slate-200 p-4 transition hover:shadow-md"
                >
                  <span className="block h-1.5 w-12 rounded-full" style={{ backgroundColor: curso.color }} />
                  <p className="mt-3 font-bold text-slate-900">{curso.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {curso.semestre}° {curso.grupo} · Prof. {docente}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Seccion>

        {/* Avisos */}
        <Seccion titulo="Avisos de la Carrera">
          {avisos.length === 0 ? (
            <Vacio texto="Sin avisos por ahora." />
          ) : (
            <ul className="space-y-3">
              {avisos.map(({ aviso }) => (
                <li key={aviso.id} className="rounded-xl border-l-4 border-l-inst-500 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{aviso.titulo}</p>
                  <p className="mt-1 text-xs text-slate-600">{aviso.contenido}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{formatoFecha(aviso.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      </div>
    );
  }

  // VISTA PARA DOCENTES
  if (user.rol === "docente") {
    const clases = await clasesDelDocente(user.id);
    const tareas = await tareasDelDocente(user.id);
    const practicas = await practicasAlmacen(user.id);
    const porCalificar = tareas.reduce((acc, t) => acc + t.porCalificar, 0);
    const alumnos = clases.reduce((acc, c) => acc + c.inscritos, 0);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{saludo} 👋</h1>
            <p className="text-sm text-slate-500">Panel docente · Carrera Técnica en Logística</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/panel/asistencias" className="btn-secundario text-xs">
              📋 Pasar Lista Hoy
            </Link>
            <Link href="/panel/almacen" className="btn-secundario text-xs">
              🏭 Agendar Práctica Almacén
            </Link>
            <Link href="/panel/clases/nueva" className="btn-primario text-xs">
              + Nueva Aula
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Tarjeta titulo="Mis Aulas" valor={clases.length} />
          <Tarjeta titulo="Alumnos" valor={alumnos} pie="Inscritos en total" />
          <Tarjeta titulo="Por Calificar" valor={porCalificar} pie="Entregas sin revisar" />
          <Tarjeta titulo="Prácticas Almacén" valor={practicas.length} pie="Edificio C" />
          <Tarjeta titulo="Actividades" valor={tareas.length} pie="Publicadas en parciales" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Mis grupos */}
          <Seccion
            titulo="Mis Grupos de Logística"
            accion={
              <Link href="/panel/clases" className="text-sm font-semibold text-inst-700 hover:underline">
                Administrar
              </Link>
            }
          >
            {clases.length === 0 ? (
              <Vacio texto="Aún no has creado aulas. Crea la primera para comenzar." />
            ) : (
              <ul className="space-y-3">
                {clases.map(({ curso, inscritos }) => (
                  <li key={curso.id}>
                    <Link
                      href={`/panel/clases/${curso.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-inst-300 hover:bg-inst-50/40"
                    >
                      <span className="flex items-center gap-3">
                        <span className="h-9 w-1.5 rounded-full" style={{ backgroundColor: curso.color }} />
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">{curso.nombre}</span>
                          <span className="text-xs text-slate-500">
                            {curso.clave} · {curso.semestre}° {curso.grupo} · {curso.turno}
                          </span>
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-inst-700">{inscritos} alumnos</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          {/* Entregas por revisar */}
          <Seccion
            titulo="Entregas por Calificar"
            accion={
              <Link href="/panel/tareas" className="text-sm font-semibold text-inst-700 hover:underline">
                Ver todas ({porCalificar})
              </Link>
            }
          >
            {tareas.filter((t) => t.porCalificar > 0).length === 0 ? (
              <Vacio texto="¡Todo al corriente! No hay entregas pendientes de revisión." />
            ) : (
              <ul className="space-y-3">
                {tareas
                  .filter((t) => t.porCalificar > 0)
                  .slice(0, 5)
                  .map(({ tarea, curso, porCalificar: pendientes }) => (
                    <li key={tarea.id}>
                      <Link
                        href={`/panel/tareas/${tarea.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-inst-300 hover:bg-inst-50/40"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800">{tarea.titulo}</span>
                            <span className="text-[10px] font-bold bg-inst-50 px-2 py-0.5 rounded-full text-inst-700">
                              {tarea.parcial}° Parcial
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">{curso.nombre}</span>
                        </div>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          {pendientes} por calificar
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </Seccion>
        </div>

        {/* Agenda de Almacén Escuela */}
        <Seccion
          titulo="Prácticas en Almacén Escuela (Edificio C)"
          accion={
            <Link href="/panel/almacen" className="text-sm font-semibold text-inst-700 hover:underline">
              Gestionar agenda
            </Link>
          }
        >
          {practicas.length === 0 ? (
            <Vacio texto="Aún no agendas prácticas en el Almacén Escuela. Haz clic en 'Agendar Práctica' arriba." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {practicas.map(({ practica, curso }) => (
                <div key={practica.id} className="rounded-xl border border-slate-200 p-4 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900">{practica.titulo}</p>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold uppercase text-emerald-800 text-[10px]">
                      {practica.estado}
                    </span>
                  </div>
                  <p className="text-slate-500">{curso.nombre} · {formatoFechaHora(practica.fechaPractica)}</p>
                  <p className="text-slate-600">Área: {practica.areaAlmacen}</p>
                </div>
              ))}
            </div>
          )}
        </Seccion>
      </div>
    );
  }

  // VISTA PARA ADMINISTRACIÓN / JEFATURA
  const stats = await estadisticasGenerales();
  const ultimosUsuarios = await db
    .select({ id: users.id, nombre: users.nombre, rol: users.rol, createdAt: users.createdAt })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{saludo} 👋</h1>
          <p className="text-sm text-slate-500">Jefatura de la Carrera de Logística · CBTIS 270</p>
        </div>
        <div className="flex gap-2">
          <Link href="/panel/expedientes" className="btn-secundario text-xs">
            🗂️ Expedientes de Alumnos
          </Link>
          <Link href="/panel/avisos" className="btn-secundario text-xs">
            📢 Publicar Aviso
          </Link>
          <Link href="/panel/usuarios" className="btn-primario text-xs">
            👥 Usuarios
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Tarjeta titulo="Alumnos" valor={stats.estudiantes} />
        <Tarjeta titulo="Docentes de Logística" valor={stats.docentes} />
        <Tarjeta titulo="Aulas Activas" valor={stats.clases} />
        <Tarjeta titulo="Entregas Registradas" valor={stats.entregas} />
        <Tarjeta titulo="Por Calificar" valor={stats.pendientes} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion
          titulo="Últimos Registros"
          accion={
            <Link href="/panel/usuarios" className="text-sm font-semibold text-inst-700 hover:underline">
              Ver todos
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100">
            {ultimosUsuarios.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium text-slate-800">{u.nombre}</span>
                <span className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
                    {u.rol}
                  </span>
                  <span className="text-xs text-slate-400">{formatoFecha(u.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion
          titulo="Avisos Publicados"
          accion={
            <Link href="/panel/avisos" className="text-sm font-semibold text-inst-700 hover:underline">
              Administrar
            </Link>
          }
        >
          {avisos.length === 0 ? (
            <Vacio texto="Aún no hay avisos publicados." />
          ) : (
            <ul className="space-y-3">
              {avisos.map(({ aviso }) => (
                <li key={aviso.id} className="rounded-xl border-l-4 border-l-inst-500 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{aviso.titulo}</p>
                  <p className="mt-1 text-xs text-slate-600">{aviso.contenido}</p>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      </div>
    </div>
  );
}
