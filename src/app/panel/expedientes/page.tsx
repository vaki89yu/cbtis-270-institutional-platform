import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  expedienteCompletoEstudiante,
  listaExpedientesEstudiantes,
} from "@/lib/consultas";
import { formatoFecha, requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Expediente del Alumno · Logística" };
export const dynamic = "force-dynamic";

export default async function ExpedientesPage() {
  const user = await requireUser();

  // Si es estudiante, redirige directo a su propio expediente
  if (user.rol === "estudiante") {
    redirect(`/panel/expedientes/${user.id}`);
  }

  // El docente sólo ve a sus alumnos; la administración ve a todos
  const lista = await listaExpedientesEstudiantes({
    docenteId: user.rol === "docente" ? user.id : null,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-inst-700 bg-inst-50 px-3 py-1 rounded-full">
            Seguimiento Escolar Oficial
          </span>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Expedientes de Alumnos</h1>
          <p className="text-sm text-slate-500">
            {user.rol === "docente"
              ? "Alumnos que te eligieron como docente en su registro: matrícula, grupo, asistencia y desempeño."
              : "Ficha técnica, registro de matrícula, tutor asignado y desempeño del alumnado de Logística."}
          </p>
        </div>
      </div>

      <div className="tarjeta overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Estudiante</th>
                <th className="px-5 py-3.5">Matrícula / CE</th>
                <th className="px-5 py-3.5">Grupo y Turno</th>
                <th className="px-5 py-3.5">Asistencias</th>
                <th className="px-5 py-3.5">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map(({ alumno, perfil, asistenciasTotal, presentes }) => {
                const porcentaje =
                  asistenciasTotal > 0 ? Math.round((presentes / asistenciasTotal) * 100) : 100;
                const enRiesgo = asistenciasTotal > 0 && porcentaje < 80;

                return (
                  <tr key={alumno.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{alumno.nombre}</p>
                      <p className="text-xs text-slate-500">{alumno.email}</p>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-slate-700">
                      {alumno.matricula ?? perfil?.numeroControl ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-700">
                      <span className="font-bold">{alumno.semestre ?? 3}° Grupo {perfil?.grupo ?? alumno.turno?.slice(0, 1) ?? "E"}</span> · {alumno.turno}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          enRiesgo ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {porcentaje}% ({presentes}/{asistenciasTotal})
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/panel/expedientes/${alumno.id}`}
                        className="btn-secundario text-xs py-1.5 px-3"
                      >
                        Ver Expediente →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
