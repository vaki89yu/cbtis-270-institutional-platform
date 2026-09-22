import Image from "next/image";
import Link from "next/link";

export function Escudo({ size = 44 }: { size?: number }) {
  return (
    <div className="relative shrink-0 overflow-hidden rounded-full bg-white p-1 shadow-sm" style={{ width: size, height: size }}>
      <Image
        src="/images/logo-cbtis270.png"
        alt="CBTIS 270"
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </div>
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
