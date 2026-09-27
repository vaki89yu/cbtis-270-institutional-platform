"use client";

import { useEffect, useState } from "react";

const CLAVE = "cbtis270_modo_clase";

/**
 * Modo clase: quita fondos, sube el contraste y agranda la letra para cuando
 * la pantalla se está proyectando en el salón.
 */
export function ModoClase() {
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    const guardado = window.localStorage.getItem(CLAVE) === "1";
    setActivo(guardado);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("modo-clase", activo);
    window.localStorage.setItem(CLAVE, activo ? "1" : "0");
  }, [activo]);

  return (
    <button
      type="button"
      onClick={() => setActivo((v) => !v)}
      title="Alto contraste y letra grande para proyectar en el salón"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
        activo ? "bg-slate-900 text-white" : "border border-slate-300 bg-white/80 text-slate-600"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${activo ? "bg-oro-500" : "bg-slate-400"}`} />
      Modo clase
    </button>
  );
}
