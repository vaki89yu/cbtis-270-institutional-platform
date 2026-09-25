"use client";

import { useFormStatus } from "react-dom";
import { purgarSesionLocal } from "@/components/session-sync";

/**
 * Botón de cierre de sesión.
 *
 * Además de invocar la acción del servidor, borra la copia local de la sesión
 * (localStorage y cookies espejo) en el mismo clic. Sin esa limpieza, el
 * sincronizador volvía a escribir las cookies con el token guardado y el
 * usuario reaparecía dentro de la plataforma al entrar a Iniciar sesión o
 * Registro.
 */
export function BotonSalir() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={() => purgarSesionLocal()}
      className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
    >
      {pending ? "Saliendo..." : "Salir"}
    </button>
  );
}
