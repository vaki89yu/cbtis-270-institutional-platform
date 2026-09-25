/**
 * Wallpapers institucionales de logística real para cada sección del panel.
 * Cada apartado del panel muestra una banda fotográfica de contexto industrial
 * más una marca de agua sutil del mismo entorno en el lienzo de trabajo.
 */

export type WallpaperSeccion = {
  /** Ruta de la imagen dentro de /public */
  src: string;
  /** Etiqueta corta que aparece sobre la fotografía */
  etiqueta: string;
  /** Contexto operativo de la escena mostrada */
  contexto: string;
  /** Ícono representativo del apartado */
  icono: string;
};

/** Fondo principal de toda la plataforma interna */
export const FONDO_PRINCIPAL = "/images/panel/fondo-principal.jpg";

const WALLPAPERS: Array<{ prefijo: string; wallpaper: WallpaperSeccion }> = [
  {
    prefijo: "/panel/clases",
    wallpaper: {
      src: "/images/panel/aulas.jpg",
      etiqueta: "Aulas y Grupos de Logística",
      contexto: "Capacitación técnica en piso de almacén · Formación dual",
      icono: "📦",
    },
  },
  {
    prefijo: "/panel/asistencias",
    wallpaper: {
      src: "/images/panel/asistencias.jpg",
      etiqueta: "Control de Asistencia por Turno",
      contexto: "Registro de entrada en centro de distribución",
      icono: "📋",
    },
  },
  {
    prefijo: "/panel/tareas",
    wallpaper: {
      src: "/images/panel/evidencias.jpg",
      etiqueta: "Evidencias y Calificaciones",
      contexto: "Inspección documental y verificación de embarques",
      icono: "📝",
    },
  },
  {
    prefijo: "/panel/almacen",
    wallpaper: {
      src: "/images/panel/almacen.jpg",
      etiqueta: "Almacén Escuela · Edificio C",
      contexto: "Racks selectivos, estiba y operación de montacargas",
      icono: "🏭",
    },
  },
  {
    prefijo: "/panel/formatos",
    wallpaper: {
      src: "/images/panel/formatos.jpg",
      etiqueta: "Biblioteca de Formatos Logísticos",
      contexto: "Documentación de embarque, kardex y costeo de fletes",
      icono: "📑",
    },
  },
  {
    prefijo: "/panel/expedientes",
    wallpaper: {
      src: "/images/panel/expedientes.jpg",
      etiqueta: "Expedientes Escolares",
      contexto: "Archivo y trazabilidad documental del alumnado",
      icono: "🗂️",
    },
  },
  {
    prefijo: "/panel/notificaciones",
    wallpaper: {
      src: "/images/panel/notificaciones.jpg",
      etiqueta: "Centro de Notificaciones",
      contexto: "Torre de control y monitoreo de flota en turno nocturno",
      icono: "🔔",
    },
  },
  {
    prefijo: "/panel/avisos",
    wallpaper: {
      src: "/images/panel/notificaciones.jpg",
      etiqueta: "Avisos Institucionales",
      contexto: "Comunicación oficial del plantel a la comunidad logística",
      icono: "📢",
    },
  },
  {
    prefijo: "/panel/mensajes",
    wallpaper: {
      src: "/images/panel/mensajes.jpg",
      etiqueta: "Mensajería Interna",
      contexto: "Coordinación de andén entre operación y supervisión",
      icono: "✉️",
    },
  },
  {
    prefijo: "/panel/usuarios",
    wallpaper: {
      src: "/images/panel/asistencias.jpg",
      etiqueta: "Administración de Usuarios",
      contexto: "Altas, roles y control de acceso del personal académico",
      icono: "👥",
    },
  },
];

const WALLPAPER_INICIO: WallpaperSeccion = {
  src: "/images/panel/inicio.jpg",
  etiqueta: "Panel de Control Logístico",
  contexto: "Torre de control de cadena de suministro · CBTIS No. 270",
  icono: "🏠",
};

/** Devuelve el wallpaper correspondiente a la ruta activa del panel. */
export function wallpaperDeRuta(pathname: string): WallpaperSeccion {
  const encontrado = WALLPAPERS.find((w) => pathname.startsWith(w.prefijo));
  return encontrado?.wallpaper ?? WALLPAPER_INICIO;
}
