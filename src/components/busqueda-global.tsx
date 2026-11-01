"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icono } from "@/components/iconos";

type Item = { id: string; titulo: string; detalle: string; href: string };
type Grupo = { clave: string; etiqueta: string; items: Item[] };

/**
 * Paleta de búsqueda global (Ctrl/⌘ + K). Consulta `/api/buscar`, que filtra
 * por rol, y permite navegar con teclado: ↑ ↓ y Enter.
 */
export function BusquedaGlobal() {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [activo, setActivo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function cerrar() {
    setAbierto(false);
    setTexto("");
    setGrupos([]);
    setActivo(0);
    setError(null);
  }

  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setAbierto((previo) => !previo);
      }
      if (evento.key === "Escape") {
        setAbierto(false);
        setTexto("");
        setGrupos([]);
        setActivo(0);
        setError(null);
      }
    }
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const temporizador = window.setTimeout(() => campo.current?.focus(), 40);
    return () => window.clearTimeout(temporizador);
  }, [abierto]);

  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 2) return;

    const control = new AbortController();
    const temporizador = window.setTimeout(async () => {
      setCargando(true);
      setError(null);
      try {
        const respuesta = await fetch(`/api/buscar?q=${encodeURIComponent(consulta)}`, {
          signal: control.signal,
        });
        if (!respuesta.ok) throw new Error("búsqueda no disponible");
        const datos = (await respuesta.json()) as { grupos?: Grupo[] };
        setGrupos(Array.isArray(datos.grupos) ? datos.grupos : []);
        setActivo(0);
      } catch (evento) {
        if ((evento as Error).name !== "AbortError") setError("No se pudo buscar. Intenta de nuevo.");
      } finally {
        setCargando(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(temporizador);
      control.abort();
    };
  }, [texto]);

  const activa = texto.trim().length >= 2;
  const visibles = activa ? grupos : [];
  const planos = visibles.flatMap((grupo) => grupo.items);

  function navegar(item?: Item) {
    if (!item) return;
    cerrar();
    router.push(item.href);
  }

  function alPresionar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setActivo((previo) => (planos.length === 0 ? 0 : (previo + 1) % planos.length));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setActivo((previo) => (planos.length === 0 ? 0 : (previo - 1 + planos.length) % planos.length));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      navegar(planos[activo]);
    }
  }

  let indice = -1;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/20"
        aria-label="Buscar en la plataforma"
      >
        <Icono nombre="buscar" tamano={16} />
        <span className="hidden sm:inline">Buscar…</span>
        <kbd className="hidden rounded border border-white/25 px-1.5 py-0.5 text-[10px] font-bold text-white/70 sm:inline">
          Ctrl K
        </kbd>
      </button>

      {abierto ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/50 p-4 pt-[12vh] backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar búsqueda"
            className="absolute inset-0 cursor-default"
            onClick={cerrar}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Búsqueda global"
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <Icono nombre="buscar" tamano={18} className="text-slate-400" />
              <input
                ref={campo}
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                onKeyDown={alPresionar}
                placeholder="Busca alumnos, aulas, actividades, formatos…"
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                aria-label="Texto a buscar"
              />
              <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                Esc
              </kbd>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {!activa ? (
                <p className="px-3 py-6 text-center text-xs text-slate-500">
                  Escribe al menos dos letras. Puedes buscar por nombre, matrícula, correo, clave de
                  aula o código de formato.
                </p>
              ) : cargando ? (
                <p className="px-3 py-6 text-center text-xs text-slate-500">Buscando…</p>
              ) : error ? (
                <p className="px-3 py-6 text-center text-xs text-rose-600">{error}</p>
              ) : planos.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-500">
                  Sin resultados para «{texto.trim()}».
                </p>
              ) : (
                visibles.map((grupo) => (
                  <div key={grupo.clave} className="mb-1">
                    <p className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {grupo.etiqueta}
                    </p>
                    {grupo.items.map((item) => {
                      indice += 1;
                      const seleccionado = indice === activo;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setActivo(indice)}
                          onClick={() => navegar(item)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left ${
                            seleccionado ? "bg-inst-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                              {item.titulo}
                            </span>
                            <span className="block truncate text-xs text-slate-500">{item.detalle}</span>
                          </span>
                          <span className="shrink-0 text-[11px] font-bold text-inst-600">Abrir</span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-semibold text-slate-500">
              <span>↑ ↓ para moverse · Enter para abrir</span>
              <span>Resultados filtrados según tu rol</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
