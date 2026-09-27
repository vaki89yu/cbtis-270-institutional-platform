import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, studentProfiles, users } from "@/db/schema";
import { BotonEnviar, FormEstado } from "@/components/form-estado";
import {
  alternarActivoAction,
  cambiarRolAction,
  crearUsuarioAction,
  reasignarTutorAction,
  restablecerPasswordAction,
} from "@/lib/actions/plataforma";
import { ESPECIALIDADES, formatoFecha, formatoFechaHora, requireRole } from "@/lib/guards";

export const metadata: Metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const admin = await requireRole("admin");

  const lista = await db.select().from(users).orderBy(desc(users.createdAt));
  const docentes = lista.filter((u) => u.rol === "docente" && u.activo);
  const perfiles = await db
    .select({ userId: studentProfiles.userId, tutorDocenteId: studentProfiles.tutorDocenteId })
    .from(studentProfiles);
  const tutorPorAlumno = new Map(perfiles.map((p) => [p.userId, p.tutorDocenteId]));
  const bitacora = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(25)
    .catch(() => []);
  const conteo = {
    admin: lista.filter((u) => u.rol === "admin").length,
    docente: lista.filter((u) => u.rol === "docente").length,
    estudiante: lista.filter((u) => u.rol === "estudiante").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Gestión de usuarios</h1>
        <p className="text-sm text-slate-500">
          Alta de docentes de Logística, cambio de rol y control de acceso a la plataforma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["Jefatura", conteo.admin],
            ["Docentes de Logística", conteo.docente],
            ["Alumnos", conteo.estudiante],
          ] as const
        ).map(([etiqueta, valor]) => (
          <div key={etiqueta} className="tarjeta p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{etiqueta}</p>
            <p className="mt-1 text-3xl font-black text-inst-700">{valor}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <section className="tarjeta h-fit p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Registrar usuario</h2>
          <FormEstado
            action={crearUsuarioAction}
            submitLabel="Crear cuenta"
            pendienteTexto="Creando..."
            botonClase="btn-primario w-full"
          >
            <input name="nombre" required className="campo" placeholder="Nombre completo" />
            <input name="email" type="email" required className="campo" placeholder="correo@cbtis270.edu.mx" />
            <input name="password" type="password" required className="campo" placeholder="Contraseña temporal" />
            <select name="rol" className="campo" defaultValue="docente">
              <option value="docente">Docente de Logística</option>
              <option value="estudiante">Estudiante</option>
              <option value="admin">Administración</option>
            </select>
            <input name="matricula" className="campo" placeholder="Matrícula o número de empleado" />
            <select name="especialidad" className="campo" defaultValue="">
              <option value="">Sin módulo profesional asignado</option>
              {ESPECIALIDADES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </FormEstado>
        </section>

        <section className="tarjeta overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Docente encargado</th>
                  <th className="px-4 py-3">Acceso</th>
                  <th className="px-4 py-3">Alta</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((u) => (
                  <tr key={u.id} className={u.activo ? "" : "opacity-60"}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{u.nombre}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                      {u.especialidad ? (
                        <p className="text-[11px] text-slate-400">{u.especialidad}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <form action={cambiarRolAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <select name="rol" defaultValue={u.rol} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                          <option value="estudiante">Estudiante</option>
                          <option value="docente">Docente de Logística</option>
                          <option value="admin">Admin</option>
                        </select>
                        <BotonEnviar className="btn-mini" pendienteTexto="...">
                          Guardar
                        </BotonEnviar>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      {u.rol === "estudiante" ? (
                        <form action={reasignarTutorAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="studentId" value={u.id} />
                          <select
                            name="tutorDocenteId"
                            defaultValue={String(tutorPorAlumno.get(u.id) ?? "")}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                          >
                            <option value="">Sin asignar</option>
                            {docentes.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.nombre}
                              </option>
                            ))}
                          </select>
                          <BotonEnviar className="btn-mini" pendienteTexto="...">
                            Mover
                          </BotonEnviar>
                        </form>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <form action={restablecerPasswordAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          name="temporal"
                          minLength={6}
                          required
                          placeholder="temporal"
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        />
                        <BotonEnviar className="btn-mini" pendienteTexto="...">
                          Reset
                        </BotonEnviar>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatoFecha(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.id === admin.id ? (
                        <span className="text-xs font-semibold text-inst-700">Tu cuenta</span>
                      ) : (
                        <form action={alternarActivoAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="activo" value={String(u.activo)} />
                          <BotonEnviar
                            className={`btn-mini ${u.activo ? "text-rose-600" : "text-inst-700"}`}
                            pendienteTexto="..."
                          >
                            {u.activo ? "Desactivar" : "Activar"}
                          </BotonEnviar>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="tarjeta p-6">
        <h2 className="text-lg font-bold text-slate-900">Bitácora de auditoría</h2>
        <p className="mt-1 text-xs text-slate-500">
          Quién habilitó, activó, calificó o movió algo, y cuándo. Últimos 25 movimientos.
        </p>
        <div className="mt-4 divide-y divide-slate-100">
          {bitacora.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
              <div className="min-w-0">
                <p className="font-bold text-slate-800">
                  {b.accion.replace(/_/g, " ")}
                  {b.actor ? <span className="font-semibold text-slate-500"> · {b.actor}</span> : null}
                </p>
                {b.detalle ? <p className="truncate text-slate-500">{b.detalle}</p> : null}
              </div>
              <span className="shrink-0 text-slate-400">{formatoFechaHora(b.createdAt)}</span>
            </div>
          ))}
          {bitacora.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Todavía no hay movimientos registrados.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
