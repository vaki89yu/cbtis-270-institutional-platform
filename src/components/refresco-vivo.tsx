"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Mantiene la pantalla viva sin que nadie tenga que recargar: mientras el pase
 * de lista está abierto, la lista se va llenando sola.
 */
export function RefrescoVivo({
  segundos = 7,
  etiqueta = "Actualizando en vivo",
}: {
  segundos?: number;
  etiqueta?: string;
}) {
  const router = useRouter();
  const [activo, setActivo] = useState(true);
  const [ultima, setUltima] = useState<Date | null>(null);

  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setUltima(new Date());
      }
    }, segundos * 1000);
    return () => clearInterval(id);
  }, [activo, segundos, router]);

  return (
    <button
      type="button"
      onClick={() => setActivo((v) => !v)}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold transition ${
        activo ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
      }`}
      title={activo ? "Tocar para pausar la actualización automática" : "Tocar para reanudar"}
    >
      <span
        className={`h-2 w-2 rounded-full ${activo ? "animate-pulse bg-emerald-600" : "bg-slate-400"}`}
      />
      {activo ? etiqueta : "Actualización pausada"}
      {activo && ultima ? (
        <span className="font-semibold opacity-70">
          {ultima.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      ) : null}
    </button>
  );
}
