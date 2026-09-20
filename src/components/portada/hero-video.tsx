"use client";

import { useEffect, useRef, useState } from "react";

const CLIPS = [
  "/videos/hero-logistica.mp4",
  "/videos/hero-logistica-2.mp4",
  "/videos/hero-logistica-3.mp4",
];

const POSTER_SRC = "/images/panel-logistica-wallpaper.jpg";
const FADE_S = 1.2; // duración del fundido entre videos

export function HeroVideo() {
  const refA = useRef<HTMLVideoElement | null>(null);
  const refB = useRef<HTMLVideoElement | null>(null);
  const [activo, setActivo] = useState<"A" | "B">("A");
  const idxRef = useRef(0);
  const cambiandoRef = useRef(false);
  const [sinVideo, setSinVideo] = useState(false);

  useEffect(() => {
    const vA = refA.current;
    const vB = refB.current;
    if (!vA || !vB) return;

    vA.src = CLIPS[0];
    vB.src = CLIPS[1 % CLIPS.length];
    vA.muted = true;
    vB.muted = true;
    vA.playsInline = true;
    vB.playsInline = true;

    const iniciar = vA.play();
    if (iniciar && typeof iniciar.catch === "function") {
      iniciar.catch(() => {
        /* autoplay bloqueado: se mantiene el poster */
      });
    }
  }, []);

  useEffect(() => {
    const actual = activo === "A" ? refA.current : refB.current;
    const siguiente = activo === "A" ? refB.current : refA.current;
    if (!actual || !siguiente) return;

    const avanzar = () => {
      if (cambiandoRef.current) return;
      cambiandoRef.current = true;

      const sigIdx = (idxRef.current + 1) % CLIPS.length;
      const proxIdx = (idxRef.current + 2) % CLIPS.length;
      idxRef.current = sigIdx;

      siguiente.currentTime = 0;
      const intento = siguiente.play();
      if (intento && typeof intento.catch === "function") intento.catch(() => {});

      setActivo((prev) => (prev === "A" ? "B" : "A"));

      // tras el fundido, recargar el video anterior con el próximo clip de la cola
      setTimeout(() => {
        actual.pause();
        actual.src = CLIPS[proxIdx];
        actual.load();
        cambiandoRef.current = false;
      }, FADE_S * 1000 + 150);
    };

    const alProgreso = () => {
      if (!Number.isFinite(actual.duration) || actual.duration <= 0) return;
      if (actual.currentTime >= actual.duration - FADE_S) {
        avanzar();
      }
    };

    actual.addEventListener("timeupdate", alProgreso);
    actual.addEventListener("ended", avanzar);
    return () => {
      actual.removeEventListener("timeupdate", alProgreso);
      actual.removeEventListener("ended", avanzar);
    };
  }, [activo]);

  if (sinVideo) {
    return (
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url(${POSTER_SRC})` }}
        aria-hidden
      />
    );
  }

  return (
    <div className="absolute inset-0 -z-20 overflow-hidden" aria-hidden>
      <video
        ref={refA}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
          activo === "A" ? "opacity-100" : "opacity-0"
        }`}
        muted
        playsInline
        preload="auto"
        poster={POSTER_SRC}
        onError={() => setSinVideo(true)}
      />
      <video
        ref={refB}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
          activo === "B" ? "opacity-100" : "opacity-0"
        }`}
        muted
        playsInline
        preload="auto"
        poster={POSTER_SRC}
        onError={() => setSinVideo(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f2c4c]/30 via-transparent to-[#0f2c4c]/35" />
    </div>
  );
}
