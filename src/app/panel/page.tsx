import Link from "next/link";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const user = await requireUser();

  const modulos = [
    ["/panel/clases", "📚", "Aulas", "Consulta tus clases y módulos."],
    ["/panel/asistencias", "📋", "Asistencias", "Consulta o administra asistencias."],
    ["/panel/tareas", "📝", "Evidencias y calificaciones", "Tareas, entregas y calificaciones."],
    ["/panel/almacen", "🏭", "Almacén Escuela", "Prácticas y agenda del almacén."],
    ["/panel/formatos", "📑", "Biblioteca de formatos", "Formatos de logística disponibles."],
    ["/panel/expedientes", "🗂️", "Expedientes", "Información académica y expediente."],
    ["/panel/notificaciones", "🔔", "Notificaciones", "Avisos de tu cuenta."],
    ["/panel/mensajes", "✉️", "Mensajes", "Comunicación interna."],
  ];

  if (user.rol === "admin" || user.rol === "docente") {
    modulos.push(["/panel/avisos", "📢", "Avisos", "Publicar y administrar avisos."]);
  }

  if (user.rol === "admin") {
    modulos.push(["/panel/usuarios", "👥", "Usuarios", "Administrar usuarios de la plataforma."]);
  }

  return (
    <div className="space-y-6">
      <section className="tarjeta overflow-hidden">
        <div className="bg-inst-700 p-6 text-white">
          <p className="text-sm font-semibold opacity-90">CBTIS 270 · Plataforma Institucional</p>
          <h1 className="mt-2 text-3xl font-black">Hola, {user.nombre.split(" ")[0]} 👋</h1>
          <p className="mt-2 text-sm opacity-90">
            {user.rol === "admin" ? "Administración" : user.rol === "docente" ? "Docente" : "Estudiante"}
            {user.especialidad ? ` · ${user.especialidad}` : ""}
            {user.semestre ? ` · ${user.semestre}° semestre` : ""}
            {user.turno ? ` · ${user.turno}` : ""}
          </p>
        </div>
        <div className="p-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-800">✓ Sesión iniciada correctamente</p>
            <p className="mt-1 text-sm text-emerald-700">
              Tu acceso funciona correctamente. Selecciona un módulo para continuar.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-black text-slate-900">Módulos de la plataforma</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map(([href, icono, titulo, descripcion]) => (
            <Link
              key={href}
              href={href}
              className="tarjeta p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{icono}</span>
                <div>
                  <h3 className="font-bold text-slate-900">{titulo}</h3>
                  <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
                  <span className="mt-3 inline-block text-xs font-bold text-inst-700">Abrir módulo →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
