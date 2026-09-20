import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { BotonEnviar, FormEstado } from "@/components/form-estado";
import {
  alternarActivoAction,
  cambiarRolAction,
  crearUsuarioAction,
} from "@/lib/actions/plataforma";
import { ESPECIALIDADES, formatoFecha, requireRole } from "@/lib/guards";

export const metadata: Metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const admin = await requireRole("admin");

  const lista = await db.select().from(users).orderBy(desc(users.createdAt));
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
    </div>
  );
}
