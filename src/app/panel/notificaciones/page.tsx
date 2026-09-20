import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { BotonEnviar } from "@/components/form-estado";
import { marcarNotificacionLeidaAction, marcarTodasLeidasAction } from "@/lib/actions/comunicacion";
import { formatoFechaHora, requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Notificaciones" };
export const dynamic = "force-dynamic";

const estilos: Record<string, string> = {
  registro_alumno: "border-l-inst-600 bg-inst-50",
  inicio_sesion_alumno: "border-l-sky-600 bg-sky-50",
  mensaje: "border-l-inst-500 bg-amber-50",
  registro_docente: "border-l-purple-600 bg-purple-50",
  bienvenida: "border-l-emerald-600 bg-emerald-50",
};

export default async function NotificacionesPage() {
  const user = await requireUser();
  const lista = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(80);

  const sinLeer = lista.filter((n) => !n.leida).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Notificaciones</h1>
          <p className="text-sm text-slate-500">
            Registro de avisos automáticos: alumnos registrados, inicios de sesión, mensajes y eventos
            de seguimiento académico.
          </p>
        </div>
        {sinLeer > 0 ? (
          <form action={marcarTodasLeidasAction}>
            <BotonEnviar className="btn-secundario" pendienteTexto="Marcando...">
              Marcar todas como leídas ({sinLeer})
            </BotonEnviar>
          </form>
        ) : null}
      </div>

      {lista.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          Aún no tienes notificaciones.
        </p>
      ) : (
        <section className="space-y-3">
          {lista.map((n) => (
            <article
              key={n.id}
              className={`rounded-2xl border border-slate-200 border-l-4 p-5 ${
                estilos[n.tipo] ?? "border-l-slate-400 bg-white"
              } ${n.leida ? "opacity-70" : "shadow-sm"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">{n.titulo}</h2>
                    {!n.leida ? (
                      <span className="rounded-full bg-inst-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Nueva
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{n.contenido}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatoFechaHora(n.createdAt)} · {n.tipo}</p>
                </div>
                {!n.leida ? (
                  <form action={marcarNotificacionLeidaAction}>
                    <input type="hidden" name="notificationId" value={n.id} />
                    <BotonEnviar className="btn-mini" pendienteTexto="...">
                      Leída
                    </BotonEnviar>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
