import type { Metadata } from "next";
import Link from "next/link";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendances, courses, submissions, users } from "@/db/schema";
import { Icono } from "@/components/iconos";
import { alumnosEnRiesgo } from "@/lib/academico/riesgo";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Seguimiento y riesgo" };
export const dynamic = "force-dynamic";

const COLOR_NIVEL: Record<string, string> = {
  alto: "bg-rose-100 text-rose-800 border-rose-200",
  medio: "bg-amber-100 text-amber-800 border-amber-200",
  ninguno: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default async function SeguimientoPage() {
  const user = await requireUser();

  if (user.rol === "estudiante") {
    return (
      <div className="tarjeta p-10 text-center">
        <Icono nombre="candado" tamano={36} className="mx-auto text-slate-300" />
        <h1 className="mt-3 text-lg font-black text-slate-900">Sección de docentes</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          El seguimiento de riesgo lo consulta tu docente y la jefatura. Tu avance lo ves en{" "}
          <Link href="/panel/calificaciones" className="font-bold text-inst-700 underline">
            Mi boleta
          </Link>
          .
        </p>
      </div>
    );
  }

  const esAdmin = user.rol === "admin";
  const enRiesgo = await alumnosEnRiesgo(esAdmin ? {} : { docenteId: user.id });
  const altos = enRiesgo.filter((a) => a.nivel === "alto");
  const medios = enRiesgo.filter((a) => a.nivel === "medio");

  // Indicadores de dirección
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);

  const [alumnosTotal] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.rol, "estudiante"), eq(users.activo, true)));
  const [docentesTotal] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.rol, "docente"), eq(users.activo, true)));
  const [aulasTotal] = await db.select({ n: count() }).from(courses).where(eq(courses.activo, true));

  const asistenciaMes = await db
    .select({
      estado: attendances.estado,
      n: count(),
    })
    .from(attendances)
    .where(gte(attendances.fecha, hace30))
    .groupBy(attendances.estado);

  const totalAsistencias = asistenciaMes.reduce((a, b) => a + Number(b.n), 0);
  const presentes = asistenciaMes
    .filter((a) => a.estado === "presente" || a.estado === "justificado")
    .reduce((a, b) => a + Number(b.n), 0);
  const tasaAsistencia = totalAsistencias > 0 ? Math.round((presentes / totalAsistencias) * 100) : null;

  const [porCalificar] = await db
    .select({ n: count() })
    .from(submissions)
    .where(sql`${submissions.calificacion} is null`);

  const indicadores: Array<[string, string, string]> = [
    ["Alumnos activos", String(alumnosTotal?.n ?? 0), "bg-inst-50 text-inst-800"],
    ["Docentes activos", String(docentesTotal?.n ?? 0), "bg-sky-50 text-sky-800"],
    ["Aulas abiertas", String(aulasTotal?.n ?? 0), "bg-violet-50 text-violet-800"],
    [
      "Asistencia 30 días",
      tasaAsistencia !== null ? `${tasaAsistencia}%` : "—",
      tasaAsistencia !== null && tasaAsistencia < 80 ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800",
    ],
    ["Evidencias por calificar", String(porCalificar?.n ?? 0), "bg-amber-50 text-amber-800"],
    ["Alumnos en riesgo alto", String(altos.length), altos.length > 0 ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-600"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Seguimiento y alerta temprana</h1>
        <p className="text-sm text-slate-500">
          {esAdmin
            ? "Indicadores del plantel y alumnos que necesitan intervención."
            : "Tus alumnos que se están quedando atrás, detectados automáticamente."}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {indicadores.map(([titulo, valor, color]) => (
          <div key={titulo} className={`rounded-2xl p-4 ${color}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{titulo}</p>
            <p className="mt-1 text-3xl font-black">{valor}</p>
          </div>
        ))}
      </section>

      <section className="tarjeta p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Icono nombre="alerta" tamano={20} className="text-rose-600" />
          Alumnos que requieren atención ({enRiesgo.length})
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Regla automática: 3 faltas seguidas, asistencia menor al 80%, 2 o más actividades sin
          entregar o promedio reprobatorio.
        </p>

        {enRiesgo.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-center">
            <Icono nombre="verificado" tamano={32} className="mx-auto text-emerald-600" />
            <p className="mt-2 text-sm font-bold text-emerald-800">
              Ningún alumno en riesgo por ahora
            </p>
            <p className="text-xs text-emerald-700">
              Todos van al corriente con asistencia y entregas.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {[...altos, ...medios].map((a) => (
              <div key={a.id} className={`rounded-xl border p-4 ${COLOR_NIVEL[a.nivel]}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">
                        Riesgo {a.nivel}
                      </span>
                      <p className="text-sm font-black">{a.nombre}</p>
                    </div>
                    <p className="mt-0.5 text-xs opacity-80">
                      {a.matricula ?? "sin matrícula"} · {a.semestre ?? "?"}° {a.grupo ?? ""}
                      {a.cursoNombre ? ` · ${a.cursoNombre}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-semibold">
                      {a.motivos.join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link href={`/panel/expedientes/${a.id}`} className="btn-mini bg-white/80">
                      Expediente
                    </Link>
                    <Link href="/panel/mensajes" className="btn-mini bg-white/80">
                      Escribirle
                    </Link>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                  <span className="rounded-lg bg-white/60 py-1">
                    Asistencia {a.porcentajeAsistencia !== null ? `${a.porcentajeAsistencia}%` : "—"}
                  </span>
                  <span className="rounded-lg bg-white/60 py-1">Sin entregar {a.sinEntregar}</span>
                  <span className="rounded-lg bg-white/60 py-1">
                    Promedio {a.promedio !== null ? Math.round(a.promedio / 10 * 10) / 10 : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
