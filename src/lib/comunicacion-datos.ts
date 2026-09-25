/**
 * Capa de datos de Notificaciones y Mensajes internos.
 *
 * Los apartados de comunicación consultaban la base de datos directamente, de
 * modo que cualquier fallo de conexión (o la ausencia de DATABASE_URL en
 * producción) hacía reventar la página completa. Aquí cada consulta intenta
 * primero PostgreSQL y, si falla, se resuelve contra el almacén demo, de forma
 * que los apartados siguen operando en lugar de mostrar un error.
 */

import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { internalMessages, notifications, studentProfiles, teacherProfiles, users } from "@/db/schema";
import {
  demoCreateMessage,
  demoCreateNotification,
  demoListMessagesReceived,
  demoListMessagesSent,
  demoListNotifications,
  demoListarDestinatarios,
  demoMarkAllNotificationsRead,
  demoMarkMessageRead,
  demoMarkNotificationRead,
} from "@/lib/demo-store";

export type UsuarioSesion = {
  id: number;
  rol: string;
  turno?: string | null;
  semestre?: number | null;
};

/** Ejecuta la consulta contra la DB y, si falla, usa el respaldo demo. */
async function conRespaldo<T>(consulta: () => Promise<T>, respaldo: () => T, etiqueta: string): Promise<T> {
  try {
    return await consulta();
  } catch (error) {
    console.warn(
      `[comunicacion] ${etiqueta} sin base de datos, usando modo demo:`,
      (error as Error).message?.slice(0, 150),
    );
    return respaldo();
  }
}

