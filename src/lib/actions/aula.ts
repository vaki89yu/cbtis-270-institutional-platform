"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assignments,
  attendanceSessions,
  attendances,
  classPosts,
  courses,
  enrollments,
  studentProfiles,
  users,
  materials,
  submissions,
} from "@/db/schema";
import { actividadPorClave } from "@/lib/academico/actividades";
import { materialPorClave } from "@/lib/academico/materiales";
import { registrarAuditoria } from "@/lib/auditoria";
import { sincronizarGrupoDelAula } from "@/lib/academico/aula";
import { crearNotificacionSegura } from "@/lib/comunicacion-datos";
import { hashPassword } from "@/lib/auth";
import { requireUser } from "@/lib/guards";

async function aulaDelDocente(courseId: number, userId: number, rol: string) {
  const [curso] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!curso) return null;
  if (rol !== "admin" && curso.docenteId !== userId) return null;
  return curso;
}

function refrescar(courseId: number) {
  revalidatePath(`/panel/clases/${courseId}`);
  revalidatePath("/panel/clases");
  revalidatePath("/panel/asistencias");
  revalidatePath("/panel/tareas");
  revalidatePath("/panel");
}

/* ------------------------------ PASE DE LISTA ------------------------------ */

/** El docente abre el pase de lista: a partir de ahí el alumno puede registrarse. */
export async function abrirPaseDeListaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso) return;

  // Cerrar cualquier pase anterior que siga abierto
  await db
    .update(attendanceSessions)
    .set({ abierta: false, cerradaEn: new Date() })
    .where(and(eq(attendanceSessions.courseId, courseId), eq(attendanceSessions.abierta, true)));

  const tema = String(formData.get("tema") ?? "").trim();
  const tolerancia = Number(formData.get("tolerancia") ?? 10);
  const conCodigo = String(formData.get("conCodigo") ?? "") === "1";
  // Código de 6 dígitos que el docente proyecta en el salón: sin él, nadie se
  // registra desde su casa.
  const codigo = conCodigo ? String(Math.floor(100000 + Math.random() * 900000)) : null;

  await db.insert(attendanceSessions).values({
    courseId,
    fecha: new Date(),
    tema: tema || null,
    abierta: true,
    toleranciaMin: Number.isFinite(tolerancia) ? tolerancia : 10,
    abiertaPorId: user.id,
    codigo,
  });

  await sincronizarGrupoDelAula(courseId);
  refrescar(courseId);
}

/** El docente cierra el pase de lista y marca falta a quien no se registró. */
export async function cerrarPaseDeListaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const sessionId = Number(formData.get("sessionId"));
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso || !Number.isFinite(sessionId)) return;

  const [sesion] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId))
    .limit(1);
  if (!sesion) return;

  const { alumnosDelAula } = await import("@/lib/academico/aula");
  const alumnos = await alumnosDelAula(courseId);
  const registrados = await db
    .select({ studentId: attendances.studentId })
    .from(attendances)
    .where(eq(attendances.sessionId, sessionId));
  const set = new Set(registrados.map((r) => r.studentId));

  const faltantes = alumnos.filter((a) => !set.has(a.id));
  if (faltantes.length > 0) {
    await db
      .insert(attendances)
      .values(
        faltantes.map((a) => ({
          courseId,
          studentId: a.id,
          fecha: sesion.fecha,
          estado: "falta",
          origen: "docente",
          sessionId,
        })),
      )
      .onConflictDoNothing();
  }

  await db
    .update(attendanceSessions)
    .set({ abierta: false, cerradaEn: new Date() })
    .where(eq(attendanceSessions.id, sessionId));

  refrescar(courseId);
}

/** El alumno registra su propia asistencia mientras el pase de lista está abierto. */
export async function marcarMiAsistenciaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const sessionId = Number(formData.get("sessionId"));
  if (!Number.isFinite(courseId) || !Number.isFinite(sessionId)) return;

  const [sesion] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId))
    .limit(1);
  if (!sesion || !sesion.abierta || sesion.courseId !== courseId) return;

  // Si el docente abrió con código, hay que teclear el que está proyectado
  if (sesion.codigo) {
    const tecleado = String(formData.get("codigo") ?? "").replace(/\D/g, "");
    if (tecleado !== sesion.codigo) {
      const jar = await cookies();
      jar.set("cbtis270_asistencia_aviso", "Ese código no coincide con el que proyectó tu docente.", {
        path: "/",
        maxAge: 15,
      });
      refrescar(courseId);
      return;
    }
  }

  // Debe estar inscrito al aula
  const { alumnosDelAula } = await import("@/lib/academico/aula");
  const alumnos = await alumnosDelAula(courseId);
  if (!alumnos.some((a) => a.id === user.id)) return;

  // Retardo si llegó después de la tolerancia
  const minutos = Math.floor((Date.now() - new Date(sesion.fecha).getTime()) / 60000);
  const estado = minutos > sesion.toleranciaMin ? "retardo" : "presente";

  await db
    .insert(attendances)
    .values({
      courseId,
      studentId: user.id,
      fecha: sesion.fecha,
      estado,
      origen: "alumno",
      sessionId,
      observacion: `Registrada por el alumno a los ${minutos} min de iniciada la clase`,
    })
    .onConflictDoNothing();

  const [curso] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (curso) {
    await crearNotificacionSegura({
      userId: curso.docenteId,
      titulo: estado === "retardo" ? "Asistencia con retardo" : "Asistencia registrada",
      contenido: `${user.nombre} se registró en ${curso.nombre} (${curso.aula ?? "aula"}) como ${estado}.`,
      tipo: "asistencia",
    });
  }

  refrescar(courseId);
}

