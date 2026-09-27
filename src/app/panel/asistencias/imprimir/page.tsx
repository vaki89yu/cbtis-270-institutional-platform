import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { attendances, courses, users } from "@/db/schema";
import { BotonImprimir } from "@/components/boton-imprimir";
import { alumnosDelAula } from "@/lib/academico/aula";
import { NOMBRE_MODULO } from "@/lib/formatos/catalogo";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Lista de asistencia" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ aula?: string; mes?: string }> };

const INST = {
  sep: "SECRETARÍA DE EDUCACIÓN PÚBLICA",
  dgeti: "DIRECCIÓN GENERAL DE EDUCACIÓN TECNOLÓGICA INDUSTRIAL Y DE SERVICIOS",
  plantel: "CENTRO DE BACHILLERATO TECNOLÓGICO INDUSTRIAL Y DE SERVICIOS No. 270",
  carrera: "CARRERA TÉCNICA EN LOGÍSTICA",
  cct: "08DCT0270T",
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const SIGLA: Record<string, string> = {
  presente: "A",
  retardo: "R",
  falta: "F",
  justificado: "J",
};

export default async function ListaAsistenciaImprimible({ searchParams }: Props) {
  const user = await requireUser();
  const { aula, mes } = await searchParams;
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

  const hoy = new Date();
  const [anioSel, mesSel] = (mes ?? `${hoy.getFullYear()}-${hoy.getMonth() + 1}`)
    .split("-")
    .map(Number);
  const desde = new Date(anioSel, mesSel - 1, 1, 0, 0, 0);
  const hasta = new Date(anioSel, mesSel, 0, 23, 59, 59);
  const diasDelMes = hasta.getDate();

  const alumnos = await alumnosDelAula(courseId);
  const registros = await db
    .select({
      studentId: attendances.studentId,
      estado: attendances.estado,
      fecha: attendances.fecha,
    })
    .from(attendances)
    .where(
      and(
        eq(attendances.courseId, courseId),
        gte(attendances.fecha, desde),
        lte(attendances.fecha, hasta),
      ),
    )
    .orderBy(asc(attendances.fecha));

  const mapa = new Map<string, string>();
  for (const r of registros) {
    const dia = new Date(r.fecha).getDate();
    mapa.set(`${r.studentId}|${dia}`, SIGLA[r.estado] ?? "");
  }

  const dias = Array.from({ length: diasDelMes }, (_, i) => i + 1).filter((d) => {
    const wd = new Date(anioSel, mesSel - 1, d).getDay();
    return wd !== 0 && wd !== 6; // sin sábados ni domingos
  });

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/panel/asistencias" className="btn-mini">
          ← Volver a asistencias
        </Link>
        <form className="flex items-center gap-2">
          <input type="hidden" name="aula" value={courseId} />
          <input
            type="month"
            name="mes"
            defaultValue={`${anioSel}-${String(mesSel).padStart(2, "0")}`}
            className="campo w-44 text-sm"
          />
          <button type="submit" className="btn-secundario px-4 py-2 text-sm">
            Ver mes
          </button>
        </form>
        <BotonImprimir />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:border-0 print:shadow-none">
        <header className="border-b-2 border-slate-800 pb-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider">{INST.sep}</p>
          <p className="text-[9px] uppercase tracking-wide text-slate-600">{INST.dgeti}</p>
          <h1 className="mt-1 text-sm font-black uppercase">{INST.plantel}</h1>
          <p className="text-[10px] font-semibold uppercase text-slate-600">
            {INST.carrera} · C.C.T. {INST.cct}
          </p>
          <h2 className="mt-2 text-xs font-black uppercase tracking-wider">
            Lista de asistencia · {MESES[mesSel - 1]} {anioSel}
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

        <table className="mt-4 w-full border-collapse text-[9px]">
          <thead>
            <tr>
              <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-left">#</th>
              <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-left">Nombre del alumno</th>
              {dias.map((d) => (
                <th key={d} className="border border-slate-400 bg-slate-100 px-0.5 py-1 text-center">
                  {d}
                </th>
              ))}
              <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center">%</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((al, i) => {
              const marcas = dias.map((d) => mapa.get(`${al.id}|${d}`) ?? "");
              const conRegistro = marcas.filter((m) => m !== "");
              const buenas = conRegistro.filter((m) => m === "A" || m === "J").length;
              const pct = conRegistro.length > 0 ? Math.round((buenas / conRegistro.length) * 100) : null;
              return (
                <tr key={al.id}>
                  <td className="border border-slate-400 px-1 py-0.5">{i + 1}</td>
                  <td className="border border-slate-400 px-1 py-0.5 whitespace-nowrap">{al.nombre}</td>
                  {marcas.map((m, j) => (
                    <td
                      key={j}
                      className={`border border-slate-400 px-0.5 py-0.5 text-center font-bold ${
                        m === "F" ? "text-rose-700" : m === "R" ? "text-amber-700" : ""
                      }`}
                    >
                      {m}
                    </td>
                  ))}
                  <td className="border border-slate-400 px-1 py-0.5 text-center font-black">
                    {pct !== null ? `${pct}%` : ""}
                  </td>
                </tr>
              );
            })}
            {alumnos.length === 0 ? (
              <tr>
                <td colSpan={dias.length + 3} className="border border-slate-400 px-2 py-6 text-center text-slate-500">
                  Sin alumnos registrados en esta aula.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <p className="mt-2 text-[9px] text-slate-600">
          A = asistencia · R = retardo · F = falta · J = justificada
        </p>

        <div className="mt-10 grid grid-cols-2 gap-10 text-center text-[10px]">
          <div>
            <div className="mx-auto w-4/5 border-t border-slate-800 pt-1">{fila.docente}</div>
            <p className="font-semibold uppercase">Docente del módulo</p>
          </div>
          <div>
            <div className="mx-auto w-4/5 border-t border-slate-800 pt-1">&nbsp;</div>
            <p className="font-semibold uppercase">Control escolar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
