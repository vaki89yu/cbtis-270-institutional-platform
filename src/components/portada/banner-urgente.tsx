"use client";

import { useEffect, useState } from "react";

type Props = {
  titulo: string;
  mensaje: string;
  nivel: string;
  enlace?: string | null;
  claveVersion: string;
};

const estilos: Record<string, { fondo: string; icono: string; borde: string }> = {
  info: {
    fondo: "from-sky-600/95 to-blue-700/95",
    icono: "ℹ️",
    borde: "border-sky-300/40",
  },
  alerta: {
    fondo: "from-amber-500/95 to-orange-600/95",
    icono: "⚠️",
    borde: "border-amber-200/50",
  },
  urgente: {
    fondo: "from-rose-600/95 to-red-700/95",
    icono: "🚨",
    borde: "border-rose-200/50",
  },
};

export function BannerUrgente({ titulo, mensaje, nivel, enlace, claveVersion }: Props) {
  const [visible, setVisible] = useState(false);
  const storageKey = `cbtis270_banner_cerrado_${claveVersion}`;

  useEffect(() => {
    try {
      setVisible(sessionStorage.getItem(storageKey) !== "1");
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  if (!visible) return null;

  const estilo = estilos[nivel] ?? estilos.info;

  return (
    <div
      role="alert"
      className={`relative z-50 border-b ${estilo.borde} bg-gradient-to-r ${estilo.fondo} text-white shadow-lg backdrop-blur`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 text-sm">
        <span aria-hidden className="text-lg">
          {estilo.icono}
        </span>
        <div className="min-w-0 flex-1">
          <span className="font-bold">{titulo}</span>
          <span className="mx-2 hidden text-white/60 sm:inline">·</span>
          <span className="block text-white/90 sm:inline">{mensaje}</span>
          {enlace ? (
            <a
              href={enlace}
              className="ml-2 inline-block font-semibold underline decoration-white/60 underline-offset-2 hover:decoration-white"
            >
              Más información →
            </a>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={() => {
            try {
              sessionStorage.setItem(storageKey, "1");
            } catch {}
            setVisible(false);
          }}
          className="shrink-0 rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
