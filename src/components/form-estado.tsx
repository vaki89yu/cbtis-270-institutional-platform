"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Estado = { error?: string; ok?: string };

export function BotonEnviar({
  children,
  className = "btn-primario",
  pendienteTexto = "Guardando...",
}: {
  children: ReactNode;
  className?: string;
  pendienteTexto?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendienteTexto : children}
    </button>
  );
}

export function FormEstado({
  action,
  children,
  submitLabel,
  className = "space-y-4",
  botonClase = "btn-primario w-full",
  pendienteTexto = "Procesando...",
}: {
  action: (estado: Estado, formData: FormData) => Promise<Estado>;
  children: ReactNode;
  submitLabel: string;
  className?: string;
  botonClase?: string;
  pendienteTexto?: string;
}) {
  const [estado, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className={className}>
      {children}
      {estado.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
          {estado.error}
        </p>
      ) : null}
      {estado.ok ? (
        <p className="rounded-xl border border-inst-200 bg-inst-50 px-3.5 py-2.5 text-sm font-medium text-inst-800">
          {estado.ok}
        </p>
      ) : null}
      <BotonEnviar className={botonClase} pendienteTexto={pendienteTexto}>
        {submitLabel}
      </BotonEnviar>
    </form>
  );
}
