import Link from "next/link";

export function Escudo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="escudoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60b0f8" />
          <stop offset="100%" stopColor="#17295a" />
        </linearGradient>
      </defs>
      <path
        d="M32 2 6 11v22c0 15 11 25.5 26 29 15-3.5 26-14 26-29V11L32 2Z"
        fill="url(#escudoGrad)"
        stroke="#bfe0fd"
        strokeWidth="2"
      />
      <path d="M20 40V24l12-7 12 7v16" fill="none" stroke="#dbeefe" strokeWidth="2.4" strokeLinejoin="round" />
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui"
        fontSize="13"
        fontWeight="700"
        fill="#ffffff"
      >
        270
      </text>
      <rect x="22" y="43" width="20" height="3" rx="1.5" fill="#93cdfc" />
    </svg>
  );
}

export function MarcaInstitucional({
  variante = "oscuro",
  href = "/",
}: {
  variante?: "oscuro" | "claro";
  href?: string;
}) {
  const claro = variante === "claro";
  return (
    <Link href={href} className="flex items-center gap-3">
      <Escudo size={42} />
      <span className="leading-tight">
        <span className={`block text-[15px] font-black tracking-tight ${claro ? "text-white" : "text-inst-900"}`}>
          CBTIS No. 270
        </span>
        <span className={`block text-[11px] font-semibold ${claro ? "text-sky-200" : "text-inst-700"}`}>
          Carrera Técnica en Logística
        </span>
      </span>
    </Link>
  );
}
