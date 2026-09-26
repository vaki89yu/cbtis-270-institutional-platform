import Link from "next/link";
import type { Metadata } from "next";
import { FormEstado } from "@/components/form-estado";
import { crearClaseAction } from "@/lib/actions/plataforma";
import { requireRole } from "@/lib/guards";
import { NOMBRE_MODULO } from "@/lib/formatos/catalogo";

export const metadata: Metadata = { title: "Nueva clase" };
export const dynamic = "force-dynamic";

const colores = ["#1D5BD5", "#3B91F3", "#60B0F8", "#17295A", "#0EA5E9", "#6366F1"];

export default async function NuevaClasePage() {
  await requireRole("docente", "admin");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/panel/clases" className="text-sm text-slate-500 hover:text-inst-700">
          ← Volver a clases
        </Link>
        <h1 className="mt-2 text-2xl font-black text-slate-900">Abrir un aula</h1>
        <p className="text-sm text-slate-500">
          El aula es tu grupo real: número de aula, semestre, grupo y módulo. Los alumnos que te
          eligieron como docente y cursan ese semestre y grupo entran solos, sin inscribirse.
        </p>
      </div>

      <div className="tarjeta p-6">
        <FormEstado
          action={crearClaseAction}
          submitLabel="Abrir el aula"
          pendienteTexto="Abriendo aula..."
          botonClase="btn-primario"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="nombre" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Submódulo / asignatura de Logística
              </label>
              <input
                id="nombre"
                name="nombre"
                required
                className="campo"
                placeholder="Organiza el flujo de mercancías en almacén"
              />
            </div>
            <div>
              <label htmlFor="aula" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Aula
              </label>
              <input id="aula" name="aula" required className="campo" placeholder="Aula 23" />
            </div>
            <div>
              <label htmlFor="clave" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Clave de control
              </label>
              <input id="clave" name="clave" required className="campo" placeholder="LOG-501" />
            </div>
            <div>
              <label htmlFor="modulo" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Módulo profesional que impartes
              </label>
              <select id="modulo" name="modulo" className="campo" defaultValue="2">
                {[1, 2, 3, 4, 5].map((m) => (
                  <option key={m} value={m}>
                    Módulo {m} · {NOMBRE_MODULO[m]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                De aquí salen las actividades y los formatos precargados del aula.
              </p>
            </div>
            <div>
              <label htmlFor="semestre" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Semestre
              </label>
              <select id="semestre" name="semestre" className="campo" defaultValue="3">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <option key={s} value={s}>
                    {s}°
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="grupo" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Grupo
              </label>
              <select id="grupo" name="grupo" className="campo" defaultValue="A">
                {["A", "B", "C", "D", "E", "F"].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="turno" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Turno
              </label>
              <select id="turno" name="turno" className="campo" defaultValue="Matutino">
                <option>Matutino</option>
                <option>Vespertino</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="descripcion" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Descripción del submódulo
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                rows={3}
                className="campo"
                placeholder="Propósito del submódulo, competencias logísticas a desarrollar y forma de evaluación."
              />
            </div>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Color del aula</span>
              <div className="flex flex-wrap gap-3">
                {colores.map((color, i) => (
                  <label key={color} className="cursor-pointer">
                    <input
                      type="radio"
                      name="color"
                      value={color}
                      defaultChecked={i === 0}
                      className="peer sr-only"
                    />
                    <span
                      className="block h-9 w-9 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-900"
                      style={{ backgroundColor: color }}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </FormEstado>
      </div>
    </div>
  );
}
