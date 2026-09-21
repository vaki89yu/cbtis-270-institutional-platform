import Link from "next/link";

export const dynamic = "force-static";

const modulos = [
  ["/panel/clases", "📚", "Aulas"],
  ["/panel/asistencias", "📋", "Asistencias"],
  ["/panel/tareas", "📝", "Evidencias y calificaciones"],
  ["/panel/almacen", "🏭", "Almacén Escuela"],
  ["/panel/formatos", "📑", "Biblioteca de formatos"],
  ["/panel/expedientes", "🗂️", "Expedientes"],
  ["/panel/notificaciones", "🔔", "Notificaciones"],
  ["/panel/mensajes", "✉️", "Mensajes"],
] as const;

export default function InicioPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-inst-700 px-4 py-5 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-200">CBTIS No. 270</p>
            <h1 className="text-2xl font-black">Plataforma Institucional</h1>
            <p className="text-sm text-sky-100">Carrera Técnica en Logística</p>
          </div>
          <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold">✓ Acceso correcto</span>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-emerald-700">Sesión iniciada correctamente</p>
          <h2 className="mt-1 text-3xl font-black text-slate-900">Bienvenido a la plataforma 👋</h2>
          <p className="mt-2 text-slate-600">Selecciona el módulo que deseas utilizar.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modulos.map(([href, icono, titulo]) => (
            <Link key={href} href={href} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg">
              <span className="text-3xl">{icono}</span>
              <h3 className="mt-3 font-bold text-slate-900">{titulo}</h3>
              <p className="mt-2 text-xs font-semibold text-inst-700">Abrir módulo →</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
