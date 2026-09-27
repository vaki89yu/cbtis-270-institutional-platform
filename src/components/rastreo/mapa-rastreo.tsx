"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { Icono } from "@/components/iconos";

export type PuntoDelMapa = {
  nombre: string;
  lat: number;
  lng: number;
  tipo: "origen" | "destino" | "checkpoint" | "paso";
  nota?: string;
};

type EstadoVivo = {
  ok: boolean;
  lat: number | null;
  lng: number | null;
  progreso: number;
  velocidadKmh: number;
  kilometroActual: number;
  kilometrajeTotal: number;
  estado: string;
  completado: boolean;
  posicionEn: string | null;
  proximoCheckpoint: { nombre: string; km: number } | null;
  error?: string;
};

const ETIQUETA_ESTADO: Record<string, string> = {
  programado: "Programado",
  en_transito: "En tránsito",
  detenido: "Detenido",
  incidencia: "Con incidencia",
  entregado: "Entregado",
};

const COLOR_ESTADO: Record<string, string> = {
  programado: "bg-slate-100 text-slate-600",
  en_transito: "bg-emerald-100 text-emerald-800",
  detenido: "bg-amber-100 text-amber-800",
  incidencia: "bg-rose-100 text-rose-800",
  entregado: "bg-inst-100 text-inst-800",
};