/** Indica si la consulta se resolvió contra PostgreSQL o contra el modo demo. */
export async function hayBaseDeDatos(): Promise<boolean> {
  try {
    await db.select({ id: users.id }).from(users).limit(1);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------ NOTIFICACIONES ------------------------------ */

export async function listarNotificaciones(userId: number) {
  return conRespaldo(
    () =>
      db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(80),
    () => demoListNotifications(userId),
    "listarNotificaciones",
  );
}

export async function marcarNotificacionLeida(id: number, userId: number) {
  return conRespaldo(
    async () => {
      await db
        .update(notifications)
        .set({ leida: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    },
    () => demoMarkNotificationRead(id, userId),
    "marcarNotificacionLeida",
  );
}

export async function marcarTodasNotificacionesLeidas(userId: number) {
  return conRespaldo(
    async () => {
      await db.update(notifications).set({ leida: true }).where(eq(notifications.userId, userId));
    },
    () => demoMarkAllNotificationsRead(userId),
    "marcarTodasNotificacionesLeidas",
  );
}

export async function crearNotificacionSegura(data: {
  userId: number;
  titulo: string;
  contenido: string;
  tipo: string;
}) {
  return conRespaldo(
    async () => {
      await db.insert(notifications).values({
        userId: data.userId,
        titulo: data.titulo,
        contenido: data.contenido,
        tipo: data.tipo,
      });
    },
    () => {
      demoCreateNotification(data);
    },
    "crearNotificacion",
  );
}

/* --------------------------------- MENSAJES -------------------------------- */

export async function listarMensajesRecibidos(userId: number) {
  return conRespaldo(
    () =>
      db
        .select({ mensaje: internalMessages, de: users.nombre, deRol: users.rol })
        .from(internalMessages)
        .innerJoin(users, eq(users.id, internalMessages.fromUserId))
        .where(eq(internalMessages.toUserId, userId))
        .orderBy(desc(internalMessages.createdAt))
        .limit(50),
    () => demoListMessagesReceived(userId),
    "listarMensajesRecibidos",
  );
}

export async function listarMensajesEnviados(userId: number) {
  return conRespaldo(
    () =>
      db
        .select({ mensaje: internalMessages, para: users.nombre, paraRol: users.rol })
        .from(internalMessages)
        .innerJoin(users, eq(users.id, internalMessages.toUserId))
        .where(eq(internalMessages.fromUserId, userId))
        .orderBy(desc(internalMessages.createdAt))
        .limit(30),
    () => demoListMessagesSent(userId),
    "listarMensajesEnviados",
  );
}

export async function crearMensaje(data: {
  fromUserId: number;
  toUserId: number;
  asunto: string;
  contenido: string;
}) {
  return conRespaldo(
    async () => {
      await db.insert(internalMessages).values(data);
    },
    () => {
      demoCreateMessage(data);
    },
    "crearMensaje",
  );
}

export async function marcarMensajeLeido(id: number, userId: number) {
  return conRespaldo(
    async () => {
      await db
        .update(internalMessages)
        .set({ leido: true })
        .where(and(eq(internalMessages.id, id), eq(internalMessages.toUserId, userId)));
    },
    () => demoMarkMessageRead(id, userId),
    "marcarMensajeLeido",
  );
}

/* ------------------------------ DESTINATARIOS ------------------------------ */

type Destinatario = {
  usuario: { id: number; nombre: string; rol: string; semestre: number | null; turno: string | null };
  perfilAlumno: { grupo: string } | null;
  perfilDocente: unknown | null;
};

function seleccionDestinatarios() {
  return db
    .select({
      usuario: {
        id: users.id,
        nombre: users.nombre,
        rol: users.rol,
        semestre: users.semestre,
        turno: users.turno,
      },
      perfilAlumno: studentProfiles,
      perfilDocente: teacherProfiles,
    })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id));
}

export async function listarDestinatarios(user: UsuarioSesion): Promise<Destinatario[]> {
  return conRespaldo(
    async () => {
      if (user.rol === "admin") {
        return (await seleccionDestinatarios().where(
          or(eq(users.rol, "estudiante"), eq(users.rol, "docente")),
        )) as unknown as Destinatario[];
      }

      if (user.rol === "docente") {
        const perfiles = await db
          .select()
          .from(teacherProfiles)
          .where(eq(teacherProfiles.userId, user.id))
          .limit(1);
        const perfil = perfiles[0];
        if (!perfil) return [] as Destinatario[];

        return (await seleccionDestinatarios().where(
          and(
            eq(users.rol, "estudiante"),
            perfil.turnoResponsable ? eq(users.turno, perfil.turnoResponsable) : undefined,
            perfil.semestreResponsable ? eq(users.semestre, perfil.semestreResponsable) : undefined,
            perfil.grupoResponsable && perfil.grupoResponsable !== "Todos"
              ? eq(studentProfiles.grupo, perfil.grupoResponsable)
              : undefined,
          ),
        )) as unknown as Destinatario[];
      }

      // Alumno: jefatura y docentes de su turno/semestre
      const perfilAlumno = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, user.id))
        .limit(1);
      const perfil = perfilAlumno[0];

      return (await seleccionDestinatarios().where(
        or(
          eq(users.rol, "admin"),
          and(
            eq(users.rol, "docente"),
            user.turno ? eq(teacherProfiles.turnoResponsable, user.turno) : undefined,
            user.semestre ? eq(teacherProfiles.semestreResponsable, user.semestre) : undefined,
            perfil?.grupo
              ? or(
                  eq(teacherProfiles.grupoResponsable, perfil.grupo),
                  eq(teacherProfiles.grupoResponsable, "Todos"),
                )
              : undefined,
          ),
        ),
      )) as unknown as Destinatario[];
    },
    () => demoListarDestinatarios(user) as unknown as Destinatario[],
    "listarDestinatarios",
  );
}

/** Valida si un usuario puede escribirle a otro. */
export async function puedeEnviarA(from: UsuarioSesion, toUserId: number): Promise<boolean> {
  if (from.rol === "admin") return true;
  const destinatarios = await listarDestinatarios(from);
  return destinatarios.some((d) => d.usuario.id === toUserId);
}
