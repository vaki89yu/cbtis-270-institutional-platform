import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Examen } from "@/components/cuestionarios/examen";
import { Icono } from "@/components/iconos";
import { cuestionarioParaElAlumno, cuestionarioPorClave } from "@/lib/academico/cuestionarios";
import { intentosDelAlumno } from "@/lib/academico/evaluaciones";
import { NOMBRE_MODULO } from "@/lib/formatos/catalogo";
import { formatoFechaHora, requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Cuestionario" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ clave: string }> };

export default async function CuestionarioPage({ params }: Props) {
  const { clave } = await params;
  const completo = cuestionarioPorClave(clave);
  if (!completo) notFound();

  const user = await requireUser();

  // Versión pública: sin respuestas correctas ni explicaciones
  const paraElAlumno = cuestionarioParaElAlumno(clave);
  if (!paraElAlumno) notFound();

  const historial = await intentosDelAlumno(user.id, clave);
  const mejor = historial.reduce<number | null>(
    (max, intento) => (max === null || intento.calificacion > max ? intento.calificacion : max),
    null,
  );

  return (
    <div className="space-y-6">
      <Link href="/panel/cuestionarios" className="btn-mini">
        ← Cuestionarios
      </Link>

      <header className="tarjeta p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-inst-50 px-2.5 py-1 text-xs font-black text-inst-800">
                {completo.clave}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {completo.parcial}° parcial
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {completo.preguntas.length} reactivos · {completo.minutos} min
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {completo.puntos} puntos
              </span>
            </div>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-slate-900">
              <Icono nombre="cuestionario" tamano={22} className="text-inst-700" />
              {completo.titulo}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{completo.descripcion}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {NOMBRE_MODULO[completo.modulo] ?? `Módulo ${completo.modulo}`} · {completo.submodulo}
            </p>
          </div>

          {historial.length > 0 ? (
            <div className="w-full max-w-xs rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-inst-700">Tu historial</p>
              <p className="mt-1 text-sm text-slate-600">
                {historial.length} {historial.length === 1 ? "intento" : "intentos"} · mejor marca{" "}
                <strong className="text-slate-900">{mejor}</strong>
              </p>
              <ul className="mt-3 space-y-1">
                {historial.slice(0, 5).map((intento) => (
                  <li key={intento.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{formatoFechaHora(intento.createdAt)}</span>
                    <span className="font-bold text-slate-800">
                      {intento.calificacion} · {intento.correctas}/{intento.total}
                      {intento.agotado ? " · tiempo agotado" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </header>

      <Examen cuestionario={paraElAlumno} />
    </div>
  );
}
