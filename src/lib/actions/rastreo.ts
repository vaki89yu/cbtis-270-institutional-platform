"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, shipmentEvents, shipments, users } from "@/db/schema";
import { escenarioPorClave, escenariosDelModulo } from "@/lib/academico/embarques";
import { alumnosDelAula } from "@/lib/academico/aula";
import { crearEmbarqueDesdeEscenario } from "@/lib/academico/rastreo";
import { crearNotificacionSegura } from "@/lib/comunicacion-datos";
import { registrarAuditoria } from "@/lib/auditoria";
import { requireUser } from "@/lib/guards";

function refrescar(shipmentId?: number) {
  revalidatePath("/panel/embarques");
  if (shipmentId) revalidatePath(`/panel/embarques/${shipmentId}`);
  revalidatePath("/panel");
}

/** El docente debe ser dueño del embarque, o ser admin. */
async function embarqueDelDocente(shipmentId: number, userId: number, rol: string) {
  const [emb] = await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
  if (!emb) return null;
  if (rol !== "admin" && emb.docenteId !== userId) return null;
  return emb;
}

/* ------------------------------- CREACIÓN ------------------------------- */

/** Crea un embarque desde un escenario del catálogo. */
export async function crearEmbarqueAction(formData: FormData) {
  const user = await requireUser();
  if (user.rol === "estudiante") return;

  const clave = String(formData.get("escenario") ?? "");
  const escenario = escenarioPorClave(clave);
  if (!escenario) return;

  const courseIdCrudo = String(formData.get("courseId") ?? "");
  const courseId = Number(courseIdCrudo);
  const aulaId = Number.isFinite(courseId) && courseId > 0 ? courseId : null;

  if (aulaId) {
    const [curso] = await db.select().from(courses).where(eq(courses.id, aulaId)).limit(1);
    if (!curso) return;
    if (user.rol !== "admin" && curso.docenteId !== user.id) return;
  }

  const creado = await crearEmbarqueDesdeEscenario({
    escenario,
    docenteId: user.id,
    docenteNombre: user.nombre,
    courseId: aulaId,
  });

  if (!creado) {
    const jar = await cookies();
    jar.set(
      "cbtis270_embarque_aviso",
      "No se pudo crear el embarque: la plataforma no tiene conexión con la base de datos en este momento.",
      { path: "/", maxAge: 20 },
    );
    refrescar();
    return;
  }

  // Avisar al grupo del aula vinculada
  if (aulaId) {
    for (const alumno of await alumnosDelAula(aulaId)) {
      await crearNotificacionSegura({
        userId: alumno.id,
        titulo: "Nuevo embarque para rastrear",
        contenido: `${creado.folio}: ${escenario.titulo}. Ábrelo en Rastreo GPS para seguirlo en vivo.`,
        tipo: "rastreo",
      });
    }
  }

  const jar = await cookies();
  jar.set("cbtis270_embarque_aviso", `Embarque ${creado.folio} creado y listo para rastrear.`, {
    path: "/",
    maxAge: 20,
  });

  refrescar(creado.id);
}

/**
 * Carga masiva: crea de un golpe todos los embarques de un módulo completo.
 * Los escenarios que el docente ya creó no se duplican.
 */
export async function crearEmbarquesDelModuloAction(formData: FormData) {
  const user = await requireUser();
  if (user.rol === "estudiante") return;

  const modulo = Number(formData.get("modulo"));
  if (!Number.isFinite(modulo)) return;

  const courseIdCrudo = String(formData.get("courseId") ?? "");
  const courseId = Number(courseIdCrudo);
  const aulaId = Number.isFinite(courseId) && courseId > 0 ? courseId : null;
  if (aulaId) {
    const [curso] = await db.select().from(courses).where(eq(courses.id, aulaId)).limit(1);
    if (!curso) return;
    if (user.rol !== "admin" && curso.docenteId !== user.id) return;
  }

  const delModulo = escenariosDelModulo(modulo);
  // La duplicidad se revisa por docente: cada quien puede tener sus embarques
  const yaCreados = await db
    .select({ origen: shipments.origen })
    .from(shipments)
    .where(user.rol === "admin" ? eq(shipments.modulo, modulo) : eq(shipments.docenteId, user.id));
  const creadosPorMi = new Set(
    yaCreados.filter((e) => typeof e.origen === "string").map((e) => e.origen as string),
  );

  const folios: string[] = [];
  let creados = 0;
  for (const escenario of delModulo) {
    if (creadosPorMi.has(escenario.clave)) continue;
    const nuevo = await crearEmbarqueDesdeEscenario({
      escenario,
      docenteId: user.id,
      docenteNombre: user.nombre,
      courseId: aulaId,
    });
    if (!nuevo) break;
    creadosPorMi.add(escenario.clave);
    folios.push(nuevo.folio);
    creados += 1;
  }

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "embarques_carga_masiva",
    entidad: "shipment",
    entidadId: `modulo-${modulo}`,
    detalle: `${creados} embarques creados: ${folios.join(", ")}`,
  });

  if (aulaId) {
    for (const alumno of await alumnosDelAula(aulaId)) {
      await crearNotificacionSegura({
        userId: alumno.id,
        titulo: `Embarques del Módulo ${modulo} disponibles`,
        contenido: `Se crearon ${creados} embarques para rastrear en vivo. Entra a Rastreo GPS.`,
        tipo: "rastreo",
      });
    }
  }

  const jar = await cookies();
  jar.set(
    "cbtis270_embarque_aviso",
    creados > 0
      ? `${creados} embarques del Módulo ${modulo} creados: ${folios.join(", ")}.`
      : `Los ${delModulo.length} embarques del Módulo ${modulo} ya estaban creados.`,
    { path: "/", maxAge: 25 },
  );

  refrescar();
}

