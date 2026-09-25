"use client";

import { usePathname } from "next/navigation";
import { wallpaperDeRuta } from "@/lib/panel-wallpapers";

/**
 * Wallpaper a pantalla completa de la sección activa.
 *
 * La fotografía de logística real cubre todo el viewport (no una banda
 * recortada): queda fija detrás del contenido y cambia automáticamente según
 * la ruta del panel. Encima lleva un velo azul institucional tenue, suficiente
 * para garantizar la legibilidad del contenido sin ocultar la imagen.
 */
export function FondoSeccionPanel() {
  const pathname = usePathname() ?? "/panel";
  const wp = wallpaperDeRuta(pathname);

  return (
    <div aria-hidden className="panel-fondo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={wp.src} src={wp.src} alt="" className="panel-fondo__img" />
      <div className="panel-fondo__velo" />
    </div>
  );
}

/**
 * Etiqueta de contexto de la sección activa, en texto sobre el wallpaper.
 * Sustituye a la antigua banda fotográfica recortada.
 */
export function EtiquetaSeccion() {
  const pathname = usePathname() ?? "/panel";
  const wp = wallpaperDeRuta(pathname);

  return (
    <p className="etiqueta-seccion">
      <span aria-hidden>{wp.icono}</span>
      <span className="etiqueta-seccion__nombre">{wp.etiqueta}</span>
      <span className="etiqueta-seccion__sep" aria-hidden>
        ·
      </span>
      <span className="etiqueta-seccion__contexto">{wp.contexto}</span>
    </p>
  );
}
