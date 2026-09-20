import type { Metadata } from "next";
import { BotonEnviar, FormEstado } from "@/components/form-estado";
import { avisosRecientes } from "@/lib/consultas";
import {
  alternarAvisoAction,
  crearAvisoAction,
  eliminarAvisoAction,
} from "@/lib/actions/plataforma";
import { formatoFechaHora, requireRole } from "@/lib/guards";
import {
  desactivarBannerAction,
  guardarBannerAction,
  obtenerBanner,
} from "@/lib/actions/banner";

export const metadata: Metadata = { title: "Avisos" };
export const dynamic = "force-dynamic";

const categorias = [
  "General",
  "Prácticas",
  "Académico",
  "Certificaciones",
  "Vinculación",
  "Visitas industriales",
  "Estadías",
];

export default async function AvisosPage() {
  const user = await requireRole("admin", "docente");
  const avisos = await avisosRecientes(30, false);
  const banner = await obtenerBanner();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Avisos de la carrera de Logística</h1>
        <p className="text-sm text-slate-500">
          Administra el aviso urgente de la portada y los comunicados internos de la plataforma.
        </p>
      </div>

      {/* BANNER URGENTE DE PORTADA */}
      <section className="tarjeta p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Aviso urgente en la portada</h2>
            <p className="text-xs text-slate-500">
              Franja superior temporal para suspensiones, cambios de horario o emergencias. Se muestra
              en la página principal pública mientras esté activo.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              banner?.activo ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"
            }`}
          >
            {banner?.activo ? "Activo en portada" : "Inactivo"}
          </span>
        </div>

        <FormEstado
          action={guardarBannerAction}
          submitLabel={banner?.activo ? "Actualizar aviso" : "Guardar aviso"}
          pendienteTexto="Guardando..."
          botonClase="btn-primario"
          className="grid gap-3 md:grid-cols-2"
        >
          <div>
            <label htmlFor="b-titulo" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Título breve
            </label>
            <input
              id="b-titulo"
              name="titulo"
              defaultValue={banner?.titulo ?? ""}
              className="campo"
              placeholder="Suspensión de clases"
            />
          </div>
          <div>
            <label htmlFor="b-nivel" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Nivel
            </label>
            <select id="b-nivel" name="nivel" defaultValue={banner?.nivel ?? "info"} className="campo">
              <option value="info">Informativo (azul)</option>
              <option value="alerta">Alerta (ámbar)</option>
              <option value="urgente">Urgente (rojo)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="b-mensaje" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Mensaje
            </label>
            <textarea
              id="b-mensaje"
              name="mensaje"
              rows={2}
              defaultValue={banner?.mensaje ?? ""}
              className="campo"
              placeholder="Mañana no habrá clases por junta de consejo técnico. Las actividades se reanudan el lunes."
            />
          </div>
          <div>
            <label htmlFor="b-enlace" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Enlace opcional
            </label>
            <input
              id="b-enlace"
              name="enlace"
              defaultValue={banner?.enlace ?? ""}
              className="campo"
              placeholder="https://..."
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={banner?.activo ?? false}
              className="h-4 w-4 rounded border-slate-300"
            />
            Mostrar en la portada
          </label>
        </FormEstado>

        {banner?.activo ? (
          <form action={desactivarBannerAction} className="mt-3">
            <BotonEnviar className="btn-mini text-rose-600" pendienteTexto="...">
              Retirar aviso de la portada ahora
            </BotonEnviar>
          </form>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="tarjeta h-fit p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Nuevo aviso</h2>
          <FormEstado
            action={crearAvisoAction}
            submitLabel="Publicar aviso"
            pendienteTexto="Publicando..."
            botonClase="btn-primario w-full"
          >
            <div>
              <label htmlFor="titulo" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Título
              </label>
              <input id="titulo" name="titulo" required className="campo" placeholder="Visita industrial al CEDIS" />
            </div>
            <div>
              <label htmlFor="categoria" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Categoría
              </label>
              <select id="categoria" name="categoria" className="campo" defaultValue="General">
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="contenido" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Contenido
              </label>
              <textarea
                id="contenido"
                name="contenido"
                rows={5}
                required
                className="campo"
                placeholder="Detalle del comunicado dirigido a la comunidad de Logística."
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="publicado" defaultChecked className="h-4 w-4 rounded border-slate-300" />
              Publicar en el portal público
            </label>
          </FormEstado>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Publicados y borradores ({avisos.length})
          </h2>
          {avisos.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              Aún no se ha publicado ningún aviso.
            </p>
          ) : (
            avisos.map(({ aviso, autor }) => (
              <article key={aviso.id} className="tarjeta p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-inst-50 px-3 py-1 text-[11px] font-bold text-inst-700">
                    {aviso.categoria}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      aviso.publicado ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {aviso.publicado ? "Publicado" : "Borrador"}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900">{aviso.titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">{aviso.contenido}</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  {autor ?? "Sistema"} · {formatoFechaHora(aviso.createdAt)}
                </p>
                <div className="mt-3 flex gap-2">
                  <form action={alternarAvisoAction}>
                    <input type="hidden" name="avisoId" value={aviso.id} />
                    <input type="hidden" name="publicado" value={String(aviso.publicado)} />
                    <BotonEnviar className="btn-mini" pendienteTexto="...">
                      {aviso.publicado ? "Ocultar" : "Publicar"}
                    </BotonEnviar>
                  </form>
                  {user.rol === "admin" ? (
                    <form action={eliminarAvisoAction}>
                      <input type="hidden" name="avisoId" value={aviso.id} />
                      <BotonEnviar className="btn-mini text-rose-600" pendienteTexto="...">
                        Eliminar
                      </BotonEnviar>
                    </form>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
