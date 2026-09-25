import type { SVGProps } from "react";

/**
 * Sistema de iconografía institucional.
 *
 * Sustituye a los emojis del sistema operativo por pictogramas vectoriales de
 * trazo, coherentes con una plataforma de educación media superior y con la
 * identidad de la carrera técnica en Logística. Todos comparten rejilla 24x24,
 * trazo de 1.75 y heredan el color del texto (`currentColor`), de modo que
 * funcionan igual sobre el tema cristal que sobre fondo claro o impreso.
 */

export type NombreIcono =
  | "inicio"
  | "aulas"
  | "asistencias"
  | "evidencias"
  | "almacen"
  | "formatos"
  | "expedientes"
  | "notificaciones"
  | "mensajes"
  | "usuarios"
  | "avisos"
  | "alerta"
  | "informacion"
  | "urgente"
  | "chaleco"
  | "calzado"
  | "casco"
  | "guantes"
  | "verificado"
  | "check"
  | "cerrar"
  | "reloj"
  | "correo"
  | "candado"
  | "video"
  | "conversacion"
  | "imprimir"
  | "insignia"
  | "punto";

type TrazoProps = SVGProps<SVGSVGElement> & {
  nombre: NombreIcono;
  /** Tamaño en píxeles del lado del icono. Por defecto 20. */
  tamano?: number;
};

const TRAZOS: Record<NombreIcono, React.ReactNode> = {
  // Navegación del panel
  inicio: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  aulas: (
    <>
      <path d="M21 8.5 12 3 3 8.5v7L12 21l9-5.5v-7Z" />
      <path d="m3 8.5 9 5.5 9-5.5" />
      <path d="M12 14v7" />
      <path d="m7.5 5.8 9 5.4" />
    </>
  ),
  asistencias: (
    <>
      <rect x="4" y="4" width="16" height="17" rx="2" />
      <path d="M9 4V2.8h6V4" />
      <path d="m8.5 11.5 2 2 4.5-4.5" />
      <path d="M8.5 17.5h7" />
    </>
  ),
  evidencias: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>
  ),
  almacen: (
    <>
      <path d="M3 21V9.5L12 5l9 4.5V21" />
      <path d="M3 21h18" />
      <rect x="7" y="13" width="4.5" height="8" />
      <rect x="12.5" y="13" width="4.5" height="8" />
    </>
  ),
  formatos: (
    <>
      <path d="M8 2.8h6.5L19 7.3V17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Z" />
      <path d="M14 2.8v5h5" />
      <path d="M3.2 7.5V19a2.5 2.5 0 0 0 2.5 2.5H15" />
      <path d="M9.5 12h6" />
      <path d="M9.5 15.5h4" />
    </>
  ),
  expedientes: (
    <>
      <path d="M3 7.5a2 2 0 0 1 2-2h3.8l2 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z" />
      <path d="M3 11h18" />
      <path d="M12 11v9" />
    </>
  ),
  notificaciones: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" />
      <path d="M13.7 19.5a2 2 0 0 1-3.4 0" />
    </>
  ),
  mensajes: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </>
  ),
  usuarios: (
    <>
      <path d="M16.5 20v-1.8a3.2 3.2 0 0 0-3.2-3.2H6.7a3.2 3.2 0 0 0-3.2 3.2V20" />
      <circle cx="10" cy="8" r="3.2" />
      <path d="M20.5 20v-1.8a3.2 3.2 0 0 0-2.4-3.1" />
      <path d="M15.5 5a3.2 3.2 0 0 1 0 6.2" />
    </>
  ),
  avisos: (
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h2.5l7.5 4.5V6.5L6.5 11H4a1 1 0 0 0-1 1Z" />
      <path d="M18 9.2a4 4 0 0 1 0 5.6" />
      <path d="M20.5 6.8a7.5 7.5 0 0 1 0 10.4" />
    </>
  ),

  // Estados y avisos
  alerta: (
    <>
      <path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 17h.01" />
    </>
  ),
  informacion: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  urgente: (
    <>
      <path d="M5 18v-6a7 7 0 0 1 14 0v6" />
      <path d="M3.5 18h17" />
      <path d="M12 2.5V4" />
      <path d="M20.5 6.5 19.4 7.6" />
      <path d="M3.5 6.5 4.6 7.6" />
      <path d="M9.5 21h5" />
    </>
  ),
  verificado: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  cerrar: (
    <>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.4 2" />
    </>
  ),
  correo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </>
  ),
  candado: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      <path d="M12 14.5v2.5" />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="6" width="13" height="12" rx="2" />
      <path d="m15.5 10.5 6-3.2v9.4l-6-3.2Z" />
    </>
  ),
  conversacion: (
    <>
      <path d="M20.5 12.5a7.5 7.5 0 0 1-10.4 6.9L4 21l1.6-5.1A7.5 7.5 0 1 1 20.5 12.5Z" />
      <path d="M9 11h6" />
      <path d="M9 14.5h4" />
    </>
  ),
  imprimir: (
    <>
      <path d="M6.5 9V3.5h11V9" />
      <rect x="3" y="9" width="18" height="7.5" rx="2" />
      <path d="M6.5 14h11v6.5h-11Z" />
    </>
  ),
  insignia: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="m8.6 14.2-1.3 7 4.7-2.6 4.7 2.6-1.3-7" />
    </>
  ),
  punto: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,

  // Equipo de protección personal (NOM-006-STPS-2014)
  chaleco: (
    <>
      <path d="M8.5 3 5 5v16h14V5l-3.5-2" />
      <path d="M8.5 3 12 9l3.5-6" />
      <path d="M7 12h10" />
      <path d="M7 15.5h10" />
    </>
  ),
  calzado: (
    <>
      <path d="M3 8h4.5l2.2 3.4a4 4 0 0 0 2.6 1.7l5.2.9A3.5 3.5 0 0 1 20.5 17v2h-17V8Z" />
      <path d="M3 15h17.4" />
      <path d="M7.5 8v3.5" />
    </>
  ),
  casco: (
    <>
      <path d="M3.5 17a8.5 8.5 0 0 1 17 0" />
      <path d="M2.5 17h19" />
      <path d="M9 17V6.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6.5V17" />
    </>
  ),
  guantes: (
    <>
      <path d="M6.5 21v-5.5l-1.8-2.6a1.8 1.8 0 0 1 2.7-2.3l1.1 1.1V5.2a1.6 1.6 0 1 1 3.2 0v4.3" />
      <path d="M11.7 9.5V4.6a1.6 1.6 0 1 1 3.2 0v5" />
      <path d="M14.9 9.8V6.4a1.6 1.6 0 1 1 3.2 0V15a6 6 0 0 1-1.2 3.6L15.5 21" />
    </>
  ),
};

/** Iconos que se dibujan con relleno y no con trazo. */
const RELLENOS: NombreIcono[] = ["punto"];

export function Icono({ nombre, tamano = 20, className, ...props }: TrazoProps) {
  const esRelleno = RELLENOS.includes(nombre);

  return (
    <svg
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="none"
      stroke={esRelleno ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {TRAZOS[nombre]}
    </svg>
  );
}

/**
 * Icono dentro de una placa institucional, para encabezados de sección y
 * tarjetas de acceso rápido.
 */
export function IconoPlaca({
  nombre,
  className = "",
  tamano = 20,
}: {
  nombre: NombreIcono;
  className?: string;
  tamano?: number;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/12 p-2 backdrop-blur ${className}`}
    >
      <Icono nombre={nombre} tamano={tamano} />
    </span>
  );
}