/* ------------------------------- OPERACIÓN ------------------------------- */

/** Asigna al alumno que compartirá su ubicación real con el grupo. */
export async function asignarOperadorAction(formData: FormData) {
  const user = await requireUser();
  const shipmentId = Number(formData.get("shipmentId"));
  const operadorId = Number(formData.get("operadorId"));
  const emb = await embarqueDelDocente(shipmentId, user.id, user.rol);
  if (!emb) return;

  const [operador] = await db.select().from(users).where(eq(users.id, operadorId)).limit(1);
  if (!operador) return;

  await db
    .update(shipments)
    .set({
      operadorId: operador.id,
      operadorNombre: operador.nombre,
      modo: "gps",
      estado: emb.estado === "entregado" ? emb.estado : "en_transito",
    })
    .where(eq(shipments.id, shipmentId));

  await db.insert(shipmentEvents).values({
    shipmentId,
    tipo: "asignacion",
    titulo: `Operador asignado: ${operador.nombre}`,
    detalle:
      "El modo cambia a GPS real. El operador debe abrir este embarque en su celular y tocar «Compartir mi ubicación».",
    registradoPorId: user.id,
    registradoPorNombre: user.nombre,
  });

  await crearNotificacionSegura({
    userId: operador.id,
    titulo: `Te asignaron el embarque ${emb.folio}`,
    contenido: `${emb.titulo}. Abre Rastreo GPS y comparte tu ubicación para que el grupo siga tu recorrido en vivo.`,
    tipo: "rastreo",
  });

  refrescar(shipmentId);
}

/** El docente registra un cambio de estado o una incidencia desde el aula. */
export async function registrarEventoAction(formData: FormData) {
  const user = await requireUser();
  const shipmentId = Number(formData.get("shipmentId"));
  const tipo = String(formData.get("tipo") ?? "estado");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const detalle = String(formData.get("detalle") ?? "").trim();
  const emb = await embarqueDelDocente(shipmentId, user.id, user.rol);
  if (!emb || !["estado", "incidencia", "checkpoint"].includes(tipo)) return;

  const mapaTitulo: Record<string, string> = {
    estado: "Cambio de estado",
    incidencia: "Incidencia reportada",
    checkpoint: "Checkpoint registrado",
  };

  await db.insert(shipmentEvents).values({
    shipmentId,
    tipo,
    titulo: titulo || mapaTitulo[tipo],
    detalle: detalle || null,
    latitud: emb.latitud,
    longitud: emb.longitud,
    registradoPorId: user.id,
    registradoPorNombre: user.nombre,
  });

  if (tipo === "incidencia") {
    await db.update(shipments).set({ estado: "incidencia" }).where(eq(shipments.id, shipmentId));
    if (emb.operadorId) {
      await crearNotificacionSegura({
        userId: emb.operadorId,
        titulo: `Incidencia en ${emb.folio}`,
        contenido: `${user.nombre} registró: ${titulo || detalle || "incidencia"}.`,
        tipo: "rastreo",
      });
    }
  }

  refrescar(shipmentId);
}

/** Cambia entre GPS real y simulado sin perder el recorrido hecho. */
export async function cambiarModoAction(formData: FormData) {
  const user = await requireUser();
  const shipmentId = Number(formData.get("shipmentId"));
  const modo = String(formData.get("modo") ?? "simulado");
  const emb = await embarqueDelDocente(shipmentId, user.id, user.rol);
  if (!emb || !["simulado", "gps"].includes(modo)) return;

  await db.update(shipments).set({ modo }).where(eq(shipments.id, shipmentId));
  await db.insert(shipmentEvents).values({
    shipmentId,
    tipo: "estado",
    titulo: modo === "gps" ? "Modo cambiado a GPS real" : "Modo cambiado a simulado",
    detalle:
      modo === "gps"
        ? "La posición la enviará el dispositivo del operador asignado."
        : "La posición avanza sola sobre la ruta planeada mientras alguien tenga el rastreo abierto.",
    registradoPorId: user.id,
    registradoPorNombre: user.nombre,
  });

  refrescar(shipmentId);
}

/** Vuelve el embarque al punto de partida para repetir la demostración en clase. */
export async function reiniciarRecorridoAction(formData: FormData) {
  const user = await requireUser();
  const shipmentId = Number(formData.get("shipmentId"));
  const emb = await embarqueDelDocente(shipmentId, user.id, user.rol);
  if (!emb) return;

  await db
    .update(shipments)
    .set({
      progreso: 0,
      estado: "programado",
      checkpointsPasados: "",
      velocidadKmh: emb.velocidadKmh,
      posicionEn: new Date(),
    })
    .where(eq(shipments.id, shipmentId));

  await db.insert(shipmentEvents).values({
    shipmentId,
    tipo: "estado",
    titulo: "Recorrido reiniciado",
    detalle: "El embarque vuelve al punto de origen para repetirlo en clase.",
    registradoPorId: user.id,
    registradoPorNombre: user.nombre,
  });

  refrescar(shipmentId);
}

/** Da de baja un embarque (borra también su línea de tiempo). */
export async function eliminarEmbarqueAction(formData: FormData) {
  const user = await requireUser();
  const shipmentId = Number(formData.get("shipmentId"));
  const emb = await embarqueDelDocente(shipmentId, user.id, user.rol);
  if (!emb) return;

  await registrarAuditoria({
    userId: user.id,
    actor: user.nombre,
    accion: "embarque_eliminado",
    entidad: "shipment",
    entidadId: emb.folio,
    detalle: emb.titulo,
  });

  await db.delete(shipments).where(eq(shipments.id, shipmentId));
  refrescar();
}
