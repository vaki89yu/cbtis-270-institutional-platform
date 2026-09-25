import Link from "next/link";
import { Icono, type NombreIcono } from "@/components/iconos";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const modulos: Array<[string, NombreIcono, string, string]> = [
  ["/panel", "inicio", "Panel principal", "Ir al panel institucional"],
  ["/panel/clases", "aulas", "Aulas", "Tus clases y submódulos"],
  ["/panel/asistencias", "asistencias", "Asistencias", "Control de asistencia"],
  ["/panel/tareas", "evidencias", "Evidencias y calificaciones", "Tareas y entregas"],
  ["/panel/almacen", "almacen", "Almacén Escuela", "Prácticas de almacén"],
  ["/panel/formatos", "formatos", "Biblioteca de formatos", "Formatos logísticos"],
  ["/panel/expedientes", "expedientes", "Expedientes", "Tu expediente académico"],
  ["/panel/notificaciones", "notificaciones", "Notificaciones", "Avisos y alertas"],
  ["/panel/mensajes", "mensajes", "Mensajes", "Mensajes internos"],
];

export default async function InicioPage() {
  const user = await getCurrentUser();

  // Si no hay sesión, redirigir a login
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-inst-700 px-4 py-5 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-200">CBTIS No. 270</p>
            <h1 className="text-2xl font-black">Plataforma Institucional</h1>
            <p className="text-sm text-sky-100">Carrera Técnica en Logística</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
              <Icono nombre="verificado" tamano={16} />
              {user.nombre.split(" ")[0]}
            </span>
            <Link href="/panel" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-inst-700 hover:bg-sky-50">
              Entrar al panel →
            </Link>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-emerald-700">Sesión iniciada correctamente como {user.rol}</p>
          <h2 className="mt-1 text-3xl font-black text-slate-900">Bienvenido, {user.nombre.split(" ")[0]}</h2>
          <p className="mt-2 text-slate-600">
            {user.email} · {user.rol === "docente" ? "Docente" : user.rol === "admin" ? "Administración" : "Estudiante"} · 
            {user.semestre ? ` ${user.semestre}° semestre` : ""} {user.turno ? `· ${user.turno}` : ""}
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/panel" className="btn-primario">
              Ir al panel principal →
            </Link>
            <Link href="/" className="btn-secundario">
              Ver portal público
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modulos.map(([href, icono, titulo, desc]) => (
            <Link key={href} href={href} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-inst-50 text-inst-700">
                <Icono nombre={icono} tamano={22} />
              </span>
              <h3 className="mt-3 font-bold text-slate-900">{titulo}</h3>
              <p className="mt-1 text-xs text-slate-500">{desc}</p>
              <p className="mt-2 text-xs font-semibold text-inst-700">Abrir módulo →</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
