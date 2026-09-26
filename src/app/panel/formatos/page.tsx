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

/** Interruptor de acceso que sólo ve docencia, junto a cada formato. */
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
    <form action={alternarAccesoFormatoAction} className="flex items-center">
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
        {habilitado ? `Visible para ${semestre}°` : `Habilitar a ${semestre}°`}
      </BotonEnviar>
    </form>
  );
}

export default async function FormatosPage() {
  const user = await requireUser();
  const esDocencia = veTodoElCatalogo(user.rol);
  const habilitadas = await clavesHabilitadas();
  const semestreAlumno = user.semestre ?? null;

  /** ¿Este código es visible para quien mira la página? */
  const visible = (codigo: string) =>
    esDocencia
      ? true
      : semestreAlumno
        ? habilitadas.has(claveHabilitacion(codigo, semestreAlumno))
        : false;

  // Agrupar los formatos llenables por módulo
  const porModulo = [1, 2, 3, 4, 5]
    .map((m) => {
      const semestre = SEMESTRE_DE_MODULO[m];
      const formatos = FORMATOS_DINAMICOS.filter((f) => f.modulo === m);
      const plantillas = PLANTILLAS_EXCEL.filter((p) => p.modulo === m);
      const codigosModulo = [...formatos.map((f) => f.codigo), ...plantillas.map((p) => p.codigo)];
      const tiposModulo = [...formatos.map(() => "llenable"), ...plantillas.map(() => "plantilla")];
      return {
        modulo: m,
        semestre,
        nombre: NOMBRE_MODULO[m],
        formatos: formatos.filter((f) => visible(f.codigo)),
        codigosModulo,
        tiposModulo,
        habilitadosModulo: codigosModulo.filter((c) =>
          habilitadas.has(claveHabilitacion(c, semestre)),
        ).length,
        totalModulo: codigosModulo.length,
      };
    })
    .filter((g) => esDocencia || g.formatos.length > 0);

  const llenablesVisibles = porModulo.reduce((a, g) => a + g.formatos.length, 0);
  const descargables = PLANTILLAS_EXCEL.filter((p) => visible(p.codigo));
  const sinNada = !esDocencia && llenablesVisibles === 0 && descargables.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <span className="rounded-full bg-inst-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-inst-700">
          Herramientas de industria
        </span>
        <h1 className="mt-2 text-2xl font-black text-slate-900">Biblioteca de Formatos Logísticos</h1>
        <p className="text-sm text-slate-500">
          Dos modos de trabajo: <strong>llenar en línea</strong> y descargar en PDF con membrete
          institucional, o descargar la plantilla Excel completa de cada formato.
        </p>
        {esDocencia ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-sky-700">
            <Icono nombre="informacion" tamano={14} className="mt-0.5 shrink-0" />
            Docencia ve siempre el catálogo completo. Los alumnos sólo ven los formatos que habilitas
            para su semestre (Módulo I a 2°, II a 3°, III a 4°, IV a 5° y V a 6°).
          </p>
        ) : null}
      </div>

      {/* Alumno sin formatos liberados */}
      {sinNada ? (
        <div className="tarjeta tarjeta-estatica p-10 text-center">
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

      {/* SECCIÓN A: LLENABLES EN PLATAFORMA */}
      {llenablesVisibles > 0 ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-800">
                Llenar en línea · PDF institucional
              </span>
              <h2 className="mt-2 text-xl font-black text-slate-900">
                Formatos llenables por módulo ({llenablesVisibles})
              </h2>
            </div>
          </div>

          {porModulo.map(({ modulo, semestre, nombre, formatos, codigosModulo, tiposModulo, habilitadosModulo, totalModulo }) => (
            <div key={modulo} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <span className="rounded-lg bg-inst-700 px-2 py-1 text-[11px] font-black text-white">
                    M{modulo}
                  </span>
                  {nombre}
                </h3>

                {/* Atajo del docente: liberar o cerrar el módulo completo */}
                {esDocencia && totalModulo > 0 ? (
                  <form action={alternarModuloCompletoAction} className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {habilitadosModulo} de {totalModulo} liberados a {semestre}°
                    </span>
                    <input type="hidden" name="semestre" value={semestre} />
                    <input type="hidden" name="modulo" value={modulo} />
                    <input type="hidden" name="codigos" value={codigosModulo.join(",")} />
                    <input type="hidden" name="tipos" value={tiposModulo.join(",")} />
                    <input
                      type="hidden"
                      name="habilitar"
                      value={habilitadosModulo === totalModulo ? "0" : "1"}
                    />
                    <BotonEnviar className="btn-mini" pendienteTexto="Aplicando...">
                      {habilitadosModulo === totalModulo
                        ? `Cerrar módulo a ${semestre}°`
                        : `Liberar módulo a ${semestre}°`}
                    </BotonEnviar>
                  </form>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {formatos.map((f) => {
                  const habilitado = habilitadas.has(claveHabilitacion(f.codigo, semestre));
                  const contenido = (
                    <>
                      <div>
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
                      </div>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-inst-700">
                        Llenar y ver dictamen imprimible →
                      </span>
                    </>
                  );

                  if (!esDocencia) {
                    return (
                      <Link
                        key={f.codigo}
                        href={`/panel/formatos/${f.codigo}`}
                        className="tarjeta tarjeta-estatica group flex flex-col justify-between p-5"
                      >
                        {contenido}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={f.codigo}
                      className="tarjeta tarjeta-estatica group flex flex-col justify-between p-5"
                    >
                      <Link
                        href={`/panel/formatos/${f.codigo}`}
                        className="flex flex-1 flex-col justify-between"
                      >
                        {contenido}
                      </Link>
                      <div className="mt-4 border-t border-slate-200 pt-3">
                        <ControlAcceso
                          codigo={f.codigo}
                          tipo="llenable"
                          modulo={modulo}
                          semestre={semestre}
                          habilitado={habilitado}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {/* SECCIÓN B: PLANTILLAS EXCEL DESCARGABLES */}
      {descargables.length > 0 ? (
        <section className="space-y-5 border-t border-slate-200 pt-8">
          <div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
              Plantillas Excel con datos de ejemplo
            </span>
            <h2 className="mt-2 text-xl font-black text-slate-900">
              Descarga directa de plantillas ({descargables.length})
            </h2>
            <p className="text-sm text-slate-500">
              Archivos .xlsx con encabezado institucional, ejemplos cargados e instrucciones.
            </p>
          </div>

          <div className="tarjeta tarjeta-estatica divide-y divide-slate-100">
            {descargables.map((f) => {
              const semestre = SEMESTRE_DE_MODULO[f.modulo];
              const habilitado = habilitadas.has(claveHabilitacion(f.codigo, semestre));
              return (
                <div key={f.codigo} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">
                      {f.codigo}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{f.titulo}</p>
                      <p className="truncate text-xs text-slate-500">
                        {f.categoria}
                        {esDocencia ? ` · Módulo ${f.modulo}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {esDocencia ? (
                      <ControlAcceso
                        codigo={f.codigo}
                        tipo="plantilla"
                        modulo={f.modulo}
                        semestre={semestre}
                        habilitado={habilitado}
                      />
                    ) : null}
                    <a href={f.url} download className="btn-secundario px-4 py-2 text-xs">
                      Descargar .{f.ext}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

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