/** El docente corrige el estado de un alumno en el pase de lista. */
export async function ajustarAsistenciaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const sessionId = Number(formData.get("sessionId"));
  const studentId = Number(formData.get("studentId"));
  const estado = String(formData.get("estado") ?? "presente");
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso || !["presente", "retardo", "falta", "justificado"].includes(estado)) return;

  const [sesion] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId))
    .limit(1);
  if (!sesion) return;

  const [existente] = await db
    .select({ id: attendances.id })
    .from(attendances)
    .where(and(eq(attendances.sessionId, sessionId), eq(attendances.studentId, studentId)))
    .limit(1);

  if (existente) {
    await db
      .update(attendances)
      .set({ estado, origen: "docente" })
      .where(eq(attendances.id, existente.id));
  } else {
    await db
      .insert(attendances)
      .values({ courseId, studentId, fecha: sesion.fecha, estado, origen: "docente", sessionId })
      .onConflictDoNothing();
  }

  refrescar(courseId);
}

/* ------------------------------ ACTIVIDADES ------------------------------ */

/** Activa una actividad precargada del plan de estudios para el grupo. */
export async function activarActividadAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const clave = String(formData.get("clave") ?? "");
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  const plantilla = actividadPorClave(clave);
  if (!curso || !plantilla) return;

  const [yaExiste] = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(and(eq(assignments.courseId, courseId), eq(assignments.origen, clave)))
    .limit(1);

  if (yaExiste) {
    await db.update(assignments).set({ activa: true }).where(eq(assignments.id, yaExiste.id));
  } else {
    const entrega = new Date();
    entrega.setDate(entrega.getDate() + plantilla.diasEntrega);
    entrega.setHours(23, 59, 0, 0);
    await db.insert(assignments).values({
      courseId,
      titulo: plantilla.titulo,
      instrucciones: plantilla.instrucciones,
      puntos: plantilla.puntos,
      parcial: plantilla.parcial,
      activa: true,
      origen: clave,
      evidencia: plantilla.evidencia,
      fechaEntrega: entrega,
    });
  }

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "actividad_activada",
    entidad: "assignment",
    entidadId: clave,
    detalle: `${curso.nombre}: ${plantilla.titulo}`,
  });

  // Avisar al grupo
  const { alumnosDelAula } = await import("@/lib/academico/aula");
  for (const alumno of await alumnosDelAula(courseId)) {
    await crearNotificacionSegura({
      userId: alumno.id,
      titulo: "Nueva actividad activada",
      contenido: `${curso.nombre}: ${plantilla.titulo}. Entra al aula para realizarla.`,
      tipo: "actividad",
    });
  }

  refrescar(courseId);
}

/** Oculta la actividad al grupo sin borrar las entregas ya hechas. */
export async function desactivarActividadAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const assignmentId = Number(formData.get("assignmentId"));
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso) return;

  await db
    .update(assignments)
    .set({ activa: false })
    .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)));
  refrescar(courseId);
}

/** El alumno entrega su evidencia. */
export async function entregarEvidenciaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const assignmentId = Number(formData.get("assignmentId"));
  const contenido = String(formData.get("contenido") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!Number.isFinite(assignmentId) || (!contenido && !url)) return;

  const [tarea] = await db
    .select()
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1);
  if (!tarea || !tarea.activa) return;

  const [existente] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, user.id)))
    .limit(1);

  if (existente) {
    await db
      .update(submissions)
      .set({ contenido: contenido || null, url: url || null, entregadoEn: new Date() })
      .where(eq(submissions.id, existente.id));
  } else {
    await db.insert(submissions).values({
      assignmentId,
      studentId: user.id,
      contenido: contenido || null,
      url: url || null,
    });
  }

  const [curso] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (curso) {
    await crearNotificacionSegura({
      userId: curso.docenteId,
      titulo: "Evidencia entregada",
      contenido: `${user.nombre} entregó "${tarea.titulo}" en ${curso.nombre}.`,
      tipo: "entrega",
    });
  }

  refrescar(courseId);
}

