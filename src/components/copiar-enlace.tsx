"use client";

import { useState } from "react";

/** Muestra la URL del enlace de tutor con botón de copiar al portapapeles. */
export function CopiarEnlace({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setError(false);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setError(true);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <code className="block break-all rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-emerald-900">
        {url}
      </code>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copiar}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
        >
          {copiado ? "¡Copiado!" : "Copiar enlace"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
        >
          Abrir para revisarlo
        </a>
        {error ? (
          <span className="text-[11px] text-rose-700">
            El navegador no permitió copiar: selecciona la liga y cópiala a mano.
          </span>
        ) : null}
      </div>
    </div>
  );
}
