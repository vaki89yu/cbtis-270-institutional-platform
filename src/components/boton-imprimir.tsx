"use client";

export function BotonImprimir({ texto = "Imprimir o guardar en PDF" }: { texto?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primario px-5 py-2.5 text-sm">
      {texto}
    </button>
  );
}
