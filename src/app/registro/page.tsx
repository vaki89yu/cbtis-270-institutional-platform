import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { teacherProfiles, users } from "@/db/schema";
import { MarcaInstitucional } from "@/components/marca";
import { RegistroProfesional } from "@/components/registro-profesional";
import { getCurrentUser } from "@/lib/auth";
import { ESPECIALIDADES } from "@/lib/guards";

export const metadata: Metadata = { title: "Registro de usuarios" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    googleEmail?: string;
    googleVerified?: string;
    googleMode?: string;
    googleName?: string;
  }>;
};

export default async function RegistroPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (user) redirect("/panel");
  const params = searchParams ? await searchParams : {};

  let docentes: Array<{
    id: number;
    nombre: string;
    semestre: number | null;
    grupo: string | null;
    turno: string | null;
  }> = [];

  try {
    const docentesRaw = await db
      .select({ docente: users, perfil: teacherProfiles })
      .from(users)
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(eq(users.rol, "docente"))
      .orderBy(asc(users.nombre));

    docentes = docentesRaw.map(({ docente, perfil }) => {
      const gruposStr = perfil?.gruposResponsables ?? perfil?.grupoResponsable ?? "";
      const turnosStr = perfil?.turnosResponsables ?? perfil?.turnoResponsable ?? "";

      return {
        id: docente.id,
        nombre: docente.nombre,
        semestre: perfil?.semestreResponsable ?? null,
        grupo: gruposStr
          ? gruposStr.split(",").map((g) => g.trim()).filter(Boolean).join(" y ")
          : "E",
        turno: turnosStr
          ? turnosStr.split(",").map((t) => t.trim()).filter(Boolean).join(" y ")
          : "Matutino",
      };
    });
  } catch {
    docentes = [];
  }

  // Fallback demo store si no hay docentes en DB
  if (docentes.length === 0) {
    try {
      const { demoGetAllDocentes } = await import("@/lib/demo-store");
      const demoDocentes = demoGetAllDocentes();
      if (demoDocentes.length > 0) {
        docentes = demoDocentes;
      }
    } catch {}
  }

  return (
    <main className="auth-wallpaper min-h-screen py-6 sm:py-8 lg:py-10">
      <span className="auth-glow -left-24 top-40 h-80 w-80 bg-sky-200/18" />
      <span className="auth-glow -right-24 top-1/3 h-[28rem] w-[28rem] bg-sky-300/14 [animation-delay:-4s]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
        <header className="auth-dark-card flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 sm:px-6">
          <MarcaInstitucional variante="claro" />
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-white/60 sm:inline">
              Registro protegido por OTP
            </span>
            <Link
              href="/login"
              className="rounded-xl border border-white/30 bg-gradient-to-r from-sky-300 to-blue-300 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-sky-300/30 transition hover:from-sky-400 hover:to-blue-400"
            >
              Ya tengo una cuenta
            </Link>
          </div>
        </header>

        <div className="my-7 text-center text-white sm:my-9">
          <span className="auth-kicker">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-200" />
            Registro Oficial · CBTIS No. 270
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight drop-shadow-xl sm:text-4xl">
            Registro de Estudiantes y Docentes de{" "}
            <span className="text-sky-100">Logística</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
            Alta oficial en el sistema institucional. Selecciona tu perfil (alumno o docente),
            verifica tu correo mediante OTP y vincula tus asignaturas por turno y grupo escolar.
          </p>
        </div>

        <RegistroProfesional
          docentes={docentes}
          modulos={ESPECIALIDADES}
          googleEmail={params.googleEmail ?? ""}
          googleVerified={params.googleVerified === "1"}
          googleMode={params.googleMode === "1"}
          googleName={params.googleName ?? ""}
        />

        <footer className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/12 py-5 text-xs text-white/55">
          <Link href="/" className="transition hover:text-sky-200">
            ← Volver al portal institucional
          </Link>
          <span>CBTIS No. 270 · Protección de datos académicos</span>
        </footer>
      </div>
    </main>
  );
}
