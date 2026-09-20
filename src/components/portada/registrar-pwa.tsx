"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function RegistrarPwa() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalada, setInstalada] = useState(false);
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const alPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const alInstalar = () => setInstalada(true);

    window.addEventListener("beforeinstallprompt", alPrompt);
    window.addEventListener("appinstalled", alInstalar);

    if (window.matchMedia("(display-mode: standalone)").matches) setInstalada(true);
    try {
      if (sessionStorage.getItem("cbtis270_pwa_oculto") === "1") setOculto(true);
    } catch {}

    return () => {
      window.removeEventListener("beforeinstallprompt", alPrompt);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  if (instalada || oculto || !promptEvent) return null;

  return (
    <div className="fixed bottom-24 right-5 z-40 w-72 overflow-hidden rounded-2xl border border-white/40 bg-white/95 shadow-2xl backdrop-blur-md sm:bottom-5 sm:right-24">
      <div className="flex items-start gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-lg font-black text-white">
          270
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Instalar en tu celular</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Agrega la plataforma a tu pantalla de inicio para entrar más rápido.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await promptEvent.prompt();
                const { outcome } = await promptEvent.userChoice;
                if (outcome === "accepted") setInstalada(true);
                setPromptEvent(null);
              }}
              className="btn-primario px-3 py-1.5 text-xs"
            >
              Instalar
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem("cbtis270_pwa_oculto", "1");
                } catch {}
                setOculto(true);
              }}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
