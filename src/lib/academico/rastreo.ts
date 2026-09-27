/**
 * Capa de datos del rastreo GPS de embarques.
 *
 * Aquí vive todo lo que toca la base: crear embarques desde el catálogo,
 * generar folios, armar la línea de tiempo y, sobre todo, el motor que hace
 * avanzar un embarque simulado mientras alguien tiene la pantalla abierta.
 *
 * El avance simulado no usa un proceso en segundo plano: se calcula con el
 * tiempo transcurrido entre dos consultas, así funciona igual en Vercel que en
 * cualquier hosting sin workers.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, enrollments, shipmentEvents, shipments, users, type Shipment } from "@/db/schema";
import {
  DURACION_RECORRIDO_DEMO_SEG,
  avancesDeCheckpoints,
  deserializarRuta,
  distanciaKm,
  kilometrajeDeRuta,
  posicionEnRuta,
  escenarioPorClave,
  type EscenarioEmbarque,
  type PuntoRuta,
} from "@/lib/academico/embarques";
import { crearNotificacionSegura } from "@/lib/comunicacion-datos";
import { registrarAuditoria } from "@/lib/auditoria";

/**
 * La plataforma sigue de pie aunque la base no responda (modo demo): cada
 * consulta devuelve su respaldo en lugar de tirar la página completa, igual que
 * `safeQuery` en `src/lib/consultas.ts`.
 */
let avisoDado = false;
async function consultaSegura<T>(consulta: () => Promise<T>, respaldo: T, etiqueta: string): Promise<T> {
  try {
    return await consulta();
  } catch (error) {
    if (!avisoDado) {
      console.warn("[rastreo] Sin base de datos, modo demo:", (error as Error).message?.slice(0, 160));
      avisoDado = true;
    }
    void etiqueta;
    return respaldo;
  }
}

/* ============================== CREACIÓN ============================== */

/** Folio institucional consecutivo por módulo: EMB-M3-26-004. */
export async function siguienteFolio(modulo: number): Promise<string> {
  const anio = String(new Date().getFullYear()).slice(2);
  const existentes = await consultaSegura(
    () =>
      db
        .select({ folio: shipments.folio })
        .from(shipments)
        .where(eq(shipments.modulo, modulo)),
    [] as Array<{ folio: string }>,
    "siguienteFolio",
  );
  const prefijo = `EMB-M${modulo}-${anio}-`;
  const mayor = existentes.reduce((max, fila) => {
    const numero = Number(fila.folio.slice(prefijo.length));
    return Number.isFinite(numero) && numero > max ? numero : max;
  }, 0);
  return `${prefijo}${String(mayor + 1).padStart(3, "0")}`;
}

/** Crea un embarque a partir de un escenario del catálogo y abre su bitácora. */
export async function crearEmbarqueDesdeEscenario(params: {
  escenario: EscenarioEmbarque;
  docenteId: number;
  docenteNombre: string;
  courseId?: number | null;
}) {
  const { escenario, docenteId, docenteNombre, courseId = null } = params;
  const folio = await siguienteFolio(escenario.modulo);

  const filas = await consultaSegura(
    () =>
      db
        .insert(shipments)
        .values({
      folio,
      titulo: escenario.titulo,
      descripcion: escenario.descripcion,
      modulo: escenario.modulo,
      submodulo: escenario.submodulo,
      origen: escenario.clave,
      origenNombre: escenario.origen,
      destinoNombre: escenario.destino,
      carga: escenario.carga,
      unidad: escenario.unidad,
      ruta: escenario.ruta.map((p) => `${p.lat},${p.lng}`).join(";"),
      distanciaKm: escenario.distanciaKm,
      modo: escenario.modoSugerido,
      estado: "programado",
      progreso: 0,
      latitud: escenario.ruta[0]?.lat ?? null,
      longitud: escenario.ruta[0]?.lng ?? null,
      velocidadKmh: escenario.velocidadKmh,
      checkpointsPasados: "",
      posicionEn: new Date(),
          docenteId,
          courseId,
        })
        .returning({ id: shipments.id, folio: shipments.folio }),
    [] as Array<{ id: number; folio: string }>,
    "crearEmbarque",
  );

  const creado = filas[0];
  if (!creado) return null;

  await consultaSegura(
    () =>
      db.insert(shipmentEvents).values([
    {
      shipmentId: creado.id,
      tipo: "estado",
      titulo: "Embarque creado",
      detalle: `${escenario.origen} → ${escenario.destino}. ${escenario.carga}.`,
      latitud: escenario.ruta[0]?.lat ?? null,
      longitud: escenario.ruta[0]?.lng ?? null,
      registradoPorId: docenteId,
      registradoPorNombre: docenteNombre,
    },
    ...escenario.ruta
      .filter((p) => p.tipo === "checkpoint" || p.tipo === "destino")
      .map((p) => ({
        shipmentId: creado.id,
        tipo: "checkpoint",
        titulo: `Checkpoint programado: ${p.nombre}`,
        detalle: p.nota ?? "Punto de control definido en la ruta planeada.",
              latitud: p.lat,
              longitud: p.lng,
            })),
      ]),
    null,
    "eventosIniciales",
  );

  await registrarAuditoria({
    userId: docenteId,
    actor: docenteNombre,
    accion: "embarque_creado",
    entidad: "shipment",
    entidadId: creado.folio,
    detalle: `${escenario.titulo} (${escenario.clave})`,
  });

  return creado;
}

