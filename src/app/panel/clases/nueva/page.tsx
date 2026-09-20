import Link from "next/link";
import type { Metadata } from "next";
import { FormEstado } from "@/components/form-estado";
import { crearClaseAction } from "@/lib/actions/plataforma";
import { ESPECIALIDADES, requireRole } from "@/lib/guards";

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
        <h1 className="mt-2 text-2xl font-black text-slate-900">Habilitar aula de Logística</h1>
        <p className="text-sm text-slate-500">
          Define el submódulo, el grupo y el turno. Los alumnos de la carrera podrán inscribirse
          desde el catálogo.
        </p>
      </div>

      <div className="tarjeta p-6">
        <FormEstado
          action={crearClaseAction}
          submitLabel="Crear clase"
          pendienteTexto="Creando clase..."
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
                placeholder="Control de inventarios y conteo cíclico"
              />
            </div>
            <div>
              <label htmlFor="clave" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Clave del aula
              </label>
              <input id="clave" name="clave" required className="campo" placeholder="LOG-401" />
            </div>
            <div>
              <label htmlFor="especialidad" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Módulo profesional
              </label>
              <select
                id="especialidad"
                name="especialidad"
                className="campo"
                defaultValue="Gestión de Almacenes e Inventarios"
              >
                {ESPECIALIDADES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="semestre" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Semestre
              </label>
              <select id="semestre" name="semestre" className="campo" defaultValue="3">
                {[3, 4, 5, 6].map((s) => (
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
              <select id="grupo" name="grupo" className="campo" defaultValue="E">
                <option value="E">E</option>
                <option value="F">F</option>
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
            <div>
              <label htmlFor="aula" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Aula, almacén o laboratorio
              </label>
              <input id="aula" name="aula" className="campo" placeholder="Almacén escuela · Edificio C" />
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
