import type { Metadata } from "next";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { internalMessages, studentProfiles, teacherProfiles, users } from "@/db/schema";
import { BotonEnviar } from "@/components/form-estado";
import { enviarMensajeAction, marcarMensajeLeidoAction } from "@/lib/actions/comunicacion";
import { formatoFechaHora, requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Mensajes" };
export const dynamic = "force-dynamic";

async function destinatariosPara(user: Awaited<ReturnType<typeof requireUser>>) {
  if (user.rol === "admin") {
    return db
      .select({ usuario: users, perfilAlumno: studentProfiles, perfilDocente: teacherProfiles })
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(or(eq(users.rol, "estudiante"), eq(users.rol, "docente")));
  }

  if (user.rol === "docente") {
    const perfiles = await db
      .select()
      .from(teacherProfiles)
      .where(eq(teacherProfiles.userId, user.id))
      .limit(1);
    const perfil = perfiles[0];
    if (!perfil) return [];

    return db
      .select({ usuario: users, perfilAlumno: studentProfiles, perfilDocente: teacherProfiles })
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(
        and(
          eq(users.rol, "estudiante"),
          eq(users.turno, perfil.turnoResponsable ?? ""),
          eq(users.semestre, perfil.semestreResponsable ?? 0),
          perfil.grupoResponsable && perfil.grupoResponsable !== "Todos"
            ? eq(studentProfiles.grupo, perfil.grupoResponsable)
            : undefined,
        ),
      );
  }

  // Alumno: puede escribir a su tutor/docentes y a jefatura.
  const perfilAlumno = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, user.id))
    .limit(1);
  const perfil = perfilAlumno[0];

  const docentes = await db
    .select({ usuario: users, perfilAlumno: studentProfiles, perfilDocente: teacherProfiles })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
    .where(
      or(
        eq(users.rol, "admin"),
        and(
          eq(users.rol, "docente"),
          eq(teacherProfiles.turnoResponsable, user.turno ?? ""),
          eq(teacherProfiles.semestreResponsable, user.semestre ?? 0),
          perfil?.grupo ? or(eq(teacherProfiles.grupoResponsable, perfil.grupo), eq(teacherProfiles.grupoResponsable, "Todos")) : undefined,
        ),
      ),
    );

  return docentes;
}

export default async function MensajesPage() {
  const user = await requireUser();
  const [destinatarios, recibidos, enviados] = await Promise.all([
    destinatariosPara(user),
    db
      .select({ mensaje: internalMessages, de: users.nombre, deRol: users.rol })
      .from(internalMessages)
      .innerJoin(users, eq(users.id, internalMessages.fromUserId))
      .where(eq(internalMessages.toUserId, user.id))
      .orderBy(desc(internalMessages.createdAt))
      .limit(50),
    db
      .select({ mensaje: internalMessages, para: users.nombre, paraRol: users.rol })
      .from(internalMessages)
      .innerJoin(users, eq(users.id, internalMessages.toUserId))
      .where(eq(internalMessages.fromUserId, user.id))
      .orderBy(desc(internalMessages.createdAt))
      .limit(30),
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
