import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { BotonEnviar } from "@/components/form-estado";
import { Icono } from "@/components/iconos";
import {
  alternarAccesoFormatoAction,
  confirmarAmbitoDocenteAction,
} from "@/lib/actions/formatos-acceso";
import {
  alumnoVeFormato,
  ambitoAlumno,
  ambitoDocente,
  etiquetaAmbito,
  habilitadoPorDocente,
  listarHabilitaciones,
  persistenciaReal,
  veTodoElCatalogo,
  type AmbitoDocente,
  type Habilitacion,
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
  ambito,
  habilitado,
}: {
  codigo: string;
  tipo: "llenable" | "plantilla";
  modulo: number;
  ambito: AmbitoDocente;
  habilitado: boolean;
}) {
  if (ambito.incompleto) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
        <Icono nombre="alerta" tamano={13} />
        Confirma tu grupo arriba
      </span>
    );
  }

  const destino = `${ambito.semestre}° ${ambito.grupos.join(" y ")}`;
  return (
    <form action={alternarAccesoFormatoAction} className="flex items-center">
      <input type="hidden" name="codigo" value={codigo} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="modulo" value={modulo} />
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
        {habilitado ? `Visible para ${destino}` : `Habilitar a ${destino}`}
      </BotonEnviar>
    </form>
  );
}