/** Distancia en km entre dos coordenadas (Haversine). */
function distancia(a: PuntoDelMapa | { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Coordenada sobre la polilínea a un avance dado (0 al inicio, 1 al final). */
function puntoEnRuta(ruta: PuntoDelMapa[], progreso: number) {
  if (ruta.length === 0) return null;
  if (ruta.length === 1) return { lat: ruta[0].lat, lng: ruta[0].lng };
  const tramos = ruta.slice(1).map((p, i) => distancia(ruta[i], p));
  const total = tramos.reduce((a, b) => a + b, 0);
  if (total === 0) return { lat: ruta[0].lat, lng: ruta[0].lng };

  let objetivo = Math.max(0, Math.min(1, progreso)) * total;
  for (let i = 0; i < tramos.length; i += 1) {
    const km = tramos[i];
    if (objetivo <= km || i === tramos.length - 1) {
      const fraccion = km === 0 ? 0 : Math.min(1, objetivo / km);
      return {
        lat: ruta[i].lat + (ruta[i + 1].lat - ruta[i].lat) * fraccion,
        lng: ruta[i].lng + (ruta[i + 1].lng - ruta[i].lng) * fraccion,
      };
    }
    objetivo -= km;
  }
  return { lat: ruta[ruta.length - 1].lat, lng: ruta[ruta.length - 1].lng };
}

/** Puntos de la polilínea ya recorrida, para pintarla de color. */
function tramoRecorrido(ruta: PuntoDelMapa[], progreso: number) {
  const tramos = ruta.slice(1).map((p, i) => distancia(ruta[i], p));
  const total = tramos.reduce((a, b) => a + b, 0);
  if (total === 0) return [] as Array<[number, number]>;

  const objetivo = Math.max(0, Math.min(1, progreso)) * total;
  const puntos: Array<[number, number]> = [[ruta[0].lat, ruta[0].lng]];
  let acumulado = 0;
  for (let i = 0; i < tramos.length; i += 1) {
    if (acumulado + tramos[i] <= objetivo) {
      puntos.push([ruta[i + 1].lat, ruta[i + 1].lng]);
      acumulado += tramos[i];
    } else {
      const intermedio = puntoEnRuta(ruta, objetivo / total);
      if (intermedio) puntos.push([intermedio.lat, intermedio.lng]);
      break;
    }
  }
  return puntos;
}

/**
 * Mapa en vivo del embarque.
 *
 * Leaflet se carga dentro del navegador (nunca en el servidor) y consulta la
 * posición cada pocos segundos. En modo simulado cada consulta hace avanzar el
 * recorrido; en modo GPS real el operador comparte su ubicación y el mapa la
 * dibuja en cuanto llega.
 */
export function MapaRastreo({
  shipmentId,
  folio,
  modo,
  ruta,
  estadoInicial,
  esOperador,
  segundos = 4,
}: {
  shipmentId: number;
  folio: string;
  modo: "simulado" | "gps";
  ruta: PuntoDelMapa[];
  estadoInicial: EstadoVivo;
  esOperador: boolean;
  segundos?: number;
}) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<Leaflet.Map | null>(null);
  const marcadorVivo = useRef<Leaflet.Layer | null>(null);
  const lineaRecorrida = useRef<Leaflet.Polyline | null>(null);
  const halo = useRef<Leaflet.Layer | null>(null);
  const observador = useRef<number | null>(null);

  const [estado, setEstado] = useState<EstadoVivo>(estadoInicial);
  const [compartiendo, setCompartiendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ultima, setUltima] = useState<Date | null>(null);
  const [pausado, setPausado] = useState(false);
  const [cargandoMapa, setCargandoMapa] = useState(true);
  const [errorMapa, setErrorMapa] = useState<string | null>(null);

  const progresoActual = estado.progreso;

  // Si todavía no hay posición recibida, se estima sobre la ruta planeada
  const estimado = puntoEnRuta(ruta, estado.progreso);
  const latViva = estado.lat ?? estimado?.lat ?? null;
  const lngVivo = estado.lng ?? estimado?.lng ?? null;

  /* ------------------------------- EL MAPA ------------------------------- */
  useEffect(() => {
    let vivo = true;

    (async () => {
      try {
        const L = await import("leaflet");
        if (!vivo || !contenedor.current || mapa.current) return;

        const destino = ruta[ruta.length - 1];
        const inicio = ruta[0];
        const centro = destino && inicio
          ? { lat: (inicio.lat + destino.lat) / 2, lng: (inicio.lng + destino.lng) / 2 }
          : { lat: 28.6, lng: -106.1 };

        const instancia = L.map(contenedor.current, {
          center: [centro.lat, centro.lng],
          zoom: 6,
          scrollWheelZoom: false,
          attributionControl: true,
        });
        mapa.current = instancia;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: "© OpenStreetMap",
        }).addTo(instancia);

        // Ruta planeada completa, punteada
        L.polyline(
          ruta.map((p) => [p.lat, p.lng] as [number, number]),
          { color: "#64748b", weight: 3, dashArray: "7 8", opacity: 0.85 },
        ).addTo(instancia);

        // Recorrido ya hecho, en color
        lineaRecorrida.current = L.polyline([], { color: "#1d5bd5", weight: 5, opacity: 0.95 }).addTo(
          instancia,
        );

        // Origen, checkpoints y destino
        ruta.forEach((punto) => {
          if (punto.tipo === "paso") return;
          const esOrigen = punto.tipo === "origen";
          const esDestino = punto.tipo === "destino";
          const color = esOrigen ? "#0f766e" : esDestino ? "#b91c1c" : "#d97706";
          const radio = esOrigen || esDestino ? 9 : 6;

          L.circleMarker([punto.lat, punto.lng], {
            radius: radio,
            color: "#ffffff",
            weight: 2,
            fillColor: color,
            fillOpacity: 0.95,
          })
            .addTo(instancia)
            .bindPopup(
              `<strong>${punto.nombre}</strong><br/>${
                esOrigen ? "Origen" : esDestino ? "Destino" : "Checkpoint"
              }${punto.nota ? `<br/><em>${punto.nota}</em>` : ""}`,
            );
        });

        if (ruta.length > 1) {
          instancia.fitBounds(
            L.latLngBounds(ruta.map((p) => [p.lat, p.lng] as [number, number])).pad(0.15),
          );
        }

        setCargandoMapa(false);
      } catch (error) {
        if (!vivo) return;
        setErrorMapa((error as Error).message?.slice(0, 140) ?? "No se pudo cargar el mapa.");
        setCargandoMapa(false);
      }
    })();

    return () => {
      vivo = false;
      mapa.current?.remove();
      mapa.current = null;
      marcadorVivo.current = null;
      lineaRecorrida.current = null;
      halo.current = null;
    };
  }, [ruta]);

  /* ------------------------- PINTAR LA POSICIÓN ------------------------- */
  useEffect(() => {
    if (!mapa.current || latViva === null || lngVivo === null) return;

    (async () => {
      const Leaf = await import("leaflet");
      const instancia = mapa.current;
      if (!instancia) return;

      if (!marcadorVivo.current) {
        halo.current = Leaf.circleMarker([latViva, lngVivo], {
          radius: 18,
          color: "#1d5bd5",
          weight: 1,
          fillColor: "#1d5bd5",
          fillOpacity: 0.15,
        }).addTo(instancia);

        marcadorVivo.current = Leaf.circleMarker([latViva, lngVivo], {
          radius: 8,
          color: "#ffffff",
          weight: 3,
          fillColor: "#1d5bd5",
          fillOpacity: 1,
        })
          .addTo(instancia)
          .bindPopup(`<strong>${folio}</strong><br/>Posición en vivo`);
      } else {
        (marcadorVivo.current as Leaflet.CircleMarker).setLatLng([latViva, lngVivo]);
        (halo.current as Leaflet.CircleMarker)?.setLatLng([latViva, lngVivo]);
      }

      lineaRecorrida.current?.setLatLngs(tramoRecorrido(ruta, progresoActual));
    })();
  }, [latViva, lngVivo, progresoActual, ruta, folio]);

  /* --------------------------- CONSULTA EN VIVO --------------------------- */
  const consultar = useCallback(async () => {
    try {
      const respuesta = await fetch(`/api/embarques/${shipmentId}/posicion`, { cache: "no-store" });
      const datos = (await respuesta.json()) as EstadoVivo;
      if (datos.ok) {
        setEstado(datos);
        setUltima(new Date());
      }
    } catch {
      // Sin conexión: se reintenta en la siguiente pasada
    }
  }, [shipmentId]);

  useEffect(() => {
    if (pausado) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void consultar();
    }, segundos * 1000);
    return () => clearInterval(id);
  }, [consultar, pausado, segundos]);

  /* -------------------------- GPS REAL DEL OPERADOR -------------------------- */
  const compartirUbicacion = () => {
    if (compartiendo) {
      if (observador.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(observador.current);
      }
      observador.current = null;
      setCompartiendo(false);
      setAviso("Dejaste de compartir tu ubicación.");
      return;
    }

    if (!navigator.geolocation) {
      setAviso("Este dispositivo no tiene GPS disponible.");
      return;
    }

    setAviso("Pidiendo permiso de ubicación al dispositivo…");
    observador.current = navigator.geolocation.watchPosition(
      async (pos) => {
        setCompartiendo(true);
        setAviso("Compartiendo tu ubicación con el grupo.");
        try {
          const respuesta = await fetch(`/api/embarques/${shipmentId}/posicion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              velocidad: pos.coords.speed !== null ? pos.coords.speed * 3.6 : 0,
            }),
          });
          const datos = (await respuesta.json()) as EstadoVivo & { error?: string };
          if (datos.ok) {
            setEstado(datos);
            setUltima(new Date());
          } else if (datos.error) {
            setAviso(datos.error);
          }
        } catch {
          setAviso("No se pudo enviar la posición. Revisa tu conexión.");
        }
      },
      (error) => {
        setCompartiendo(false);
        setAviso(
          error.code === error.PERMISSION_DENIED
            ? "Negaste el permiso de ubicación. Actívalo para compartir el recorrido."
            : "No se pudo obtener la señal de GPS en este momento.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  };

  useEffect(() => {
    return () => {
      if (observador.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(observador.current);
      }
    };
  }, []);

  const porcentaje = Math.round(estado.progreso * 100);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200">
        <div ref={contenedor} className="h-[380px] w-full bg-slate-100 sm:h-[440px]" />
        {cargandoMapa ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90">
            <p className="text-sm font-semibold text-slate-500">Cargando el mapa…</p>
          </div>
        ) : null}
        {errorMapa ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/95 p-6">
            <div className="text-center">
              <Icono nombre="alerta" tamano={30} className="mx-auto text-rose-500" />
              <p className="mt-2 text-sm font-bold text-slate-700">No se pudo dibujar el mapa</p>
              <p className="mt-1 text-xs text-slate-500">{errorMapa}</p>
              <p className="mt-2 text-xs text-slate-500">
                La línea de tiempo y los datos del embarque siguen funcionando abajo.
              </p>
            </div>
          </div>
        ) : null}

        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black ${
              COLOR_ESTADO[estado.estado] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            {ETIQUETA_ESTADO[estado.estado] ?? estado.estado}
          </span>
          <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-slate-600 shadow">
            {modo === "gps" ? "GPS real" : "Simulado"}
          </span>
        </div>
      </div>

      {/* Tira de datos en vivo */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Avance</p>
          <p className="text-xl font-black text-slate-900">{porcentaje}%</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-inst-600 transition-all" style={{ width: `${porcentaje}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Kilómetros</p>
          <p className="text-xl font-black text-slate-900">
            {estado.kilometroActual}
            <span className="text-sm font-bold text-slate-400"> / {estado.kilometrajeTotal} km</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Velocidad</p>
          <p className="text-xl font-black text-slate-900">
            {estado.velocidadKmh}
            <span className="text-sm font-bold text-slate-400"> km/h</span>
          </p>
          <p className="text-[10px] font-semibold text-slate-400">
            {modo === "gps" ? "reportada por el GPS" : "comercial de la ruta"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Próximo punto</p>
          <p className="truncate text-sm font-black text-slate-900">
            {estado.proximoCheckpoint?.nombre ?? "Destino alcanzado"}
          </p>
          {estado.proximoCheckpoint ? (
            <p className="text-[10px] font-semibold text-slate-400">
              a {estado.proximoCheckpoint.km} km
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void consultar()}
          className="btn-mini"
        >
          Actualizar ahora
        </button>
        <button
          type="button"
          onClick={() => setPausado((v) => !v)}
          className={`btn-mini ${pausado ? "border-amber-300 text-amber-700" : ""}`}
        >
          {pausado ? "Reanudar el seguimiento" : "Pausar el seguimiento"}
        </button>
        {esOperador ? (
          <button
            type="button"
            onClick={compartirUbicacion}
            className={`btn-primario px-4 py-2 text-xs ${compartiendo ? "!bg-emerald-600" : ""}`}
          >
            {compartiendo ? "Dejar de compartir mi ubicación" : "Compartir mi ubicación (GPS real)"}
          </button>
        ) : null}
        <span className="text-[11px] font-semibold text-slate-400">
          {ultima
            ? `Última posición: ${ultima.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}`
            : "Esperando la primera posición…"}
        </span>
      </div>

      {aviso ? (
        <p
          className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
            compartiendo ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
          }`}
        >
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
