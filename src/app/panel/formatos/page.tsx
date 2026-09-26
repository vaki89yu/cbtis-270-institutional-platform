import Link from "next/link";
import type { Metadata } from "next";
import { BotonEnviar } from "@/components/form-estado";
import { Icono } from "@/components/iconos";
import {
  alternarAccesoFormatoAction,
  alternarModuloCompletoAction,
} from "@/lib/actions/formatos-acceso";
import {
  SEMESTRE_DE_MODULO,
  claveHabilitacion,
  clavesHabilitadas,
  veTodoElCatalogo,
} from "@/lib/formatos/acceso";
import { FORMATOS_DINAMICOS, NOMBRE_MODULO } from "@/lib/formatos/catalogo";
import { PLANTILLAS_EXCEL } from "@/lib/formatos/plantillas";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Biblioteca de Formatos Logísticos" };
export const dynamic = "force-dynamic";

/** Interruptor de acceso que ve el docente junto a cada formato. */
function ControlAcceso({
  codigo,
  tipo,
  modulo,
  semestre,
  habilitado,
}: {
  codigo: string;
  tipo: "llenable" | "plantilla";
  modulo: number;
  semestre: number;
  habilitado: boolean;
}) {
  return (
    <form action={alternarAccesoFormatoAction} className="flex items-center gap-2">
      <input type="hidden" name="codigo" value={codigo} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="modulo" value={modulo} />
      <input type="hidden" name="semestre" value={semestre} />
      <input type="hidden" name="habilitar" value={habilitado ? "0" : "1"} />
      <BotonEnviar
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
          habilitado
            ? "bg-emerald-100 text-emerald-800"
            : "border border-slate-300 bg-slate-100 text-slate-600"
        }`}
        pendienteTexto="..."
      >
        <Icono nombre={habilitado ? "verificado" : "candado"} tamano={13} />
        {habilitado ? `Visible para ${semestre}°` : `Oculto · habilitar ${semestre}°`}
      </BotonEnviar>
    </form>
  );
}

export default async function FormatosPage() {
  const user = await requireUser();
  const esDocencia = veTodoElCatalogo(user.rol);
  const habilitadas = await clavesHabilitadas();
  const semestreAlumno = user.semestre ?? null;

  // Formatos llenables agrupados por módulo profesional
  const porModulo = [1, 2, 3, 4, 5]
    .map((m) => {
      const semestre = SEMESTRE_DE_MODULO[m];
      const formatos = FORMATOS_DINAMICOS.filter((f) => f.modulo === m);
      const plantillas = PLANTILLAS_EXCEL.filter((p) => p.modulo === m);

      // El alumno sólo conserva lo habilitado para SU semestre
      const formatosVisibles = esDocencia
        ? formatos
        : semestreAlumno
          ? formatos.filter((f) => habilitadas.has(claveHabilitacion(f.codigo, semestreAlumno)))
          : [];
      const plantillasVisibles = esDocencia
        ? plantillas
        : semestreAlumno
          ? plantillas.filter((p) => habilitadas.has(claveHabilitacion(p.codigo, semestreAlumno)))
          : [];

      const codigosModulo = [...formatos.map((f) => f.codigo), ...plantillas.map((p) => p.codigo)];
      const tiposModulo = [
        ...formatos.map(() => "llenable"),
        ...plantillas.map(() => "plantilla"),
      ];
      const habilitadosModulo = codigosModulo.filter((c) =>
        habilitadas.has(claveHabilitacion(c, semestre)),
      ).length;

      return {
        modulo: m,
        semestre,
        nombre: NOMBRE_MODULO[m],
        formatos: formatosVisibles,
        plantillas: plantillasVisibles,
        codigosModulo,
        tiposModulo,
        habilitadosModulo,
        totalModulo: codigosModulo.length,
      };
    })
    .filter((g) => esDocencia || g.formatos.length > 0 || g.plantillas.length > 0);

  const totalVisibleAlumno = porModulo.reduce(
    (acc, g) => acc + g.formatos.length + g.plantillas.length,
    0,
  );

  return (
    <div className="space-y-8">
      <div>
        <span className="rounded-full bg-inst-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-inst-700">
          Herramientas de industria
        </span>
        <h1 className="mt-2 text-2xl font-black text-slate-900">Biblioteca de Formatos Logísticos</h1>
        <p className="text-sm text-slate-500">
          {esDocencia
            ? "Catálogo completo del plan de estudios. Cada formato se libera al grupo cuando lo habilitas para el semestre que cursa el módulo."
            : "Formatos liberados por tu docente para el semestre que cursas. Puedes llenarlos en línea y descargar la plantilla en Excel."}
        </p>
      </div>

      {/* Aviso de control de acceso para docencia */}
      {esDocencia ? (
        <div className="rounded-2xl border border-sky-300 bg-sky-50/50 p-5">
          <div className="flex items-start gap-3">
            <Icono nombre="informacion" tamano={22} className="mt-0.5 shrink-0 text-sky-700" />
            <div>
              <h2 className="text-sm font-bold text-sky-800">Control de acceso del alumnado</h2>
              <p className="mt-1 text-xs leading-relaxed text-sky-700">
                Docencia y administración ven siempre el catálogo completo. Los alumnos sólo ven un
                formato cuando lo habilitas para su semestre. Cada módulo se libera al semestre que
                le corresponde en el plan DGETI: Módulo I a 2°, II a 3°, III a 4°, IV a 5° y V a 6°.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Alumno sin nada liberado */}
      {!esDocencia && totalVisibleAlumno === 0 ? (
        <div className="tarjeta p-10 text-center">
          <Icono nombre="candado" tamano={34} className="mx-auto text-slate-400" />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            Aún no hay formatos liberados para ti
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {semestreAlumno
              ? `Tu docente todavía no habilita formatos para ${semestreAlumno}° semestre. Aparecerán aquí en cuanto lo haga.`
              : "Tu expediente no tiene semestre registrado. Solicita a control escolar que lo capture para poder recibir formatos."}
          </p>
        </div>
      ) : null}

      {porModulo.map((grupo) => (
        <section key={grupo.modulo} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-start gap-2">
              <span className="rounded-lg bg-inst-700 px-2 py-1 text-[11px] font-black text-white">
                M{grupo.modulo}
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-800">{grupo.nombre}</h2>
                <p className="text-[11px] font-semibold text-slate-500">
                  Se cursa en {grupo.semestre}° semestre
                  {esDocencia
                    ? ` · ${grupo.habilitadosModulo} de ${grupo.totalModulo} liberados al grupo`
                    : ""}
                </p>
              </div>
            </div>

            {/* Atajo: liberar o cerrar el módulo completo */}
            {esDocencia && grupo.totalModulo > 0 ? (
              <form action={alternarModuloCompletoAction} className="flex items-center gap-2">
                <input type="hidden" name="semestre" value={grupo.semestre} />
                <input type="hidden" name="modulo" value={grupo.modulo} />
                <input type="hidden" name="codigos" value={grupo.codigosModulo.join(",")} />
                <input type="hidden" name="tipos" value={grupo.tiposModulo.join(",")} />
                <input
                  type="hidden"
                  name="habilitar"
                  value={grupo.habilitadosModulo === grupo.totalModulo ? "0" : "1"}
                />
                <BotonEnviar className="btn-mini" pendienteTexto="Aplicando...">
                  {grupo.habilitadosModulo === grupo.totalModulo
                    ? `Cerrar módulo a ${grupo.semestre}°`
                    : `Liberar módulo a ${grupo.semestre}°`}
                </BotonEnviar>
              </form>
            ) : null}
          </div>

          {/* Formatos llenables del módulo */}
          {grupo.formatos.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {grupo.formatos.map((f) => {
                const habilitado = habilitadas.has(claveHabilitacion(f.codigo, grupo.semestre));
                return (
                  <div
                    key={f.codigo}
                    className="tarjeta tarjeta-estatica flex flex-col justify-between p-5"
                  >
                    <Link href={`/panel/formatos/${f.codigo}`} className="group block">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-lg bg-inst-50 px-2.5 py-1 text-[11px] font-black text-inst-700">
                          {f.codigo}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Llenable
                        </span>
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-inst-700">
                        {f.titulo}
                      </h4>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                        {f.descripcion}
                      </p>
                      <p className="mt-3 text-[10px] font-semibold text-slate-400">
                        {f.secciones.length} secciones ·{" "}
                        {f.secciones.reduce((a, s) => a + s.campos.length, 0)} campos ·{" "}
                        {f.firmas.length} firmas
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-inst-700">
                        Llenar y ver dictamen imprimible →
                      </span>
                    </Link>

                    {esDocencia ? (
                      <div className="mt-4 border-t border-slate-200 pt-3">
                        <ControlAcceso
                          codigo={f.codigo}
                          tipo="llenable"
                          modulo={grupo.modulo}
                          semestre={grupo.semestre}
                          habilitado={habilitado}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Plantillas Excel del módulo */}
          {grupo.plantillas.length > 0 ? (
            <div className="tarjeta tarjeta-estatica divide-y divide-slate-100">
              {grupo.plantillas.map((p) => {
                const habilitado = habilitadas.has(claveHabilitacion(p.codigo, grupo.semestre));
                return (
                  <div
                    key={p.codigo}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">
                        {p.codigo}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{p.titulo}</p>
                        <p className="truncate text-xs text-slate-500">
                          Plantilla Excel · {p.categoria}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {esDocencia ? (
                        <ControlAcceso
                          codigo={p.codigo}
                          tipo="plantilla"
                          modulo={grupo.modulo}
                          semestre={grupo.semestre}
                          habilitado={habilitado}
                        />
                      ) : null}
                      <a href={p.url} download className="btn-secundario px-4 py-2 text-xs">
                        Descargar .{p.ext}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ))}

      <div className="tarjeta tarjeta-estatica p-5 text-xs text-slate-600">
        <strong className="text-slate-900">Nota institucional:</strong> Los formatos fueron elaborados por
        la Plataforma de Logística del CBTIS No. 270 (CCT 08DCT0270T, Ciudad Juárez, Chihuahua) con fines
        exclusivamente académicos. Cada PDF generado incluye membrete institucional, folio, bloque de firmas
        y control de páginas.
      </div>

      <Link href="/panel" className="btn-secundario inline-flex">
        ← Volver al panel
      </Link>
    </div>
  );
}