/* ============================== CONSULTAS ============================== */

export async function embarquePorId(id: number) {
  const filas = await consultaSegura(
    () =>
      db
        .select({
          embarque: shipments,
          docenteNombre: users.nombre,
          aulaNombre: courses.nombre,
        })
        .from(shipments)
        .leftJoin(users, eq(users.id, shipments.docenteId))
        .leftJoin(courses, eq(courses.id, shipments.courseId))
        .where(eq(shipments.id, id))
        .limit(1),
    [],
    "embarquePorId",
  );
  return filas[0] ?? null;
}

/** Embarques creados por un docente (los de admin: todos). */
export async function embarquesDelDocente(docenteId: number, rol: string) {
  const filas = await consultaSegura(
    () =>
      rol === "admin"
        ? db.select().from(shipments)
        : db.select().from(shipments).where(eq(shipments.docenteId, docenteId)),
    [] as Shipment[],
    "embarquesDelDocente",
  );
  return filas.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Embarques que le tocan a un alumno: los de los módulos que cursa, según las
 * aulas a las que está inscrito.
 */
export async function embarquesDelAlumno(studentId: number) {
  const aulas = await consultaSegura(
    () =>
      db
        .select({ modulo: courses.modulo })
        .from(courses)
        .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
        .where(eq(enrollments.studentId, studentId)),
    [] as Array<{ modulo: number | null }>,
    "aulasDelAlumno",
  );

  const modulos = new Set(
    aulas.map((a) => a.modulo).filter((m): m is number => typeof m === "number"),
  );
  const todos = await consultaSegura(() => db.select().from(shipments), [] as Shipment[], "embarquesDelAlumno");
  if (modulos.size === 0) return todos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return todos
    .filter((e) => modulos.has(e.modulo))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Línea de tiempo del embarque, lo más reciente primero. */
export async function eventosDelEmbarque(shipmentId: number, limite = 40) {
  return consultaSegura(
    () =>
      db
        .select()
        .from(shipmentEvents)
        .where(eq(shipmentEvents.shipmentId, shipmentId))
        .orderBy(desc(shipmentEvents.createdAt))
        .limit(limite),
    [] as Array<typeof shipmentEvents.$inferSelect>,
    "eventosDelEmbarque",
  );
}

/* ============================== MOTOR DE RASTREO ============================== */

/** Puntos nombrados de la ruta: del catálogo si existe, o de la columna serializada. */
export function puntosDeRuta(emb: Shipment): PuntoRuta[] {
  const escenario = emb.origen ? escenarioPorClave(emb.origen) : undefined;
  if (escenario) return escenario.ruta;
  return deserializarRuta(emb.ruta).map((p, indice, arr) => ({
    nombre: `Punto ${indice + 1}`,
    lat: p.lat,
    lng: p.lng,
    tipo: indice === 0 ? "origen" : indice === arr.length - 1 ? "destino" : "paso",
  }));
}

export type EstadoRastreo = {
  lat: number | null;
  lng: number | null;
  progreso: number;
  velocidadKmh: number;
  kilometroActual: number;
  kilometrajeTotal: number;
  estado: string;
  completado: boolean;
  posicionEn: string | null;
  proximoCheckpoint: { nombre: string; km: number } | null;
};

/** Resumen del embarque tal como lo pinta el mapa. */
export function estadoDeRastreo(emb: Shipment): EstadoRastreo {
  const ruta = puntosDeRuta(emb);
  const total = kilometrajeDeRuta(ruta);
  const avances = avancesDeCheckpoints(ruta);
  const siguiente = ruta.findIndex((p, i) => (p.tipo === "checkpoint" || p.tipo === "destino") && avances[i] > emb.progreso);

  let kmFaltantes = 0;
  if (siguiente > 0) {
    for (let i = 0; i < siguiente; i += 1) kmFaltantes += distanciaKm(ruta[i], ruta[i + 1]);
  }

  return {
    lat: emb.latitud,
    lng: emb.longitud,
    progreso: emb.progreso,
    velocidadKmh: emb.velocidadKmh,
    kilometroActual: Math.round(total * emb.progreso),
    kilometrajeTotal: total,
    estado: emb.estado,
    completado: emb.progreso >= 1,
    posicionEn: emb.posicionEn ? emb.posicionEn.toISOString() : null,
    proximoCheckpoint:
      siguiente > 0
        ? { nombre: ruta[siguiente].nombre, km: Math.round(kmFaltantes - total * emb.progreso) }
        : null,
  };
}

/**
 * Hace avanzar un embarque en modo simulado según el tiempo transcurrido desde
 * la última posición. Devuelve el estado actualizado y registra los eventos que
 * se hayan disparado (salida, checkpoints, entrega).
 */
export async function avanzarSimulacion(emb: Shipment): Promise<EstadoRastreo> {
  if (emb.modo !== "simulado" || emb.progreso >= 1) return estadoDeRastreo(emb);

  const anterior = emb.posicionEn ?? emb.createdAt;
  const segundos = (Date.now() - new Date(anterior).getTime()) / 1000;
  if (segundos <= 0.5) return estadoDeRastreo(emb);

  const ruta = puntosDeRuta(emb);
  const nuevoProgreso = Math.min(1, emb.progreso + segundos / DURACION_RECORRIDO_DEMO_SEG);
  const punto = posicionEnRuta(ruta, nuevoProgreso);
  const llego = nuevoProgreso >= 1;

  const eventos: Array<{
    shipmentId: number;
    tipo: string;
    titulo: string;
    detalle: string | null;
    latitud: number | null;
    longitud: number | null;
  }> = [];

  // Salida del primer punto
  if (emb.estado === "programado") {
    eventos.push({
      shipmentId: emb.id,
      tipo: "estado",
      titulo: "Inicia el recorrido",
      detalle: `La unidad sale de ${ruta[0]?.nombre ?? emb.origenNombre} en modo simulado.`,
      latitud: punto?.lat ?? null,
      longitud: punto?.lng ?? null,
    });
  }

  // Checkpoints alcanzados en este salto
  const avances = avancesDeCheckpoints(ruta);
  const yaPasados = new Set(
    emb.checkpointsPasados
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean),
  );
  const nuevosPasados: string[] = [];
  ruta.forEach((p, indice) => {
    if (indice === 0) return;
    if (p.tipo !== "checkpoint" && p.tipo !== "destino") return;
    if (avances[indice] > nuevoProgreso + 0.0001) return;
    if (yaPasados.has(String(indice))) return;
    nuevosPasados.push(String(indice));
    eventos.push({
      shipmentId: emb.id,
      tipo: "checkpoint",
      titulo: `Checkpoint alcanzado: ${p.nombre}`,
      detalle: p.nota ?? `Kilómetro ${Math.round(kilometrajeDeRuta(ruta) * avances[indice])} de la ruta.`,
      latitud: p.lat,
      longitud: p.lng,
    });
  });

  if (llego) {
    eventos.push({
      shipmentId: emb.id,
      tipo: "entrega",
      titulo: "Entregado en destino",
      detalle: `La unidad llegó a ${ruta[ruta.length - 1]?.nombre ?? emb.destinoNombre}. Recorrido simulado concluido.`,
      latitud: punto?.lat ?? null,
      longitud: punto?.lng ?? null,
    });
  }

  await consultaSegura(
    () =>
      db
        .update(shipments)
        .set({
      progreso: nuevoProgreso,
      latitud: punto?.lat ?? emb.latitud,
      longitud: punto?.lng ?? emb.longitud,
      estado: llego ? "entregado" : "en_transito",
      posicionEn: new Date(),
      checkpointsPasados: [...yaPasados, ...nuevosPasados].join(","),
        })
        .where(eq(shipments.id, emb.id)),
    null,
    "avanzarSimulacion",
  );

  if (eventos.length > 0) {
    await consultaSegura(() => db.insert(shipmentEvents).values(eventos), null, "eventosSimulacion");
  }

  if (llego) {
    if (emb.operadorId) {
      await crearNotificacionSegura({
        userId: emb.operadorId,
        titulo: "Embarque entregado",
        contenido: `${emb.folio} concluyó su recorrido en ${emb.destinoNombre}.`,
        tipo: "rastreo",
      });
    }
    if (emb.docenteId) {
      await crearNotificacionSegura({
        userId: emb.docenteId,
        titulo: "Recorrido concluido",
        contenido: `${emb.folio} llegó a destino. Ya puedes revisar la línea de tiempo en clase.`,
        tipo: "rastreo",
      });
    }
  }

  return estadoDeRastreo({
    ...emb,
    progreso: nuevoProgreso,
    latitud: punto?.lat ?? emb.latitud,
    longitud: punto?.lng ?? emb.longitud,
    estado: llego ? "entregado" : "en_transito",
  });
}

/* ============================== POSICIÓN REAL ============================== */

/**
 * Guarda la posición que envía el celular del operador asignado. Para no llenar
 * la bitácora, sólo se registra un evento cuando pasaron 60 segundos o la unidad
 * se movió más de 300 metros desde el último evento de posición.
 */
export async function registrarPosicionReal(params: {
  emb: Shipment;
  lat: number;
  lng: number;
  velocidad: number;
  usuarioId: number;
  usuarioNombre: string;
}): Promise<EstadoRastreo> {
  const { emb, lat, lng, velocidad, usuarioId, usuarioNombre } = params;

  const anterior = emb.latitud !== null && emb.longitud !== null
    ? { lat: emb.latitud, lng: emb.longitud, en: emb.posicionEn ?? emb.createdAt }
    : null;

  const segundos = anterior ? (Date.now() - new Date(anterior.en).getTime()) / 1000 : Infinity;
  const metros = anterior ? distanciaKm({ nombre: "a", lat: anterior.lat, lng: anterior.lng, tipo: "paso" }, { nombre: "b", lat, lng, tipo: "paso" }) * 1000 : Infinity;
  const convieneRegistrar = segundos >= 60 || metros >= 300;

  const ruta = puntosDeRuta(emb);
  const progresoReal = progresoDePosicion(ruta, lat, lng);
  const llego = progresoReal >= 0.999;

  await consultaSegura(
    () =>
      db
        .update(shipments)
        .set({
      latitud: lat,
      longitud: lng,
      velocidadKmh: Math.max(0, Math.round(velocidad)),
      progreso: progresoReal,
      estado: llego ? "entregado" : "en_transito",
      posicionEn: new Date(),
        })
        .where(eq(shipments.id, emb.id)),
    null,
    "registrarPosicionReal",
  );

  if (convieneRegistrar) {
    await consultaSegura(
      () =>
        db.insert(shipmentEvents).values({
      shipmentId: emb.id,
      tipo: llego ? "entrega" : "posicion",
      titulo: llego ? "Llegada registrada por GPS" : "Posición recibida del operador",
      detalle: `GPS real: ${lat.toFixed(5)}, ${lng.toFixed(5)} · ${Math.round(velocidad)} km/h · precisión reportada por el dispositivo.`,
      latitud: lat,
      longitud: lng,
      registradoPorId: usuarioId,
      registradoPorNombre: usuarioNombre,
        }),
      null,
      "eventoPosicion",
    );
  }

  if (llego && emb.docenteId) {
    await crearNotificacionSegura({
      userId: emb.docenteId,
      titulo: "Embarque entregado",
      contenido: `${emb.folio}: el operador ${usuarioNombre} registró la llegada a destino.`,
      tipo: "rastreo",
    });
  }

  return estadoDeRastreo({ ...emb, latitud: lat, longitud: lng, progreso: progresoReal, velocidadKmh: Math.round(velocidad), estado: llego ? "entregado" : "en_transito" });
}

/** Progreso sobre la ruta planeada más cercano a la posición real recibida. */
function progresoDePosicion(ruta: PuntoRuta[], lat: number, lng: number): number {
  if (ruta.length < 2) return 1;
  const total = kilometrajeDeRuta(ruta);
  if (total === 0) return 1;

  let mejor = 0;
  let mejorDistancia = Infinity;
  const pasos = 200;
  for (let i = 0; i <= pasos; i += 1) {
    const p = i / pasos;
    const punto = posicionEnRuta(ruta, p);
    if (!punto) continue;
    const d = distanciaKm(punto, { nombre: "gps", lat, lng, tipo: "paso" });
    if (d < mejorDistancia) {
      mejorDistancia = d;
      mejor = p;
    }
  }
  return mejor;
}
