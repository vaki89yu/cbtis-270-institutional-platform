"use client";

import { useEffect } from "react";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const CLAVES_SESION = ["cbtis270_session", "cbtis270_session_hint"];
const COOKIES_SESION = [
  "cbtis270_session",
  "cbtis270_session_client",
  "cbtis270_session_hint",
  "cbtis270_session_hint_client",
  "otp_verified_email",
  "google_verified_email",
];
const COOKIE_LOGOUT = "cbtis270_sesion_cerrada";

function borrarCookieCliente(nombre: string) {
  const variantes = [
    `${nombre}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `${nombre}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure`,
    `${nombre}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure; Partitioned`,
  ];
  for (const v of variantes) {
    try {
      document.cookie = v;
    } catch {}
  }
}

/** Borra por completo la copia local de la sesión (localStorage + cookies de cliente). */
export function purgarSesionLocal() {
  try {
    for (const clave of CLAVES_SESION) localStorage.removeItem(clave);
  } catch {}
  for (const nombre of COOKIES_SESION) borrarCookieCliente(nombre);
}

export function SessionSync() {
  useEffect(() => {
    // 0. Si el servidor cerró la sesión, purgar la copia local ANTES de
    //    cualquier intento de restauración. Sin esto, el token guardado en
    //    localStorage volvía a escribir las cookies y el usuario seguía dentro.
    const sesionCerrada = getCookie(COOKIE_LOGOUT);
    if (sesionCerrada) {
      purgarSesionLocal();
      borrarCookieCliente(COOKIE_LOGOUT);
      console.log("[SessionSync] Sesión cerrada por el servidor: copia local purgada");
      return;
    }

    // 1. Intentar recuperar sesión desde URL (fallback cuando cookies bloqueadas en iframe)
    try {
      const url = new URL(window.location.href);
      const urlToken = url.searchParams.get("session_token") || url.searchParams.get("token");
      const urlHint = url.searchParams.get("session_hint") || url.searchParams.get("hint");
      if (urlToken) {
        localStorage.setItem("cbtis270_session", urlToken);
        document.cookie = `cbtis270_session_client=${urlToken}; path=/; max-age=${14*24*60*60}; SameSite=None; Secure`;
        document.cookie = `cbtis270_session=${urlToken}; path=/; max-age=${14*24*60*60}; SameSite=None; Secure`;
        console.log("[SessionSync] Token recuperado de URL y guardado");
        url.searchParams.delete("session_token");
        url.searchParams.delete("token");
        url.searchParams.delete("session_hint");
        url.searchParams.delete("hint");
        window.history.replaceState({}, "", url.toString());
      }
      if (urlHint) {
        localStorage.setItem("cbtis270_session_hint", urlHint);
        document.cookie = `cbtis270_session_hint_client=${urlHint}; path=/; max-age=${14*24*60*60}; SameSite=None; Secure`;
        document.cookie = `cbtis270_session_hint=${urlHint}; path=/; max-age=${14*24*60*60}; SameSite=None; Secure`;
      }
    } catch {}

    // Sincronizar cookies de sesión a localStorage para fallback iframe
    const token = getCookie("cbtis270_session") || getCookie("cbtis270_session_client");
    const hint = getCookie("cbtis270_session_hint") || getCookie("cbtis270_session_hint_client");
    
    if (token) {
      localStorage.setItem("cbtis270_session", token);
    }
    if (hint) {
      localStorage.setItem("cbtis270_session_hint", hint);
    }

    // Si hay token en localStorage pero no en cookies, restaurar cookies via JS
    const lsToken = localStorage.getItem("cbtis270_session");
    const lsHint = localStorage.getItem("cbtis270_session_hint");
    
    if (lsToken && !getCookie("cbtis270_session_client")) {
      document.cookie = `cbtis270_session_client=${lsToken}; path=/; max-age=${14*24*60*60}; SameSite=None; Secure`;
      document.cookie = `cbtis270_session=${lsToken}; path=/; max-age=${14*24*60*60}; SameSite=None; Secure`;
      console.log("[SessionSync] Restaurada cookie de sesión desde localStorage");
    }
    if (lsHint && !getCookie("cbtis270_session_hint_client")) {
      document.cookie = `cbtis270_session_hint_client=${lsHint}; path=/; max-age=${14*24*60*60}; SameSite=None; Secure`;
      document.cookie = `cbtis270_session_hint=${lsHint}; path=/; max-age=${14*24*60*60}; SameSite=None; Secure`;
    }

    // Interceptar fetch para añadir x-session-token y x-session-hint headers
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = localStorage.getItem("cbtis270_session") || getCookie("cbtis270_session_client") || getCookie("cbtis270_session");
      const hint = localStorage.getItem("cbtis270_session_hint") || getCookie("cbtis270_session_hint_client") || getCookie("cbtis270_session_hint");
      if (token || hint) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        if (token && !headers.has("x-session-token")) {
          headers.set("x-session-token", token);
        }
        if (hint && !headers.has("x-session-hint")) {
          headers.set("x-session-hint", hint);
        }
        init.headers = headers;
      }
      return originalFetch(input, init);
    };

    // Limpiar al hacer logout
    const handleStorage = () => {
      // Si se borra sesión, limpiar localStorage
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
