"use client";

import { useActionState, useRef, useState } from "react";
import { continuarConGoogleCorreoAction, type ActionState } from "@/lib/actions/auth";
import {
  CuentasDispositivo,
  guardarCuentaEnDispositivo,
  type CuentaDispositivo,
} from "@/components/cuentas-dispositivo";

export function AccesoGoogle({
  savedAccountServer,
  serverSavedAccounts = [],
}: {
  savedAccountServer?: CuentaDispositivo | null;
  serverSavedAccounts?: CuentaDispositivo[];
}) {
  const [email, setEmail] = useState("");
  const [otpMsg, setOtpMsg] = useState("");
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(true);
  const [codigoDemo, setCodigoDemo] = useState("");
  const otpRef = useRef<HTMLInputElement | null>(null);
  const [estado, action] = useActionState(continuarConGoogleCorreoAction, {} as ActionState);

  function autocompletar(valor: string) {
    setOtpMsg(`Código cargado. Presiona "Continuar con esta cuenta".`);
    if (otpRef.current) {
      otpRef.current.value = valor;
      otpRef.current.focus();
    }
  }

  async function enviarCodigo(correo: string) {
    setOtpError("");
    setOtpMsg("");
    if (!correo.includes("@")) {
      setOtpError("Escribe o elige el correo de tu cuenta.");
      return;
    }
    setLoading(true);
    try {
      guardarCuentaEnDispositivo({ email: correo, nombre: correo.split("@")[0] });
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: correo }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        modo?: string;
        codigo?: string;
      };
      if (!res.ok || !data.ok) {
        setOtpError(data.error ?? "No se pudo generar el código.");
        setCodigoDemo("");
        return;
      }
      if (data.modo === "demo" && data.codigo) {
        setCodigoDemo(data.codigo);
        setOtpMsg("Modo demostración: usa el código que aparece abajo para continuar.");
      } else {
        setCodigoDemo("");
        setOtpMsg(data.message ?? "Código enviado. Revisa tu correo.");
      }
    } catch {
      setOtpError("No se pudo generar el código. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function pedirCodigo() {
    await enviarCodigo(email);
  }

  async function handleSeleccionarDispositivo(emailSeleccionado: string) {
    setEmail(emailSeleccionado);
    setMostrarForm(true);
    await enviarCodigo(emailSeleccionado);
  }

  return (
    <div className="space-y-4">
      <CuentasDispositivo
        savedAccountServer={savedAccountServer}
        serverSavedAccounts={serverSavedAccounts}
        onSeleccionar={handleSeleccionarDispositivo}
        titulo="Cuentas en este dispositivo"
      />

      {mostrarForm ? (
        <form action={action} className="space-y-3">
          <label className="block text-sm font-semibold text-slate-800">
            Correo electrónico
            <input
              name="email"
              type="email"
              required
              autoComplete="email username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              placeholder="tucorreo@gmail.com"
            />
          </label>
          <p className="text-xs text-slate-500">
            Al pulsar enviar código, lo recibirás en tu correo y tu cuenta se guardará en este dispositivo.
          </p>
          <button
            type="button"
            onClick={pedirCodigo}
            disabled={loading}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "Enviando código..." : "Enviar código al correo"}
          </button>
      {otpError ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{otpError}</p> : null}
      {otpMsg ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{otpMsg}</p> : null}
      {codigoDemo ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
            Código de verificación
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-2xl font-black tracking-[0.3em] text-blue-900">{codigoDemo}</span>
            <button
              type="button"
              onClick={() => autocompletar(codigoDemo)}
              className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Autocompletar
            </button>
          </div>
        </div>
      ) : null}
      <label className="block text-sm font-semibold text-slate-800">
        Código OTP recibido
            <input
              name="otp"
              required
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm tracking-[0.3em] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              placeholder="123456"
            />
          </label>
          {estado.error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{estado.error}</p> : null}
          <button
            type="submit"
            onClick={() => {
              if (email) guardarCuentaEnDispositivo({ email, nombre: email.split("@")[0] });
            }}
            className="w-full rounded-xl bg-gradient-to-r from-sky-400 to-blue-400 px-4 py-3 text-sm font-medium text-white shadow-md shadow-sky-200/50 transition hover:from-sky-500 hover:to-blue-500"
          >
            Continuar con esta cuenta
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
        >
          + Usar otra cuenta
        </button>
      )}
    </div>
  );
}
