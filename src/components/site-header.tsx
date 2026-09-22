import Link from "next/link";
import { MarcaInstitucional } from "@/components/marca";
import { getCurrentUser } from "@/lib/auth";

const enlaces = [
  { href: "/#modulos", label: "Módulos" },
  { href: "/#competencias", label: "Competencias" },
  { href: "/#campo", label: "Campo laboral" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-white/15 bg-inst-900/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
        <div className="flex items-center gap-4">
          <MarcaInstitucional variante="claro" />
        </div>
        <nav className="hidden items-center gap-6 lg:flex">
          {enlaces.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className="text-sm font-medium text-inst-100/85 transition hover:text-sky-200"
            >
              {enlace.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/panel" className="btn-oro">
              Mi panel
            </Link>
          ) : (
            <>
              <Link
                href="/registro"
                className="hidden items-center justify-center rounded-xl border border-white/30 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 sm:inline-flex"
              >
                Crear cuenta
              </Link>
              <Link href="/login" className="btn-oro px-3 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm">
                Iniciar sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer id="contacto" className="mt-16 border-t border-white/15 bg-inst-900/70 text-inst-50 backdrop-blur-md">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
        <div>
          <MarcaInstitucional variante="claro" />
          <p className="mt-4 max-w-xs text-sm text-inst-100/80">
            Carrera Técnica en Logística del CBTIS No. 270. Plataforma institucional para el
            seguimiento académico, prácticas, evidencias y comunicación escolar.
          </p>
        </div>
        <div className="text-sm">
          <h3 className="mb-3 font-semibold uppercase tracking-wider text-sky-200">Plantel</h3>
          <ul className="space-y-2 text-inst-100/85">
            <li className="font-semibold text-white">
              Centro de Bachillerato Tecnológico Industrial y de Servicios No. 270
            </li>
            <li>Calle Soneto No. 156, Col. Carlos Castillo Peraza</li>
            <li>C.P. 32575 · Ciudad Juárez, Chihuahua</li>
            <li>CCT: 08DCT0270T</li>
            <li>
              <a href="tel:+526568874342" className="hover:text-white">
                Tel. (656) 887 4342
              </a>
            </li>
            <li>
              <a href="mailto:contacto@cbtis270.edu.mx" className="hover:text-white">
                contacto@cbtis270.edu.mx
              </a>
            </li>
            <li>
              <a
                href="https://www.cbtis270.edu.mx"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
              >
                www.cbtis270.edu.mx
              </a>
            </li>
            <li>Turnos: Matutino y Vespertino</li>
          </ul>
        </div>
        <div className="text-sm md:justify-self-end">
          <h3 className="mb-3 font-semibold uppercase tracking-wider text-sky-200">Accesos</h3>
          <ul className="space-y-2 text-inst-100/85">
            <li>
              <Link href="/login" className="hover:text-white">
                Acceso docentes y alumnos
              </Link>
            </li>
            <li>
              <Link href="/registro" className="hover:text-white">
                Registro de nuevo ingreso
              </Link>
            </li>
            <li>
              <Link href="/panel/clases" className="hover:text-white">
                Aulas de logística
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-inst-100/70">
        © {new Date().getFullYear()} CBTIS No. 270 · Carrera Técnica en Logística · DGETI
      </div>
    </footer>
  );
}
