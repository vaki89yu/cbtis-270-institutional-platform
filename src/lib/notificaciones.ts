import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { notifications, studentProfiles, teacherProfiles, userActivity, users } from "@/db/schema";

export async function registrarActividad(userId: number | null, accion: string, detalle?: string) {
  if (userId === null || userId === 0) return;
  try {
    await db.insert(userActivity).values({ userId, accion, detalle: detalle ?? null });
  } catch (error) {
    console.error("No se pudo registrar la actividad (no bloqueante):", error);
  }
}

export async function crearNotificacion(
  userId: number,
  titulo: string,
  contenido: string,
  tipo = "sistema",
) {
  try {
    await db.insert(notifications).values({ userId, titulo, contenido, tipo });
  } catch (error) {
    console.error("No se pudo crear la notificación (no bloqueante):", error);
  }
}

export async function docentesResponsables({
  turno,
  semestre,
  grupo,
  tutorDocenteId,
}: {
  turno: string | null;
  semestre: number | null;
  grupo?: string | null;
  tutorDocenteId?: number | null;
}) {
  const condiciones = [];
  if (semestre) condiciones.push(eq(teacherProfiles.semestreResponsable, semestre));

  const rows = await db
    .select({ docente: users, perfil: teacherProfiles })
    .from(teacherProfiles)
    .innerJoin(users, eq(users.id, teacherProfiles.userId))
    .where(condiciones.length > 0 ? and(...condiciones, eq(teacherProfiles.recibeNotificaciones, true)) : eq(teacherProfiles.recibeNotificaciones, true));

  const lista = (valores: string | null | undefined, fallback: string | null | undefined) => {
    const base = valores ?? fallback ?? "";
    return base
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const mapa = new Map<number, typeof rows[number]>();
  for (const row of rows) {
    const turnos = lista(row.perfil.turnosResponsables, row.perfil.turnoResponsable);
    const grupos = lista(row.perfil.gruposResponsables, row.perfil.grupoResponsable);
    const turnoOk = !turno || turnos.length === 0 || turnos.includes(turno);
    const grupoOk = !grupo || grupos.length === 0 || grupos.includes(grupo) || grupos.includes("Todos");
    if (turnoOk && grupoOk) mapa.set(row.docente.id, row);
  }

  if (tutorDocenteId) {
    const tutor = await db
      .select({ docente: users, perfil: teacherProfiles })
      .from(users)
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(eq(users.id, tutorDocenteId))
      .limit(1);
    if (tutor[0]) mapa.set(tutorDocenteId, tutor[0] as typeof rows[number]);
  }

  return Array.from(mapa.values());
}

export async function notificarDocentesRegistroAlumno({
  alumnoId,
  nombre,
  numeroControl,
  turno,
  semestre,
  grupo,
  tutorDocenteId,
}: {
  alumnoId: number;
  nombre: string;
  numeroControl: string;
  turno: string | null;
  semestre: number | null;
  grupo: string | null;
  tutorDocenteId?: number | null;
}) {
  const docentes = await docentesResponsables({ turno, semestre, grupo, tutorDocenteId });
  for (const { docente } of docentes) {
    await crearNotificacion(
      docente.id,
      "Nuevo alumno registrado",
      `${nombre} (${numeroControl}) completó su registro en ${semestre ?? "?"}° semestre, grupo ${grupo ?? "?"}, turno ${turno ?? "?"}.`,
      "registro_alumno",
    );
  }
  await registrarActividad(
    alumnoId,
    "registro_verificado",
    `Alumno registrado y notificado a ${docentes.length} docente(s) responsable(s).`,
  );
}

export async function notificarDocentesInicioSesion(alumnoId: number) {
  try {
  const rows = await db
    .select({ alumno: users, perfil: studentProfiles })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(eq(users.id, alumnoId))
    .limit(1);
  const row = rows[0];
  if (!row) return;

  const docentes = await docentesResponsables({
    turno: row.alumno.turno,
    semestre: row.alumno.semestre,
    grupo: row.perfil?.grupo,
    tutorDocenteId: row.perfil?.tutorDocenteId,
  });

  for (const { docente } of docentes) {
    await crearNotificacion(
      docente.id,
      "Alumno inició sesión",
      `${row.alumno.nombre} ingresó a la plataforma de Logística (${row.alumno.semestre ?? "?"}° semestre, turno ${row.alumno.turno ?? "?"}).`,
      "inicio_sesion_alumno",
    );
  }

  await registrarActividad(alumnoId, "inicio_sesion", `Notificación enviada a ${docentes.length} docente(s).`);
  } catch (error) {
    console.error("No se pudo notificar el inicio de sesión (no bloqueante):", error);
  }
}
