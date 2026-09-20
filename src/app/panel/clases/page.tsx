import Link from "next/link";
import type { Metadata } from "next";
import { BotonEnviar } from "@/components/form-estado";
import { catalogoDeClases, clasesDelDocente, clasesDelEstudiante } from "@/lib/consultas";
import { darseDeBajaAction, inscribirseAction } from "@/lib/actions/plataforma";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Clases" };
export const dynamic = "force-dynamic";

export default async function ClasesPage() {
  const user = await requireUser();

  if (user.rol === "estudiante") {
    const misClases = await clasesDelEstudiante(user.id);
    const catalogo = await catalogoDeClases();
    const inscritas = new Set(misClases.map((c) => c.curso.id));

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Mis aulas de Logística</h1>
          <p className="text-sm text-slate-500">
            Inscríbete a los submódulos de Logística que cursas este semestre.
          </p>
        </div>

        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
            Inscritas ({misClases.length})
          </h2>
          {misClases.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Todavía no tienes aulas. Revisa el catálogo de la carrera abajo.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {misClases.map(({ curso, docente }) => (
                <article key={curso.id} className="tarjeta overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: curso.color }} />
                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {curso.clave}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">{curso.nombre}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {curso.semestre}° {curso.grupo} · {curso.turno} · Prof. {docente}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <Link href={`/panel/clases/${curso.id}`} className="btn-primario flex-1">
                        Entrar
                      </Link>
                      <form action={darseDeBajaAction}>
                        <input type="hidden" name="courseId" value={curso.id} />
                        <BotonEnviar className="btn-mini" pendienteTexto="...">
                          Baja
                        </BotonEnviar>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
            Catálogo de la carrera de Logística
          </h2>
          <div className="tarjeta divide-y divide-slate-100">
            {catalogo.map(({ curso, docente, inscritos }) => (
              <div key={curso.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-1.5 rounded-full" style={{ backgroundColor: curso.color }} />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{curso.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {curso.clave} · {curso.semestre}° {curso.grupo} · Prof. {docente} · {inscritos}{" "}
                      inscritos
                    </p>
                  </div>
                </div>
                {inscritas.has(curso.id) ? (
                  <span className="rounded-full bg-inst-50 px-3 py-1.5 text-xs font-semibold text-inst-700">
                    Ya inscrito
                  </span>
                ) : (
                  <form action={inscribirseAction}>
                    <input type="hidden" name="courseId" value={curso.id} />
                    <BotonEnviar className="btn-secundario" pendienteTexto="Inscribiendo...">
                      Inscribirme
                    </BotonEnviar>
                  </form>
                )}
              </div>
            ))}
            {catalogo.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Los docentes aún no publican aulas de Logística.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  const misClases = user.rol === "docente" ? await clasesDelDocente(user.id) : [];
  const catalogo = await catalogoDeClases();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {user.rol === "docente" ? "Mis aulas de Logística" : "Aulas de la carrera de Logística"}
          </h1>
          <p className="text-sm text-slate-500">
            Administra grupos, formatos logísticos, prácticas y evidencias.
          </p>
        </div>
        <Link href="/panel/clases/nueva" className="btn-primario">
          + Nueva aula
        </Link>
      </div>

      {user.rol === "docente" ? (
        misClases.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            Aún no has creado ninguna aula. Da clic en <strong>Nueva aula</strong> para habilitar tu
            primer submódulo de Logística.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {misClases.map(({ curso, inscritos }) => (
              <Link
                key={curso.id}
                href={`/panel/clases/${curso.id}`}
                className="tarjeta overflow-hidden transition hover:shadow-md"
              >
                <div className="h-2" style={{ backgroundColor: curso.color }} />
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {curso.clave}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{curso.nombre}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {curso.semestre}° {curso.grupo} · {curso.turno} · {curso.aula ?? "Sin aula"}
                  </p>
                  <p className="mt-4 text-sm font-semibold text-inst-700">{inscritos} estudiantes</p>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : null}

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
          Todas las aulas ({catalogo.length})
        </h2>
        <div className="tarjeta divide-y divide-slate-100">
          {catalogo.map(({ curso, docente, inscritos }) => (
            <Link
              key={curso.id}
              href={`/panel/clases/${curso.id}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <span className="h-10 w-1.5 rounded-full" style={{ backgroundColor: curso.color }} />
                <div>
                  <p className="text-sm font-bold text-slate-900">{curso.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {curso.clave} · {curso.semestre}° {curso.grupo} · {curso.turno} · Prof. {docente}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-inst-700">{inscritos} inscritos</span>
            </Link>
          ))}
          {catalogo.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Sin aulas registradas.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
