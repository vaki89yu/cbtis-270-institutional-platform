import Link from "next/link";
import type { Metadata } from "next";
import { FormEstado } from "@/components/form-estado";
import { Icono } from "@/components/iconos";
import { MarcaInstitucional } from "@/components/marca";
import { recuperarPasswordAction, solicitarOtpAction } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Recuperar contraseña" };
export const dynamic = "force-dynamic";

export default function RecuperarPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <MarcaInstitucional href="/" variante="oscuro" />
      </div>

      <section className="tarjeta p-7">
        <h1 className="text-xl font-black text-slate-900">Recuperar mi contraseña</h1>
        <p className="mt-1 text-sm text-slate-500">
          Te mandamos un código a tu correo y con ese código defines una contraseña nueva. Tu cuenta
          y tus calificaciones no se pierden.
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-inst-700 text-xs font-black text-white">
              1
            </span>
            Pide tu código
          </p>
          <FormEstado
            action={solicitarOtpAction}
            submitLabel="Enviarme el código"
            pendienteTexto="Enviando..."
            botonClase="btn-secundario w-full"
          >
            <input
              name="email"
              type="email"
              required
              className="campo"
              placeholder="tu correo registrado"
            />
          </FormEstado>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-inst-700 text-xs font-black text-white">
              2
            </span>
            Define tu contraseña nueva
          </p>
          <FormEstado
            action={recuperarPasswordAction}
            submitLabel="Cambiar mi contraseña"
            pendienteTexto="Cambiando..."
            botonClase="btn-primario w-full"
          >
            <input name="email" type="email" required className="campo" placeholder="tu correo registrado" />
            <input
              name="codigo"
              required
              inputMode="numeric"
              maxLength={6}
              className="campo text-center font-mono text-lg tracking-[0.3em]"
              placeholder="000000"
            />
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="campo"
              placeholder="contraseña nueva"
            />
            <input
              name="confirmar"
              type="password"
              required
              minLength={6}
              className="campo"
              placeholder="repite la contraseña nueva"
            />
          </FormEstado>
        </div>

        <p className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          <Icono nombre="informacion" tamano={16} className="mt-0.5 shrink-0" />
          Si tu docente cargó tu cuenta desde la lista del grupo, tu contraseña inicial es tu
          matrícula. Cámbiala aquí la primera vez que entres.
        </p>

        <div className="mt-5 flex justify-between text-sm">
          <Link href="/login" className="font-bold text-inst-700 hover:underline">
            ← Volver al acceso
          </Link>
          <Link href="/registro" className="font-bold text-inst-700 hover:underline">
            Crear cuenta
          </Link>
        </div>
      </section>
    </main>
  );
}