/** El docente califica una evidencia. */
export async function calificarEvidenciaAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const submissionId = Number(formData.get("submissionId"));
  const calificacion = Number(formData.get("calificacion"));
  const retro = String(formData.get("retroalimentacion") ?? "").trim();
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso || !Number.isFinite(calificacion)) return;

  const [entrega] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (!entrega) return;

  await db
    .update(submissions)
    .set({
      calificacion: Math.max(0, Math.min(100, calificacion)),
      retroalimentacion: retro || null,
      calificadoEn: new Date(),
    })
    .where(eq(submissions.id, submissionId));

  await crearNotificacionSegura({
    userId: entrega.studentId,
    titulo: "Evidencia calificada",
    contenido: `Tu entrega en ${curso.nombre} obtuvo ${calificacion} puntos.`,
    tipo: "calificacion",
  });

  refrescar(courseId);
}

/** Vuelve a sincronizar la lista del grupo con los registros de los alumnos. */
export async function sincronizarGrupoAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso) return;
  await sincronizarGrupoDelAula(courseId);
  refrescar(courseId);
}

/* -------------------------------- MATERIAL -------------------------------- */

/** El docente activa una lectura o guía precargada; el grupo la ve al instante. */
export async function activarMaterialAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const clave = String(formData.get("clave") ?? "");
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  const plantilla = materialPorClave(clave);
  if (!curso || !plantilla) return;

  const [yaExiste] = await db
    .select({ id: materials.id })
    .from(materials)
    .where(and(eq(materials.courseId, courseId), eq(materials.origen, clave)))
    .limit(1);

  if (yaExiste) {
    await db.update(materials).set({ activo: true }).where(eq(materials.id, yaExiste.id));
  } else {
    await db.insert(materials).values({
      courseId,
      titulo: plantilla.titulo,
      descripcion: plantilla.descripcion,
      tipo: plantilla.tipo,
      url: plantilla.descargaUrl ?? plantilla.enlaceExterno ?? null,
      submodulo: plantilla.submodulo,
      duracion: plantilla.duracion,
      origen: clave,
      activo: true,
    });
  }

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "material_activado",
    entidad: "material",
    entidadId: clave,
    detalle: `${curso.nombre}: ${plantilla.titulo}`,
  });

  refrescar(courseId);
}

/** Lo quita de la vista del grupo sin borrarlo. */
export async function desactivarMaterialAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const materialId = Number(formData.get("materialId"));
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso) return;

  await db
    .update(materials)
    .set({ activo: false })
    .where(and(eq(materials.id, materialId), eq(materials.courseId, courseId)));
  refrescar(courseId);
}

/* -------------------------------- MURO DEL AULA -------------------------------- */

/** Publica en el muro. El docente avisa, el alumno pregunta. */
export async function publicarEnMuroAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!Number.isFinite(courseId) || contenido.length < 2) return;

  const [curso] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!curso) return;

  const esDocente = user.rol === "admin" || curso.docenteId === user.id;
  if (!esDocente) {
    // El alumno sólo publica en el aula a la que pertenece
    const { alumnosDelAula } = await import("@/lib/academico/aula");
    const alumnos = await alumnosDelAula(courseId);
    if (!alumnos.some((a) => a.id === user.id)) return;
  }

  await db.insert(classPosts).values({
    courseId,
    autorId: user.id,
    contenido: contenido.slice(0, 1500),
  });

  // Avisar al otro lado
  if (esDocente) {
    const { alumnosDelAula } = await import("@/lib/academico/aula");
    for (const alumno of await alumnosDelAula(courseId)) {
      await crearNotificacionSegura({
        userId: alumno.id,
        titulo: "Aviso en el aula",
        contenido: `${curso.aula ?? curso.nombre}: ${contenido.slice(0, 120)}`,
        tipo: "aula",
      });
    }
  } else {
    await crearNotificacionSegura({
      userId: curso.docenteId,
      titulo: "Pregunta en el muro del aula",
      contenido: `${user.nombre} preguntó en ${curso.aula ?? curso.nombre}: ${contenido.slice(0, 120)}`,
      tipo: "aula",
    });
  }

  refrescar(courseId);
}

/** El docente (o el autor) borra una publicación del muro. */
export async function borrarDelMuroAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const postId = Number(formData.get("postId"));
  const [curso] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!curso) return;

  const [post] = await db.select().from(classPosts).where(eq(classPosts.id, postId)).limit(1);
  if (!post || post.courseId !== courseId) return;

  const puede = user.rol === "admin" || curso.docenteId === user.id || post.autorId === user.id;
  if (!puede) return;

  await db.delete(classPosts).where(eq(classPosts.id, postId));
  refrescar(courseId);
}

