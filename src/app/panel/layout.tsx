import type { ReactNode } from "react";
import Link from "next/link";
import { MarcaInstitucional } from "@/components/marca";
import { PanelNav } from "@/components/panel-nav";
import { BotonEnviar } from "@/components/form-estado";
import { logoutAction } from "@/lib/actions/auth";
import { ROL_LABEL, requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const enlaces = [
    { href: "/panel", label: "Inicio", icono: "🏠" },
    { href: "/panel/clases", label: "Aulas", icono: "📦" },
    { href: "/panel/asistencias", label: "Asistencias", icono: "📋" },
    { href: "/panel/tareas", label: "Evidencias y Calificaciones", icono: "📝" },
    { href: "/panel/almacen", label: "Almacén Escuela", icono: "🏭" },
    { href: "/panel/formatos", label: "Biblioteca de Formatos", icono: "📑" },
    { href: "/panel/expedientes", label: user.rol === "estudiante" ? "Mi Expediente" : "Expedientes", icono: "🗂️" },
    { href: "/panel/notificaciones", label: "Notificaciones", icono: "🔔" },
    { href: "/panel/mensajes", label: "Mensajes", icono: "✉️" },
    ...(user.rol === "admin" || user.rol === "docente"
      ? [{ href: "/panel/avisos", label: "Avisos", icono: "📢" }]
      : []),
    ...(user.rol === "admin" ? [{ href: "/panel/usuarios", label: "Usuarios", icono: "👥" }] : []),
  ];

  const iniciales = user.nombre
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="panel-barra sticky top-0 z-40 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <MarcaInstitucional href="/panel" variante="claro" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">{user.nombre}</p>
              <p className="text-xs text-sky-100/80">{ROL_LABEL[user.rol]} · Logística</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-blue-400 text-sm font-bold text-white shadow-md shadow-blue-900/20">
              {iniciales || "US"}
            </div>
            <form action={logoutAction}>
              <BotonEnviar
                className="inline-flex items-center rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                pendienteTexto="Saliendo..."
              >
                Salir
              </BotonEnviar>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-2">
          <PanelNav enlaces={enlaces} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-4 sm:py-8">
        <div className="panel-lienzo rounded-3xl p-4 sm:p-6">
          {children}
        </div>
      </main>

      <footer className="panel-barra border-t py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-sky-100/85">
          <span>CBTIS No. 270 · Plataforma de la Carrera Técnica en Logística</span>
          <Link href="/" className="transition hover:text-white">
            Ver portal público
          </Link>
        </div>
      </footer>
    </div>
  );
}
