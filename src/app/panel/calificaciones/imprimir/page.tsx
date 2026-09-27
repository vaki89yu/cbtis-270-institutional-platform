import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, users } from "@/db/schema";
import { BotonImprimir } from "@/components/boton-imprimir";
import { concentradoCalificaciones } from "@/lib/academico/aula";
import { NOMBRE_MODULO } from "@/lib/formatos/catalogo";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Concentrado para imprimir" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ aula?: string }> };

const INST = {
  sep: "SECRETARÍA DE EDUCACIÓN PÚBLICA",
  dgeti: "DIRECCIÓN GENERAL DE EDUCACIÓN TECNOLÓGICA INDUSTRIAL Y DE SERVICIOS",
  plantel: "CENTRO DE BACHILLERATO TECNOLÓGICO INDUSTRIAL Y DE SERVICIOS No. 270",
  carrera: "CARRERA TÉCNICA EN LOGÍSTICA",
  cct: "08DCT0270T",
};

const PARCIALES = [1, 2, 3];

function fechaLarga() {
  const d = new Date();
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `Ciudad Juárez, Chihuahua, a ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

export default async function ConcentradoImprimible({ searchParams }: Props) {
  const user = await requireUser();
  const { aula } = await searchParams;
  const courseId = Number(aula);
  if (!Number.isFinite(courseId)) notFound();

  const [fila] = await db
    .select({ curso: courses, docente: users.nombre })
    .from(courses)
    .innerJoin(users, eq(users.id, courses.docenteId))
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!fila) notFound();
  if (user.rol !== "admin" && fila.curso.docenteId !== user.id) notFound();

  const datos = await concentradoCalificaciones(courseId);
  const actividades = datos.actividades as { id: number; titulo: string; parcial: number | null }[];

  const promedio = (studentId: number, parcial?: number) => {
    const rel = parcial ? actividades.filter((a) => (a.parcial ?? 1) === parcial) : actividades;
    const notas = rel
      .map((a) => datos.notas.get(`${studentId}|${a.id}`))
      .filter((n): n is number => typeof n === "number");
    if (notas.length === 0) return null;
    return Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) / 10 * 10) / 10;
  };

  return (
    <div className="mx-auto max-w-[1000px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/panel/calificaciones?aula=${courseId}`} className="btn-mini">
          ← Volver al concentrado
        </Link>
        <BotonImprimir />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm print:border-0 print:shadow-none">
        <header className="border-b-2 border-slate-800 pb-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider">{INST.sep}</p>
          <p className="text-[9px] uppercase tracking-wide text-slate-600">{INST.dgeti}</p>
          <h1 className="mt-1 text-sm font-black uppercase">{INST.plantel}</h1>
          <p className="text-[10px] font-semibold uppercase text-slate-600">
            {INST.carrera} · C.C.T. {INST.cct}
          </p>
          <h2 className="mt-2 text-xs font-black uppercase tracking-wider">
            Concentrado de calificaciones
          </h2>
        </header>

        <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-[11px] sm:grid-cols-4">
          <p><span className="font-bold">Aula:</span> {fila.curso.aula ?? fila.curso.clave}</p>
          <p><span className="font-bold">Semestre y grupo:</span> {fila.curso.semestre}° {fila.curso.grupo}</p>
          <p><span className="font-bold">Turno:</span> {fila.curso.turno}</p>
          <p><span className="font-bold">Docente:</span> {fila.docente}</p>
          <p className="col-span-2 sm:col-span-4">
            <span className="font-bold">Módulo:</span>{" "}
            {fila.curso.modulo ? `${fila.curso.modulo} · ${NOMBRE_MODULO[fila.curso.modulo]}` : fila.curso.nombre}
          </p>
        </div>

        <table className="mt-4 w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-left">#</th>
              <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-left">Matrícula</th>
              <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-left">Nombre del alumno</th>
              {PARCIALES.map((p) => (
                <th key={p} className="border border-slate-400 bg-slate-100 px-1 py-1 text-center">
                  Parcial {p}
                </th>
              ))}
              <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center">Final</th>
              <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center">Firma</th>
            </tr>
          </thead>
          <tbody>
            {datos.alumnos.map((al, i) => (
              <tr key={al.id}>
                <td className="border border-slate-400 px-1 py-1">{i + 1}</td>
                <td className="border border-slate-400 px-1 py-1">{al.matricula ?? ""}</td>
                <td className="border border-slate-400 px-1 py-1">{al.nombre}</td>
                {PARCIALES.map((p) => (
                  <td key={p} className="border border-slate-400 px-1 py-1 text-center font-semibold">
                    {promedio(al.id, p) ?? ""}
                  </td>
                ))}
                <td className="border border-slate-400 px-1 py-1 text-center font-black">
                  {promedio(al.id) ?? ""}
                </td>
                <td className="border border-slate-400 px-1 py-1" />
              </tr>
            ))}
            {datos.alumnos.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-slate-400 px-2 py-6 text-center text-slate-500">
                  Sin alumnos registrados en esta aula.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <p className="mt-6 text-right text-[10px]">{fechaLarga()}</p>

        <div className="mt-10 grid grid-cols-2 gap-10 text-center text-[10px]">
          <div>
            <div className="mx-auto w-4/5 border-t border-slate-800 pt-1">{fila.docente}</div>
            <p className="font-semibold uppercase">Docente del módulo</p>
          </div>
          <div>
            <div className="mx-auto w-4/5 border-t border-slate-800 pt-1">&nbsp;</div>
            <p className="font-semibold uppercase">Jefatura de la carrera de Logística</p>
          </div>
        </div>
      </div>
    </div>
  );
}