export default async function FormatosPage() {
  const user = await requireUser();
  const esDocencia = veTodoElCatalogo(user.rol);
  const habilitaciones: Habilitacion[] = await listarHabilitaciones();

  const ambitoD = esDocencia ? await ambitoDocente(user) : null;
  const ambitoA = esDocencia ? null : await ambitoAlumno(user);
  const conBaseDeDatos = esDocencia ? await persistenciaReal() : true;

  // Aviso de la última acción (cookie efímera que escribe la server action)
  const avisoCrudo = (await cookies()).get("cbtis270_formatos_aviso")?.value;
  const aviso = avisoCrudo
    ? (() => {
        const [tipo, ...resto] = decodeURIComponent(avisoCrudo).split("|");
        return { tipo, texto: resto.join("|") };
      })()
    : null;

  /** ¿Este código es visible para quien mira la página? */
  const visible = (codigo: string) =>
    esDocencia ? true : alumnoVeFormato(codigo, ambitoA!, habilitaciones);

  /** ¿Ya está liberado al grupo del docente? */
  const liberado = (codigo: string) =>
    ambitoD ? habilitadoPorDocente(codigo, ambitoD, habilitaciones) : false;

  // Agrupar los formatos llenables por módulo
  const porModulo = [1, 2, 3, 4, 5]
    .map((m) => ({
      modulo: m,
      nombre: NOMBRE_MODULO[m],
      formatos: FORMATOS_DINAMICOS.filter((f) => f.modulo === m && visible(f.codigo)),
    }))
    .filter((g) => g.formatos.length > 0);

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

        {/* Ámbito del docente, tomado de su propio registro */}
        {ambitoD && !ambitoD.incompleto ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-sky-700">
            <Icono nombre="informacion" tamano={14} className="mt-0.5 shrink-0" />
            Al habilitar un formato lo liberas a tu grupo registrado:{" "}
            <strong>{etiquetaAmbito(ambitoD)}</strong>
            {ambitoD.modulo ? ` · Módulo ${ambitoD.modulo}` : ""}. Sólo lo verán los alumnos de ese
            semestre y grupo que te eligieron como docente.
            {ambitoD.origen === "confirmado" ? " (Ámbito confirmado por ti.)" : ""}
          </p>
        ) : null}

      </div>

      {/* Resultado de la última habilitación */}
      {aviso ? (
        <p
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
            aviso.tipo === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-rose-300 bg-rose-50 text-rose-800"
          }`}
        >
          <Icono nombre={aviso.tipo === "ok" ? "verificado" : "alerta"} tamano={16} className="mt-0.5 shrink-0" />
          {aviso.texto}
        </p>
      ) : null}

      {/* Sin base de datos las habilitaciones no se conservan */}
      {esDocencia && !conBaseDeDatos ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          <Icono nombre="alerta" tamano={16} className="mt-0.5 shrink-0" />
          <span>
            La plataforma está funcionando <strong>sin base de datos</strong>. Puedes habilitar
            formatos y tus alumnos los verán, pero la lista se reinicia cada vez que el servidor se
            recicla. Para que las habilitaciones queden guardadas de forma permanente hay que
            configurar la variable <code className="font-mono">DATABASE_URL</code> en Vercel.
          </span>
        </div>
      ) : null}

      {/* Confirmación del ámbito cuando el registro no está disponible */}
      {ambitoD?.incompleto ? (
        <div className="tarjeta tarjeta-estatica p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Icono nombre="usuarios" tamano={16} className="text-inst-700" />
            Confirma a qué grupo le das clase
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            No pudimos leer el semestre y el grupo de tu registro. Confírmalos una vez y todos los
            formatos que habilites se liberarán a ese semestre y grupo, para los alumnos que te
            eligieron como docente.
          </p>
          <form action={confirmarAmbitoDocenteAction} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs font-bold text-slate-600">
              Semestre
              <select
                name="semestre"
                defaultValue={ambitoD.semestre ?? 3}
                className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800"
              >
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <option key={s} value={s}>
                    {s}°
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="text-xs font-bold text-slate-600">
              Grupos
              <div className="mt-1 flex flex-wrap gap-2">
                {["A", "B", "C", "D", "E", "F"].map((g) => (
                  <label
                    key={g}
                    className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-semibold text-slate-700"
                  >
                    <input type="checkbox" name="grupos" value={g} defaultChecked={g === "A"} />
                    {g}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="text-xs font-bold text-slate-600">
              Módulo
              <select
                name="modulo"
                defaultValue={ambitoD.modulo ?? 1}
                className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800"
              >
                {[1, 2, 3, 4, 5].map((m) => (
                  <option key={m} value={m}>
                    Módulo {m}
                  </option>
                ))}
              </select>
            </label>

            <input type="hidden" name="turno" value={user.turno ?? ""} />
            <BotonEnviar className="btn-primario px-4 py-2 text-xs" pendienteTexto="Guardando...">
              Guardar mi grupo
            </BotonEnviar>
          </form>
        </div>
      ) : null}

      {/* Alumno sin formatos liberados */}
      {sinNada ? (
        <div className="tarjeta tarjeta-estatica p-10 text-center">
          <Icono nombre="candado" tamano={34} className="mx-auto text-slate-400" />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            Aún no hay formatos liberados para ti
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {ambitoA?.incompleto
              ? "Tu registro no tiene semestre, grupo o docente tutor completo. Solicita a control escolar que lo capture para poder recibir formatos."
              : `Tu docente todavía no habilita formatos para ${ambitoA?.semestre}° ${ambitoA?.grupo}. Aparecerán aquí en cuanto lo haga.`}
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

          {porModulo.map(({ modulo, nombre, formatos }) => (
            <div key={modulo} className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <span className="rounded-lg bg-inst-700 px-2 py-1 text-[11px] font-black text-white">
                  M{modulo}
                </span>
                {nombre}
                {ambitoD?.modulo === modulo ? (
                  <span className="rounded-full bg-inst-50 px-2 py-0.5 text-[10px] font-bold text-inst-700">
                    Tu módulo
                  </span>
                ) : null}
              </h3>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {formatos.map((f) => {
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

                  if (!esDocencia || !ambitoD) {
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
                          ambito={ambitoD}
                          habilitado={liberado(f.codigo)}
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
            {descargables.map((f) => (
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
                  {ambitoD ? (
                    <ControlAcceso
                      codigo={f.codigo}
                      tipo="plantilla"
                      modulo={f.modulo}
                      ambito={ambitoD}
                      habilitado={liberado(f.codigo)}
                    />
                  ) : null}
                  <a href={f.url} download className="btn-secundario px-4 py-2 text-xs">
                    Descargar .{f.ext}
                  </a>
                </div>
              </div>
            ))}
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
