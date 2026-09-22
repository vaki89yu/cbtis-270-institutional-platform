"use client";

import { useEffect, useRef, useState } from "react";

// Videos REALES de logística comercio internacional descargados de internet via git clone
// Fuentes:
// - https://github.com/MercyShark/truck-detection.git -> demo3.mp4 camión en carretera (logística internacional)
// - https://github.com/Ramsaijaddu7338/Royals-logistics-video.git -> safetyVideo.mp4 logística real
// - https://github.com/intel-iot-devkit/sample-videos.git -> store-aisle, worker-zone (almacén)
const REAL_VIDEOS = [
  "/videos/logistica-comercio-internacional.mp4", // CAMIÓN en carretera - comercio internacional REAL
  "/videos/logistica-royals.mp4",                 // Royals logistics safety video REAL
  "/videos/hero-logistica-real.mp4",             // store-aisle-detection almacén REAL
  "/videos/hero-warehouse-worker.mp4",           // worker-zone-detection almacén REAL
];

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const load = (i: number) => {
      if (i >= REAL_VIDEOS.length) return;
      v.src = REAL_VIDEOS[i];
      v.load();
      v.play().then(() => setLoaded(true)).catch(() => setTimeout(() => setIdx(i + 1), 600));
    };

    load(idx);

    const onErr = () => {
      const next = idx + 1;
      if (next < REAL_VIDEOS.length) setIdx(next);
    };
    const onCanPlay = () => {
      setLoaded(true);
      v.play().catch(() => {});
    };

    v.addEventListener("error", onErr);
    v.addEventListener("canplay", onCanPlay);
    return () => {
      v.removeEventListener("error", onErr);
      v.removeEventListener("canplay", onCanPlay);
    };
  }, [idx]);

  return (
    <div className="absolute inset-0 -z-20 overflow-hidden bg-[#0a1f3d]" aria-hidden>
      {/* Video REAL de logística comercio internacional descargado de internet */}
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${loaded ? "opacity-90" : "opacity-0"}`}
        muted
        playsInline
        loop
        autoPlay
        preload="auto"
        poster="/images/panel-logistica-wallpaper.jpg"
      />

      {/* Fallback canvas */}
      <div className={`absolute inset-0 transition-opacity ${loaded ? "opacity-10" : "opacity-100"}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f2c4c] via-[#1a3a5f] to-[#0d213f]" />
      </div>

      {/* Overlays muy suaves para que se vea el video real */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f2c4c]/10 via-[#0f2c4c]/20 to-[#0a1f3d]/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f2c4c]/20 via-transparent to-transparent" />
    </div>
  );
}
