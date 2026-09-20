"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Enlace = { href: string; label: string; icono: string };

export function PanelNav({ enlaces }: { enlaces: Enlace[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1">
      {enlaces.map((enlace) => {
        const activo =
          enlace.href === "/panel" ? pathname === "/panel" : pathname.startsWith(enlace.href);
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              activo
                ? "bg-white text-inst-800 shadow-md shadow-blue-900/15"
                : "text-sky-100/85 hover:bg-white/15 hover:text-white"
            }`}
          >
            <span aria-hidden>{enlace.icono}</span>
            {enlace.label}
          </Link>
        );
      })}
    </nav>
  );
}
