"use client";

import { useEffect, useState } from "react";
import { googlePreviewAction } from "@/lib/actions/auth";

export type CuentaDispositivo = {
  email: string;
  nombre: string;
  rol?: string;
};

const STORAGE_KEY = "cbtis270_cuentas_dispositivo";

export function guardarCuentaEnDispositivo(cuenta: CuentaDispositivo) {
  if (typeof window === "undefined" || !cuenta.email) return;
  try {
    const prevRaw = localStorage.getItem(STORAGE_KEY);
    let lista: CuentaDispositivo[] = prevRaw ? JSON.parse(prevRaw) : [];
    lista = lista.filter((c) => c.email.toLowerCase() !== cuenta.email.toLowerCase());
    lista.unshift(cuenta);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(0, 8)));

    const cuentasGuardadas = lista.slice(0, 8);
    document.cookie = `cbtis270_saved_accounts_list=${encodeURIComponent(
      JSON.stringify(cuentasGuardadas),
    )}; path=/; max-age=5184000; SameSite=Lax`;
    window.dispatchEvent(
      new CustomEvent("cbtis270-account-saved", { detail: { cuentas: cuentasGuardadas } }),
    );
  } catch {}
}

export function CuentasDispositivo({
  savedAccountServer,
  serverSavedAccounts = [],
  onSeleccionar,
  titulo = "Cuentas en este dispositivo",
}: {
  savedAccountServer?: CuentaDispositivo | null;
  serverSavedAccounts?: CuentaDispositivo[];
  onSeleccionar?: (email: string) => void;
  titulo?: string;
}) {
  const initialAccounts = [
    ...(savedAccountServer?.email ? [savedAccountServer] : []),
    ...serverSavedAccounts,
  ];

  const [cuentas, setCuentas] = useState<CuentaDispositivo[]>(initialAccounts);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    const unirCuentas = (entrantes: CuentaDispositivo[]) => {
      const mapa = new Map<string, CuentaDispositivo>();
      for (const item of entrantes) {
        if (item?.email && !mapa.has(item.email.toLowerCase())) {
          mapa.set(item.email.toLowerCase(), item);
        }
      }
      return Array.from(mapa.values()).slice(0, 8);
    };

    const cargarCuentas = () => {
      try {
        const localRaw = localStorage.getItem(STORAGE_KEY);
        const localList: CuentaDispositivo[] = localRaw ? JSON.parse(localRaw) : [];
        const listaUnica = unirCuentas([
          ...(savedAccountServer?.email ? [savedAccountServer] : []),
          ...serverSavedAccounts,
          ...localList,
        ]);
        setCuentas(listaUnica);
        if (listaUnica.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(listaUnica));
        }
      } catch {
        setCuentas(unirCuentas([
          ...(savedAccountServer?.email ? [savedAccountServer] : []),
          ...serverSavedAccounts,
        ]));
      } finally {
        setCargado(true);
      }
    };

    const alGuardar = (event: Event) => {
      const detalle = (event as CustomEvent<{ cuentas?: CuentaDispositivo[] }>).detail;
      if (detalle?.cuentas) setCuentas(unirCuentas(detalle.cuentas));
      else cargarCuentas();
    };

    cargarCuentas();
    window.addEventListener("cbtis270-account-saved", alGuardar);
    window.addEventListener("storage", cargarCuentas);
    return () => {
      window.removeEventListener("cbtis270-account-saved", alGuardar);
      window.removeEventListener("storage", cargarCuentas);
    };
  }, [savedAccountServer, serverSavedAccounts]);

  function quitarCuenta(emailTarget: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const filtradas = cuentas.filter((c) => c.email.toLowerCase() !== emailTarget.toLowerCase());
    setCuentas(filtradas);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtradas.slice(0, 8)));
      document.cookie = `cbtis270_saved_accounts_list=${encodeURIComponent(
        JSON.stringify(filtradas.slice(0, 8)),
      )}; path=/; max-age=5184000; SameSite=Lax`;
      if (filtradas.length === 0) {
        document.cookie = `cbtis270_saved_account=; path=/; max-age=0; SameSite=Lax`;
      }
    } catch {}
  }

  if (!cargado || cuentas.length === 0) return null;

  const colores = ["bg-blue-600", "bg-emerald-600", "bg-purple-600", "bg-amber-600", "bg-rose-600"];

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{titulo}</p>
        <span className="text-[11px] text-slate-400">{cuentas.length} guardada(s)</span>
      </div>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {cuentas.map((cuenta, idx) => {
          const inicial = cuenta.nombre ? cuenta.nombre.charAt(0).toUpperCase() : "G";
          const color = colores[idx % colores.length];
          const rolEtiqueta =
            cuenta.rol === "docente"
              ? "Docente"
              : cuenta.rol === "admin"
                ? "Jefatura"
                : cuenta.rol === "estudiante"
                  ? "Alumno"
                  : null;

          return (
            <div key={cuenta.email} className="flex items-center justify-between gap-3 p-3 transition hover:bg-slate-50">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-xs ${color}`}
                >
                  {inicial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-slate-900">{cuenta.nombre || "Usuario"}</p>
                    {rolEtiqueta ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {rolEtiqueta}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-slate-500">{cuenta.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onSeleccionar ? (
                  <button
                    type="button"
                    onClick={() => onSeleccionar(cuenta.email)}
                    className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                  >
                    Seleccionar
                  </button>
                ) : (
                  <form action={googlePreviewAction}>
                    <input type="hidden" name="email" value={cuenta.email} />
                    <input type="hidden" name="nombre" value={cuenta.nombre} />
                    <button
                      type="submit"
                      className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                    >
                      Entrar
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={(e) => quitarCuenta(cuenta.email, e)}
                  title="Quitar esta cuenta del dispositivo"
                  aria-label={`Quitar cuenta ${cuenta.email}`}
                  className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
