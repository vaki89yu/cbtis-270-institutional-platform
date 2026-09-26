import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { FormatoLlenable } from "@/components/formatos/formato-llenable";
import { Icono } from "@/components/iconos";
import {
  alumnoVeFormato,
  ambitoAlumno,
  listarHabilitaciones,
  veTodoElCatalogo,
} from "@/lib/formatos/acceso";
import { NOMBRE_MODULO, obtenerFormato } from "@/lib/formatos/catalogo";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  const formato = obtenerFormato(codigo);
  return { title: formato ? `${formato.codigo} · ${formato.titulo}` : "Formato" };
}

export default async function FormatoLlenablePage({ params }: Props) {
  const user = await requireUser();
  const { codigo } = await params;
  const formato = obtenerFormato(decodeURIComponent(codigo));
  if (!formato) notFound();

  // El alumno sólo entra si su docente tutor liberó el formato a su grupo.
  const permitido = veTodoElCatalogo(user.rol)
    ? true
    : alumnoVeFormato(formato.codigo, await ambitoAlumno(user), await listarHabilitaciones());
  if (!permitido) {
    return (
      <div className="space-y-6">
        <Link href="/panel/formatos" className="btn-mini">
          ← Biblioteca de formatos
        </Link>
        <div className="tarjeta tarjeta-estatica p-10 text-center">
          <Icono nombre="candado" tamano={36} className="mx-auto text-slate-400" />
          <h1 className="mt-3 text-lg font-black text-slate-900">Formato no disponible todavía</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            El formato <strong>{formato.codigo} · {formato.titulo}</strong> pertenece al{" "}
            {NOMBRE_MODULO[formato.modulo]} y tu docente tutor aún no lo libera para tu
            semestre y grupo.
          </p>
          <Link href="/panel/formatos" className="btn-secundario mt-5 inline-flex">
            Ver los formatos disponibles para mí
          </Link>
        </div>
      </div>
    );
  }

  let docentes: Array<{ id: number; nombre: string }> = [];
  try {
    docentes = await db
      .select({ id: users.id, nombre: users.nombre })
      .from(users)
      .where(eq(users.rol, "docente"))
      .orderBy(asc(users.nombre));
  } catch {
    docentes = [];
  }

  const totalCampos = formato.secciones.reduce((a, s) => a + s.campos.length, 0);

  const perfilUsuario = {
    nombre: user.nombre,
    matricula: user.matricula,
    grupo: user.rol === "estudiante" ? "E" : "E",
    semestre: String(user.semestre ?? "2"),
    turno: user.turno ?? "Matutino",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/panel/formatos" className="btn-mini">
          ← Biblioteca de formatos
        </Link>
        <span className="rounded-full bg-inst-50 px-3 py-1 text-xs font-bold text-inst-700">
          {formato.codigo}
        </span>
      </div>

      <header className="tarjeta-azul tarjeta-estatica rounded-2xl p-6 text-white">
        <span className="rounded-full bg-white/25 px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-white/30">
          {NOMBRE_MODULO[formato.modulo]}
        </span>
        <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{formato.titulo}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-sky-50/90">{formato.descripcion}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-white/20 px-3 py-1 ring-1 ring-white/30">
            {formato.secciones.length} secciones
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 ring-1 ring-white/30">
            {totalCampos} campos
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 ring-1 ring-white/30">
            {formato.referenciaNormativa}
          </span>
        </div>
      </header>

      <FormatoLlenable formato={formato} docentes={docentes} perfilUsuario={perfilUsuario} />
    </div>
  );
}
