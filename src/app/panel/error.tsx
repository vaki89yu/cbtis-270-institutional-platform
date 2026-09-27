"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Red de seguridad del panel: si una consulta se cae (base dormida, corte de
 * red, etc.) el maestro ve un mensaje claro y un botón para reintentar,
 * nunca una pantalla de error técnica.
 */
export default function ErrorDelPanel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[panel] error de pantalla:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="tarjeta p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
          ⚠️
        </div>
        <h1 className="mt-4 text-xl font-black text-slate-900">No se pudo cargar esta pantalla</h1>
        <p className="mt-2 text-sm text-slate-600">
          Suele ser la conexión con la base de datos, que tarda unos segundos en despertar. Vuelve a
          intentarlo; si sigue igual, avisa a la jefatura de la especialidad.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => reset()} className="btn-primario">
            Reintentar
          </button>
          <Link href="/panel" className="btn-secundario">
            Ir al inicio del panel
          </Link>
        </div>
        {error?.digest ? (
          <p className="mt-4 text-[11px] text-slate-400">Referencia técnica: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
