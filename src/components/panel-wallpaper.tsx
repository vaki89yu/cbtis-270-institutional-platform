"use client";

import { usePathname } from "next/navigation";
import { FONDO_PRINCIPAL, wallpaperDeRuta } from "@/lib/panel-wallpapers";

/**
 * Fondo principal fijo de toda la plataforma interna: fotografía real de un
 * centro de distribución en operación nocturna, atenuada para no competir con
 * el contenido de trabajo.
 */
export function FondoPrincipalPanel() {
  return (
    <div aria-hidden className="panel-fondo-principal">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={FONDO_PRINCIPAL} alt="" className="panel-fondo-principal__img" />
      <div className="panel-fondo-principal__velo" />
    </div>
  );
}

/**
 * Banda fotográfica de la sección activa. Cambia automáticamente según la ruta
 * del panel (almacén, formatos, expedientes, etc.) y sirve como wallpaper
 * contextual de cada apartado.
 */
export function BandaSeccion() {
  const pathname = usePathname() ?? "/panel";
  const wp = wallpaperDeRuta(pathname);

  return (
    <div className="banda-seccion" key={wp.src + wp.etiqueta}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={wp.src} alt="" aria-hidden className="banda-seccion__img" />
      <div className="banda-seccion__velo" />
      <div className="banda-seccion__contenido">
        <span className="banda-seccion__icono" aria-hidden>
          {wp.icono}
        </span>
        <div className="min-w-0">
          <p className="banda-seccion__titulo">{wp.etiqueta}</p>
          <p className="banda-seccion__contexto">{wp.contexto}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Marca de agua de la sección activa: la misma fotografía a muy baja opacidad
 * detrás del área de trabajo, para dar textura sin restar legibilidad.
 */
export function MarcaAguaSeccion() {
  const pathname = usePathname() ?? "/panel";
  const wp = wallpaperDeRuta(pathname);

  return (
    <div aria-hidden className="marca-agua-seccion">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={wp.src} alt="" className="marca-agua-seccion__img" />
    </div>
  );
}
