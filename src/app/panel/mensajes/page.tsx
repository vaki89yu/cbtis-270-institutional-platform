import type { Metadata } from "next";
import { BotonEnviar } from "@/components/form-estado";
import { enviarMensajeAction, marcarMensajeLeidoAction } from "@/lib/actions/comunicacion";
import {
  listarDestinatarios,
  listarMensajesEnviados,
  listarMensajesRecibidos,
} from "@/lib/comunicacion-datos";
import { formatoFechaHora, requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Mensajes" };
export const dynamic = "force-dynamic";

export default async function MensajesPage() {
  const user = await requireUser();
  const [destinatarios, recibidos, enviados] = await Promise.all([
    listarDestinatarios(user),
    listarMensajesRecibidos(user.id),
    listarMensajesEnviados(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Mensajes internos</h1>
        <p className="text-sm text-slate-500">
          Comunicación personal entre docente y alumno. Los docentes solo ven a los alumnos del
          semestre, grupo y turno que tienen asignado.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.3fr]">
        <section className="tarjeta h-fit p-6">
          <h2 className="text-lg font-bold text-slate-900">Enviar mensaje</h2>
          <p className="mt-1 text-sm text-slate-500">
            Selecciona destinatario y escribe una nota, recordatorio o seguimiento.
          </p>
          <form action={enviarMensajeAction} className="mt-5 space-y-3">
            <select name="toUserId" required className="campo" defaultValue="">
              <option value="" disabled>
                Seleccionar destinatario
              </option>
              {destinatarios
                .filter((d) => d.usuario.id !== user.id)
                .map((d) => (
                  <option key={d.usuario.id} value={d.usuario.id}>
                    {d.usuario.nombre} · {d.usuario.rol}
                    {d.usuario.rol === "estudiante"
                      ? ` · ${d.usuario.semestre ?? "?"}° ${d.perfilAlumno?.grupo ?? ""} ${d.usuario.turno ?? ""}`
                      : ""}
                  </option>
                ))}
            </select>
            <input name="asunto" required className="campo" placeholder="Asunto" />
            <textarea
              name="contenido"
              required
              rows={5}
              className="campo"
              placeholder="Escribe el mensaje para el alumno o docente..."
            />
            <BotonEnviar className="btn-primario w-full" pendienteTexto="Enviando...">
              Enviar mensaje
            </BotonEnviar>
          </form>
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
              Bandeja de entrada ({recibidos.length})
            </h2>
            {recibidos.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                No tienes mensajes recibidos.
              </p>
            ) : (
              <div className="space-y-3">
                {recibidos.map(({ mensaje, de, deRol }) => (
                  <article
                    key={mensaje.id}
                    className={`tarjeta border-l-4 p-5 ${mensaje.leido ? "border-l-slate-300 opacity-75" : "border-l-inst-500"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{mensaje.asunto}</p>
                        <p className="text-xs text-slate-500">
                          De: {de} · {deRol} · {formatoFechaHora(mensaje.createdAt)}
                        </p>
                      </div>
                      {!mensaje.leido ? (
                        <form action={marcarMensajeLeidoAction}>
                          <input type="hidden" name="messageId" value={mensaje.id} />
                          <BotonEnviar className="btn-mini" pendienteTexto="...">
                            Leído
                          </BotonEnviar>
                        </form>
                      ) : null}
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{mensaje.contenido}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
              Enviados ({enviados.length})
            </h2>
            {enviados.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Aún no has enviado mensajes.
              </p>
            ) : (
              <div className="space-y-3">
                {enviados.map(({ mensaje, para, paraRol }) => (
                  <article key={mensaje.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                    <p className="text-sm font-bold text-slate-900">{mensaje.asunto}</p>
                    <p className="text-xs text-slate-500">
                      Para: {para} · {paraRol} · {formatoFechaHora(mensaje.createdAt)}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">{mensaje.contenido}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
