import Link from "next/link";
import { Icono, type NombreIcono } from "@/components/iconos";

export const dynamic = "force-dynamic";

const modulos: Array<[string, NombreIcono, string, string]> = [
  ["/panel/clases", "aulas", "Aulas", "Consulta tus clases y módulos."],
  ["/panel/asistencias", "asistencias", "Asistencias", "Consulta o administra asistencias."],
  ["/panel/tareas", "evidencias", "Evidencias y calificaciones", "Tareas, entregas y calificaciones."],
  ["/panel/almacen", "almacen", "Almacén Escuela", "Prácticas y agenda del almacén."],
  ["/panel/formatos", "formatos", "Biblioteca de formatos", "Formatos de logística disponibles."],
  ["/panel/expedientes", "expedientes", "Expedientes", "Información académica y expediente."],
  ["/panel/notificaciones", "notificaciones", "Notificaciones", "Avisos de tu cuenta."],
  ["/panel/mensajes", "mensajes", "Mensajes", "Comunicación interna."],
];

export default function PanelPage() {
  return (
    <div className="space-y-6">
      <section className="tarjeta overflow-hidden">
        <div className="bg-inst-700 p-6 text-white">
          <p className="text-sm font-semibold opacity-90">CBTIS 270 · Plataforma Institucional</p>
          <h1 className="mt-2 text-3xl font-black">Plataforma iniciada</h1>
          <p className="mt-2 text-sm opacity-90">
            Carrera Técnica en Logística · Panel institucional
          </p>
        </div>
        <div className="p-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 font-bold text-emerald-800">
              <Icono nombre="verificado" tamano={18} />
              Acceso correcto
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              El panel principal está disponible. Los módulos se abren desde el menú.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-black text-slate-900">Módulos de la plataforma</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map(([href, icono, titulo, descripcion]) => (
            <Link key={href} href={href} className="tarjeta p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-inst-50 text-inst-700">
                  <Icono nombre={icono} tamano={24} />
                </span>
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
