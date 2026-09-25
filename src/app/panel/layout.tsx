import type { ReactNode } from "react";
import Link from "next/link";
import { MarcaInstitucional } from "@/components/marca";
import type { NombreIcono } from "@/components/iconos";
import { BotonSalir } from "@/components/boton-salir";
import { PanelNav } from "@/components/panel-nav";
import {
  EtiquetaSeccion,
  FondoSeccionPanel,
} from "@/components/panel-wallpaper";
import { SessionSync } from "@/components/session-sync";
import { requireUser } from "@/lib/guards";
import { logoutAction } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

const enlaces: Array<{ href: string; label: string; icono: NombreIcono }> = [
  { href: "/panel", label: "Inicio", icono: "inicio" },
  { href: "/panel/clases", label: "Aulas", icono: "aulas" },
  { href: "/panel/asistencias", label: "Asistencias", icono: "asistencias" },
  { href: "/panel/tareas", label: "Evidencias y Calificaciones", icono: "evidencias" },
  { href: "/panel/almacen", label: "Almacén Escuela", icono: "almacen" },
  { href: "/panel/formatos", label: "Biblioteca de Formatos", icono: "formatos" },
  { href: "/panel/expedientes", label: "Expedientes", icono: "expedientes" },
  { href: "/panel/notificaciones", label: "Notificaciones", icono: "notificaciones" },
  { href: "/panel/mensajes", label: "Mensajes", icono: "mensajes" },
];

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SessionSync />
      <FondoSeccionPanel />
      <header className="panel-barra sticky top-0 z-40 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <MarcaInstitucional href="/panel" variante="claro" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">{user.nombre}</p>
              <p className="text-xs text-sky-100/80">{user.email} · {user.rol}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-blue-400 text-sm font-bold text-white shadow-md shadow-blue-900/20">
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            <form action={logoutAction}>
              <BotonSalir />
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-2">
          <PanelNav enlaces={enlaces} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-4 sm:py-7">
        <EtiquetaSeccion />
        <div className="panel-lienzo panel-cristal mt-3 rounded-3xl p-4 sm:p-6">
          {children}
        </div>
      </main>

      <footer className="panel-barra border-t py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-sky-100/85">
          <span>CBTIS No. 270 · Plataforma de la Carrera Técnica en Logística · {user.rol}</span>
          <Link href="/" className="transition hover:text-white">Ver portal público</Link>
        </div>
      </footer>
    </div>
  );
}
