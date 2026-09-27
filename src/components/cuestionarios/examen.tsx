"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icono } from "@/components/iconos";

type PreguntaPublica = {
  id: string;
  enunciado: string;
  opciones: string[];
};

type CuestionarioPublico = {
  clave: string;
  titulo: string;
  descripcion: string;
  minutos: number;
  puntos: number;
  preguntas: PreguntaPublica[];
};

type DetalleReactivo = {
  id: string;
  enunciado: string;
  opciones: string[];
  elegida: number;
  correcta: number;
  acierto: boolean;
  explicacion: string;
};

type Resultado = {
  ok: boolean;
  correctas?: number;
  total?: number;
  calificacion?: number;
  detalle?: DetalleReactivo[];
  veredicto?: { texto: string; clase: string };
  error?: string;
};

function mmss(segundos: number) {
  const m = Math.floor(Math.max(0, segundos) / 60);
  const s = Math.max(0, segundos) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Cuestionario en pantalla.
 *
 * Cronómetro, calificación instantánea y explicación de cada reactivo. El
 * navegador sólo manda el índice que se eligió: las respuestas correctas y las
 * explicaciones llegan del servidor ya calificado el intento.
 */
export function Examen({ cuestionario }: { cuestionario: CuestionarioPublico }) {
  const total = cuestionario.preguntas.length;
  const [respuestas, setRespuestas] = useState<number[]>(() => Array.from({ length: total }, () => -1));
  const [segundos, setSegundos] = useState(cuestionario.minutos * 60);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inicio = useRef<number>(0);
  const agotado = useRef(false);

  const contestadas = useMemo(() => respuestas.filter((r) => r >= 0).length, [respuestas]);

  const enviar = useCallback(
    async (porTiempo: boolean) => {
      if (enviando || resultado) return;
      setEnviando(true);
      setError(null);
      try {
        const respuesta = await fetch("/api/cuestionarios/resolver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clave: cuestionario.clave,
            respuestas,
            duracionSeg: Math.round((Date.now() - inicio.current) / 1000),
            agotado: porTiempo,
          }),
        });
        const datos = (await respuesta.json()) as Resultado;
        if (!datos.ok) {
          setError(datos.error ?? "No se pudo calificar el intento.");
          setEnviando(false);
          return;
        }
        setResultado(datos);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setError("No hay conexión con la plataforma. Intenta enviar de nuevo.");
      } finally {
        setEnviando(false);
      }
    },
    [cuestionario.clave, enviando, resultado, respuestas],
  );

  /* ------------------------------ CRONÓMETRO ------------------------------ */
  useEffect(() => {
    if (resultado) return;
    if (inicio.current === 0) inicio.current = Date.now();
    const id = setInterval(() => {
      setSegundos((s) => {
        if (s <= 1) {
          agotado.current = true;
          clearInterval(id);
          void enviar(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [enviar, resultado]);

  /* -------------------------------- RESULTADO -------------------------------- */
  if (resultado?.detalle) {
    const aciertos = resultado.correctas ?? 0;
    return (
      <div className="space-y-6">
        <div className="tarjeta overflow-hidden">
          <div className="border-b border-slate-200 bg-inst-50/70 p-6 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-inst-700">
              Resultado de {cuestionario.titulo}
            </p>
            <p className="mt-2 text-6xl font-black text-inst-900">{resultado.calificacion}</p>
            <p className="mt-1 text-sm font-bold text-slate-600">
              {aciertos} de {resultado.total} reactivos correctos
            </p>
            <p className={`mt-2 text-sm font-semibold ${resultado.veredicto?.clase ?? "text-slate-600"}`}>
              {resultado.veredicto?.texto}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 p-4">
            <Link href="/panel/cuestionarios" className="btn-secundario px-4 py-2 text-xs">
              Volver a los cuestionarios
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primario px-4 py-2 text-xs"
            >
              Intentarlo otra vez
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {resultado.detalle.map((reactivo, indice) => (
            <div
              key={reactivo.id}
              className={`tarjeta p-5 ${reactivo.acierto ? "border-emerald-200" : "border-rose-200"}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    reactivo.acierto ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {indice + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{reactivo.enunciado}</p>
                  <ul className="mt-2 space-y-1">
                    {reactivo.opciones.map((opcion, i) => {
                      const esCorrecta = i === reactivo.correcta;
                      const elegida = i === reactivo.elegida;
                      return (
                        <li
                          key={`${reactivo.id}-${i}`}
                          className={`rounded-lg px-3 py-1.5 text-xs ${
                            esCorrecta
                              ? "bg-emerald-50 font-bold text-emerald-900"
                              : elegida
                                ? "bg-rose-50 font-bold text-rose-800"
                                : "text-slate-600"
                          }`}
                        >
                          {esCorrecta ? "✔ " : elegida ? "✘ " : "· "}
                          {opcion}
                          {elegida && !esCorrecta ? " (tu respuesta)" : ""}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
                    <strong>Por qué:</strong> {reactivo.explicacion}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* -------------------------------- EXAMEN -------------------------------- */
  const urgencia = segundos <= 60;

  return (
    <div className="space-y-5">
      <div className="tarjeta sticky top-24 z-20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900">{cuestionario.titulo}</h2>
            <p className="text-xs text-slate-500">
              {contestadas} de {total} reactivos contestados · {cuestionario.puntos} puntos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-black ${
                urgencia ? "bg-rose-100 text-rose-800" : "bg-inst-50 text-inst-800"
              }`}
            >
              <Icono nombre="cronometro" tamano={16} />
              {mmss(segundos)}
            </span>
            <button
              type="button"
              onClick={() => void enviar(false)}
              disabled={enviando}
              className="btn-primario px-4 py-2 text-xs"
            >
              {enviando ? "Calificando…" : "Enviar y calificar"}
            </button>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-inst-600 transition-all"
            style={{ width: `${(contestadas / total) * 100}%` }}
          />
        </div>
        {contestadas < total ? (
          <p className="mt-2 text-[11px] font-semibold text-amber-700">
            Te faltan {total - contestadas} reactivos. Puedes enviar de todos modos: lo que quede en
            blanco cuenta como incorrecto.
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        {cuestionario.preguntas.map((pregunta, indice) => (
          <div key={pregunta.id} className="tarjeta p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-inst-50 text-xs font-black text-inst-800">
                {indice + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{pregunta.enunciado}</p>
                <div className="mt-3 space-y-1.5">
                  {pregunta.opciones.map((opcion, i) => {
                    const activa = respuestas[indice] === i;
                    return (
                      <label
                        key={`${pregunta.id}-${i}`}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                          activa
                            ? "border-inst-600 bg-inst-50 font-semibold text-inst-900"
                            : "border-slate-200 text-slate-700 hover:border-inst-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={pregunta.id}
                          className="mt-1 h-4 w-4"
                          checked={activa}
                          onChange={() =>
                            setRespuestas((prev) => {
                              const copia = [...prev];
                              copia[indice] = i;
                              return copia;
                            })
                          }
                        />
                        <span>{opcion}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="tarjeta flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-xs text-slate-500">
          Al enviar verás tu calificación y la explicación de cada reactivo. Puedes volver a
          intentarlo las veces que necesites; se guarda tu mejor marca.
        </p>
        <button
          type="button"
          onClick={() => void enviar(false)}
          disabled={enviando}
          className="btn-primario px-5 py-2.5 text-sm"
        >
          {enviando ? "Calificando…" : "Enviar y calificar"}
        </button>
      </div>
    </div>
  );
}