/* ---------------------------- CARGA MASIVA DE LISTA ---------------------------- */

/**
 * El docente pega la lista del grupo (matrícula, nombre, correo) y la
 * plataforma pre-crea las cuentas ya vinculadas a él, a su semestre y a su
 * grupo. El alumno sólo entra con su matrícula como contraseña y la cambia.
 *
 * Acepta separadores coma, punto y coma o tabulador: pegar desde Excel funciona.
 */
export async function cargarListaGrupoAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso) return;

  const crudo = String(formData.get("lista") ?? "");
  const lineas = crudo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let creados = 0;
  let vinculados = 0;
  const errores: string[] = [];

  for (const linea of lineas) {
    const partes = linea.split(/[\t;,]/).map((p) => p.trim());
    if (partes.length < 3) {
      errores.push(linea.slice(0, 40));
      continue;
    }
    const [matricula, nombre, emailCrudo] = partes;
    const email = emailCrudo.toLowerCase();
    if (!email.includes("@") || nombre.length < 4) {
      errores.push(linea.slice(0, 40));
      continue;
    }
    // Encabezado de Excel
    if (/matr[ií]cula/i.test(matricula) || /correo|email/i.test(email)) continue;

    const [existente] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let studentId: number;
    if (existente) {
      studentId = existente.id;
    } else {
      const [nuevo] = await db
        .insert(users)
        .values({
          nombre,
          email,
          passwordHash: hashPassword(matricula),
          rol: "estudiante",
          matricula,
          especialidad: "Logística",
          semestre: curso.semestre,
          turno: curso.turno,
          emailVerificado: false,
        })
        .returning({ id: users.id });
      studentId = nuevo.id;
      creados += 1;
    }

    await db
      .insert(studentProfiles)
      .values({
        userId: studentId,
        numeroControl: matricula,
        grupo: curso.grupo,
        tutorDocenteId: curso.docenteId,
      })
      .onConflictDoUpdate({
        target: studentProfiles.userId,
        set: { grupo: curso.grupo, tutorDocenteId: curso.docenteId },
      });

    await db.insert(enrollments).values({ courseId, studentId }).onConflictDoNothing();
    vinculados += 1;
  }

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "carga_masiva_lista",
    entidad: "course",
    entidadId: courseId,
    detalle: `${creados} cuentas creadas, ${vinculados} alumnos vinculados`,
  });

  const jar = await cookies();
  jar.set(
    "cbtis270_carga_aviso",
    `${creados} cuentas nuevas y ${vinculados} alumnos vinculados al aula.` +
      (errores.length > 0 ? ` No se pudieron leer ${errores.length} renglones.` : ""),
    { path: "/", maxAge: 20 },
  );

  refrescar(courseId);
}

/* ------------------------------ EMPEZAR CLASE ------------------------------ */

/**
 * Un solo botón para iniciar la sesión del día: abre el pase de lista con
 * código, activa la actividad elegida y publica el tema en el muro.
 */
export async function empezarClaseAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("courseId"));
  const curso = await aulaDelDocente(courseId, user.id, user.rol);
  if (!curso) return;

  const tema = String(formData.get("tema") ?? "").trim();
  const clave = String(formData.get("clave") ?? "").trim();
  const tolerancia = Number(formData.get("tolerancia") ?? 10);

  // 1. Pase de lista
  await db
    .update(attendanceSessions)
    .set({ abierta: false, cerradaEn: new Date() })
    .where(and(eq(attendanceSessions.courseId, courseId), eq(attendanceSessions.abierta, true)));

  await db.insert(attendanceSessions).values({
    courseId,
    fecha: new Date(),
    tema: tema || null,
    abierta: true,
    toleranciaMin: Number.isFinite(tolerancia) ? tolerancia : 10,
    abiertaPorId: user.id,
    codigo: String(Math.floor(100000 + Math.random() * 900000)),
  });

  await sincronizarGrupoDelAula(courseId);

  // 2. Actividad del día
  if (clave) {
    const datos = new FormData();
    datos.set("courseId", String(courseId));
    datos.set("clave", clave);
    await activarActividadAction(datos);
  }

  // 3. Tema en el muro
  if (tema) {
    await db.insert(classPosts).values({
      courseId,
      autorId: user.id,
      contenido: `Clase de hoy: ${tema}`,
    });
  }

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "clase_iniciada",
    entidad: "course",
    entidadId: courseId,
    detalle: tema || "Sin tema capturado",
  });

  refrescar(courseId);
}
