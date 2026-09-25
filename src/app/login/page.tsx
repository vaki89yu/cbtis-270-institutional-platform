import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AccesoGoogle } from "@/components/acceso-google";
import { FormEstado } from "@/components/form-estado";
import { MarcaInstitucional } from "@/components/marca";
import { loginAction } from "@/lib/actions/auth";
import { getCurrentUser, sesionRecienCerrada } from "@/lib/auth";
import { Icono } from "@/components/iconos";

export const metadata: Metadata = { title: "Acceso a la plataforma" };
export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ google?: string }> };
type CuentaGuardada = { email: string; nombre: string; rol?: string };

const googleMensajes: Record<string, string> = {
  correo: "No fue posible verificar el correo. Intenta de nuevo o regístrate con OTP.",
  inactivo: "Tu cuenta está desactivada. Acude a la Coordinación de Logística.",
  state: "La validación expiró. Inténtalo nuevamente.",
  token: "No fue posible validar el acceso de Google.",
  perfil: "No fue posible obtener el perfil de Google.",
};

function leerJsonCookie<T>(value?: string): T | null {
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

export default async function LoginPage({ searchParams }: Props) {
  // Tras cerrar sesión no se debe reenviar al panel aunque queden restos de
  // la sesión anterior en el navegador.
  const recienCerrada = await sesionRecienCerrada();
  const user = recienCerrada ? null : await getCurrentUser();
  if (user) redirect("/panel");

  const params = searchParams ? await searchParams : {};
  const googleError = params.google ? googleMensajes[params.google] : null;
  const jar = await cookies();
  const cuenta = leerJsonCookie<CuentaGuardada>(jar.get("cbtis270_saved_account")?.value);
  const lista = leerJsonCookie<CuentaGuardada[]>(jar.get("cbtis270_saved_accounts_list")?.value) ?? [];

  return (
    <main className="auth-wallpaper min-h-screen">
      <span className="auth-glow -left-24 top-20 h-72 w-72 bg-sky-200/20" />
      <span className="auth-glow -right-20 bottom-12 h-96 w-96 bg-sky-300/14 [animation-delay:-4s]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] items-stretch lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex min-h-[440px] flex-col justify-between px-6 py-7 text-white sm:px-10 lg:min-h-screen lg:px-16 lg:py-10 xl:px-20">
          <MarcaInstitucional variante="claro" />

          <div className="max-w-2xl py-14 lg:py-8">
            <span className="auth-kicker">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-200" />
              CBTIS No. 270 · DGETI
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.15] tracking-tight drop-shadow-2xl sm:text-5xl xl:text-6xl">
              Plataforma Institucional de la{" "}
              <span className="text-sky-100">
                Carrera Técnica en Logística
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              Portal oficial de acceso y registro para estudiantes y personal docente del plantel.
              Consulta tus aulas, entrega evidencias y da seguimiento académico a tu grupo.
            </p>

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["01", "Estudiantes y Docentes", "Acceso oficial con correo verificado y vinculación de grupo."],
                ["02", "Submódulos y Aulas", "Control de actividades, formatos y prácticas de almacén."],
                ["03", "Control Escolar", "Asignación en grupos E y F, turnos matutino y vespertino."],
              ].map(([num, titulo, desc]) => (
                <div key={num} className="auth-dark-card rounded-2xl p-4">
                  <p className="text-xs font-bold text-sky-200">{num}</p>
                  <p className="mt-1 text-xs font-bold text-white">{titulo}</p>
                  <p className="mt-1 text-[11px] leading-snug text-white/75">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/12 pt-5 text-[11px] text-white/55">
            <span>CBTIS No. 270 · Carrera Técnica en Logística</span>
            <span>Entorno protegido · Sesiones cifradas</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 pb-10 sm:px-8 lg:min-h-screen lg:py-10 lg:pr-12 xl:pr-20">
          <div className="auth-card w-full max-w-xl rounded-[30px] p-5 sm:p-7 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Control Escolar
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Acceso a la Plataforma
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  Ingresa con tu cuenta registrada o solicita tu código de acceso institucional.
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl shadow-sm ring-1 ring-slate-200">
                <Icono nombre="candado" tamano={22} />
              </div>
            </div>

            <div className="auth-rule my-6" />

            {googleError ? (
              <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-semibold text-amber-800">
                {googleError}
              </p>
            ) : null}

            <div className="rounded-2xl border border-slate-200/90 bg-white/70 p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">Acceso con código OTP</p>
                  <p className="mt-0.5 text-xs text-slate-500">Código enviado únicamente a tu correo</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  Recomendado
                </span>
              </div>
              <AccesoGoogle
                savedAccountServer={cuenta}
                serverSavedAccounts={lista}
              />
            </div>

            <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              Correo y contraseña
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <FormEstado action={loginAction} submitLabel="Ingresar a la plataforma" pendienteTexto="Validando acceso...">
              <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Correo electrónico
              </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  defaultValue={cuenta?.email ?? ""}
                  placeholder="nombre@cetis270.edu.mx"
                  className="campo"
                />
              </div>
              <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Contraseña
              </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="campo"
                />
              </div>
            </FormEstado>

            <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-600 ring-1 ring-slate-200">
              ¿Aún no tienes cuenta?{" "}
              <Link href="/registro" className="font-bold text-blue-700 hover:underline">
                Crear una cuenta verificada
              </Link>
            </div>

            <p className="mt-5 text-center text-xs text-slate-400">
              <Link href="/" className="transition hover:text-inst-700">
                ← Volver al portal institucional
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
