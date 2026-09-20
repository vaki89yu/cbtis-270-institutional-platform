import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { AccesoGoogle } from "@/components/acceso-google";
import { MarcaInstitucional } from "@/components/marca";
import { getGoogleCredentials } from "@/lib/google";

export const metadata: Metadata = { title: "Verificación de cuenta" };
export const dynamic = "force-dynamic";

type Cuenta = { email: string; nombre: string; rol?: string };

function leerJson<T>(value?: string): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(value)) as T;
    } catch {
      return null;
    }
  }
}

export default async function GooglePage() {
  const oauthOficial = await getGoogleCredentials();
  const jar = await cookies();
  const lista = leerJson<Cuenta[]>(jar.get("cbtis270_saved_accounts_list")?.value) ?? [];
  const cuenta = leerJson<Cuenta>(jar.get("cbtis270_saved_account")?.value);

  return (
    <main className="auth-wallpaper flex min-h-screen items-center justify-center px-4 py-8 sm:py-12">
      <span className="auth-glow -left-24 top-24 h-80 w-80 bg-sky-200/18" />
      <span className="auth-glow -right-20 bottom-10 h-96 w-96 bg-sky-300/14 [animation-delay:-4s]" />

      <div className="relative w-full max-w-lg">
        <div className="mb-5 flex items-center justify-between gap-4 px-1">
          <MarcaInstitucional variante="claro" />
          <span className="hidden rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/65 backdrop-blur sm:inline-flex">
            Verificación segura
          </span>
        </div>

        <section className="auth-card overflow-hidden rounded-[32px]">
          <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-sky-50/50 to-slate-50/50 px-7 pb-6 pt-8 sm:px-9">
            <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-sky-200/25 blur-3xl" />
            <div className="relative">
              <div className="mb-6 flex items-center gap-1 text-2xl font-medium tracking-tight" aria-label="Google">
                <span className="text-blue-600">G</span>
                <span className="text-red-500">o</span>
                <span className="text-yellow-500">o</span>
                <span className="text-blue-600">g</span>
                <span className="text-green-600">l</span>
                <span className="text-red-500">e</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                CBTIS No. 270 · Control de Acceso
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Acceso a la Plataforma</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Selecciona tu cuenta registrada en este dispositivo o escribe tu correo para recibir el código de acceso institucional.
              </p>
            </div>
          </div>

          {oauthOficial ? (
            <div className="px-7 pt-6 sm:px-9">
              <a
                href="/api/auth/google"
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <span className="font-bold text-sky-400">G</span>
                Abrir selector oficial de Google
              </a>
            </div>
          ) : null}

          <div className="px-7 py-6 sm:px-9">
            <AccesoGoogle savedAccountServer={cuenta} serverSavedAccounts={lista} />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-200/80 bg-slate-50/80 px-7 py-4 text-xs sm:px-9">
            <Link href="/login" className="font-bold text-blue-700 transition hover:text-blue-900">
              ← Volver al inicio
            </Link>
            <span className="text-slate-400">Código válido por 10 minutos</span>
          </div>
        </section>

        <p className="mt-5 text-center text-[11px] text-white/55">
          Tus datos de acceso se protegen y solo las cuentas utilizadas quedan visibles en este dispositivo.
        </p>
      </div>
    </main>
  );
}
