import Link from "next/link";
import type { Metadata } from "next";
import { Icono } from "@/components/iconos";
import { aulasDelAlumno } from "@/lib/academico/aula";
import { clasesDelDocente } from "@/lib/consultas";
import { NOMBRE_MODULO } from "@/lib/formatos/catalogo";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Aulas" };
export const dynamic = "force-dynamic";

export default async function ClasesPage() {
  const user = await requireUser();

  /* ------------------------------- ALUMNO ------------------------------- */
  if (user.rol === "estudiante") {
    const misAulas = await aulasDelAlumno(user.id);

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Mis aulas</h1>
          <p className="text-sm text-slate-500">
            Entras automáticamente a las aulas que abre tu docente para tu semestre y tu grupo. No
            necesitas inscribirte a nada.
          </p>
        </div>

        {misAulas.length === 0 ? (
          <div className="tarjeta p-10 text-center">
            <Icono nombre="aulas" tamano={34} className="mx-auto text-slate-400" />
            <h2 className="mt-3 text-base font-bold text-slate-900">Todavía no tienes aulas</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Aparecerán en cuanto el docente que elegiste en tu registro abra un aula para tu
              semestre y tu grupo. Si crees que ya debería aparecer, revisa con control escolar que
              tu grupo y tu docente estén bien capturados.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {misAulas.map(({ curso, docente }) => (
              <Link
                key={curso.id}
                href={`/panel/clases/${curso.id}`}
                className="tarjeta overflow-hidden"
              >
                <div className="h-2" style={{ backgroundColor: curso.color }} />
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {curso.aula ?? curso.clave} · {curso.turno}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{curso.nombre}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {curso.semestre}° {curso.grupo}
                    {curso.modulo ? ` · Módulo ${curso.modulo}` : ""} · Prof. {docente}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-inst-700">
                    Entrar al aula →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------- DOCENTE ------------------------------ */
  const misClases = await clasesDelDocente(user.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Mis aulas</h1>
          <p className="text-sm text-slate-500">
            Cada aula es un grupo real: semestre, grupo y módulo. La lista de alumnos se llena sola
            con quienes te eligieron como docente.
          </p>
        </div>
        <Link href="/panel/clases/nueva" className="btn-primario">
          Abrir un aula
        </Link>
      </div>

      {misClases.length === 0 ? (
        <div className="tarjeta p-10 text-center">
          <Icono nombre="aulas" tamano={34} className="mx-auto text-slate-400" />
          <h2 className="mt-3 text-base font-bold text-slate-900">Aún no abres ningún aula</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Abre por ejemplo el <strong>Aula 23</strong> para 5° E del Módulo IV. Tus alumnos
            entrarán solos y ahí podrás pasar lista, activar formatos y activar las actividades del
            plan de estudios.
          </p>
          <Link href="/panel/clases/nueva" className="btn-primario mt-5 inline-flex">
            Abrir mi primera aula
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {misClases.map(({ curso, inscritos }) => (
            <Link key={curso.id} href={`/panel/clases/${curso.id}`} className="tarjeta overflow-hidden">
              <div className="h-2" style={{ backgroundColor: curso.color }} />
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {curso.aula ?? curso.clave}
                  </p>
                  <span className="rounded-full bg-inst-50 px-2 py-0.5 text-[10px] font-bold text-inst-700">
                    {inscritos} alumnos
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{curso.nombre}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {curso.semestre}° {curso.grupo} · {curso.turno}
                </p>
                {curso.modulo ? (
                  <p className="mt-2 text-[11px] font-semibold text-slate-400">
                    Módulo {curso.modulo}: {NOMBRE_MODULO[curso.modulo]}
                  </p>
                ) : null}
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-inst-700">
                  Entrar al aula →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
