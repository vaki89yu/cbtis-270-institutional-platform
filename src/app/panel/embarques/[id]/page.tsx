import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonEnviar } from "@/components/form-estado";
import { Icono } from "@/components/iconos";
import { MapaRastreo } from "@/components/rastreo/mapa-rastreo";
import {
  asignarOperadorAction,
  cambiarModoAction,
  registrarEventoAction,
  reiniciarRecorridoAction,
} from "@/lib/actions/rastreo";
import { alumnosDeDocente, alumnosDelAula } from "@/lib/academico/aula";
import {
  COLOR_ESTADO_EMBARQUE,
  ETIQUETA_ESTADO_EMBARQUE,
} from "@/lib/academico/embarques";
import {
  avanzarSimulacion,
  embarquePorId,
  estadoDeRastreo,
  eventosDelEmbarque,
  puntosDeRuta,
} from "@/lib/academico/rastreo";
import { NOMBRE_MODULO } from "@/lib/formatos/catalogo";
import { formatoFechaHora, requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Rastreo del embarque" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const ICONO_EVENTO: Record<string, "gps" | "ruta" | "alerta" | "verificado" | "check" | "punto"> = {
  estado: "punto",
  checkpoint: "ruta",
  incidencia: "alerta",
  asignacion: "verificado",
  posicion: "gps",
  entrega: "check",
};

const COLOR_EVENTO: Record<string, string> = {
  estado: "bg-slate-100 text-slate-600",
  checkpoint: "bg-amber-100 text-amber-800",
  incidencia: "bg-rose-100 text-rose-800",
  asignacion: "bg-inst-100 text-inst-800",
  posicion: "bg-sky-100 text-sky-800",
  entrega: "bg-emerald-100 text-emerald-800",
};

export default async function RastreoDetallePage({ params }: Props) {
  const { id } = await params;
  const shipmentId = Number(id);
  if (!Number.isFinite(shipmentId)) notFound();

  const user = await requireUser();
  const fila = await embarquePorId(shipmentId);
  if (!fila) notFound();

  const { embarque, docenteNombre, aulaNombre } = fila;
  const esDocente = user.rol === "admin" || embarque.docenteId === user.id;
  const esOperador = embarque.operadorId === user.id;
  const esAlumnoDelAula = embarque.courseId
    ? (await alumnosDelAula(embarque.courseId)).some((a) => a.id === user.id)
    : false;

  if (!esDocente && !esOperador && !esAlumnoDelAula && user.rol === "estudiante") {
    return (
      <div className="space-y-6">
        <Link href="/panel/embarques" className="btn-mini">
          ← Rastreo GPS
        </Link>
        <div className="tarjeta p-10 text-center">
          <Icono nombre="candado" tamano={36} className="mx-auto text-slate-400" />
          <h1 className="mt-3 text-lg font-black text-slate-900">Este embarque no es de tu grupo</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            El embarque {embarque.folio} está vinculado a otra aula. Sólo lo ven los alumnos inscritos
            en ella y el operador asignado.
          </p>
        </div>
      </div>
    );
  }

  // En modo simulado, la propia consulta hace avanzar el recorrido
  const estado =
    embarque.modo === "simulado" ? await avanzarSimulacion(embarque) : estadoDeRastreo(embarque);
  const ruta = puntosDeRuta(embarque);
  const eventos = await eventosDelEmbarque(shipmentId, 60);

  const candidatosOperador = embarque.courseId
    ? await alumnosDelAula(embarque.courseId)
    : esDocente
      ? await alumnosDeDocente(user.id)
      : [];

  return (
    <div className="space-y-6">
      <Link href="/panel/embarques" className="btn-mini">
        ← Rastreo GPS
      </Link>

      {/* ------------------------------ ENCABEZADO ------------------------------ */}
      <header className="tarjeta overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-inst-600 to-sky-400" />
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-inst-50 px-2.5 py-1 text-xs font-black text-inst-800">
                {embarque.folio}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  COLOR_ESTADO_EMBARQUE[embarque.estado] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {ETIQUETA_ESTADO_EMBARQUE[embarque.estado] ?? embarque.estado}
              </span>
              {embarque.origen ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  Escenario {embarque.origen}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl font-black text-slate-900">{embarque.titulo}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {embarque.origenNombre} → {embarque.destinoNombre}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {NOMBRE_MODULO[embarque.modulo] ?? `Módulo ${embarque.modulo}`}
              {aulaNombre ? ` · Aula: ${aulaNombre}` : " · Escenario de demostración"}
              {docenteNombre ? ` · Prof. ${docenteNombre}` : ""}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{embarque.descripcion}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                {embarque.distanciaKm} km
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                {embarque.unidad}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                {embarque.carga}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                Velocidad comercial {embarque.velocidadKmh} km/h
              </span>
            </div>
          </div>

          {esDocente ? (
            <div className="w-full max-w-sm space-y-3 rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-inst-700">
                Control del docente
              </p>

              <form action={asignarOperadorAction} className="space-y-2">
                <input type="hidden" name="shipmentId" value={shipmentId} />
                <label className="text-xs font-bold text-slate-600">
                  Operador que comparte su GPS
                  <select name="operadorId" required className="campo mt-1" defaultValue="">
                    <option value="" disabled>
                      Elige al alumno operador
                    </option>
                    {candidatosOperador.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                        {a.matricula ? ` · ${a.matricula}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {candidatosOperador.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Vincula el embarque a un aula o registra alumnos contigo como tutor para poder
                    asignar operador.
                  </p>
                ) : null}
                <BotonEnviar
                  className="btn-secundario w-full px-3 py-2 text-xs"
                  pendienteTexto="Asignando…"
                >
                  Asignar y pasar a GPS real
                </BotonEnviar>
              </form>

              <div className="flex flex-wrap gap-2">
                <form action={cambiarModoAction}>
                  <input type="hidden" name="shipmentId" value={shipmentId} />
                  <input
                    type="hidden"
                    name="modo"
                    value={embarque.modo === "gps" ? "simulado" : "gps"}
                  />
                  <BotonEnviar className="btn-mini" pendienteTexto="…">
                    {embarque.modo === "gps" ? "Pasar a simulado" : "Pasar a GPS real"}
                  </BotonEnviar>
                </form>
                <form action={reiniciarRecorridoAction}>
                  <input type="hidden" name="shipmentId" value={shipmentId} />
                  <BotonEnviar className="btn-mini" pendienteTexto="…">
                    Reiniciar recorrido
                  </BotonEnviar>
                </form>
              </div>

              <details className="rounded-xl border border-slate-200 p-3">
                <summary className="cursor-pointer text-xs font-bold text-slate-600">
                  Registrar incidencia o cambio de estado
                </summary>
                <form action={registrarEventoAction} className="mt-3 space-y-2">
                  <input type="hidden" name="shipmentId" value={shipmentId} />
                  <label className="text-xs font-bold text-slate-600">
                    Tipo
                    <select name="tipo" className="campo mt-1" defaultValue="incidencia">
                      <option value="incidencia">Incidencia en ruta</option>
                      <option value="estado">Cambio de estado</option>
                      <option value="checkpoint">Checkpoint alcanzado</option>
                    </select>
                  </label>
                  <input name="titulo" className="campo text-sm" placeholder="Ponchadura en el km 240" />
                  <textarea
                    name="detalle"
                    rows={2}
                    className="campo text-sm"
                    placeholder="Detalle de lo que pasó y qué se decidió"
                  />
                  <BotonEnviar className="btn-secundario w-full px-3 py-2 text-xs" pendienteTexto="Guardando…">
                    Registrar en la bitácora
                  </BotonEnviar>
                </form>
              </details>
            </div>
          ) : null}
        </div>
      </header>

      {esOperador ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Eres el operador asignado de {embarque.folio}. Toca «Compartir mi ubicación» y el grupo verá
          tu recorrido en el mapa mientras te mueves.
        </p>
      ) : null}

      {/* --------------------------------- MAPA --------------------------------- */}
      <section className="tarjeta p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Icono nombre="gps" tamano={20} className="text-inst-700" />
          Mapa en vivo
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {embarque.modo === "gps"
            ? "La posición llega del celular del operador asignado. Si aún no comparte, el marcador se queda en la última posición conocida."
            : "El recorrido avanza solo mientras alguien tenga esta pantalla abierta: en clase el viaje completo dura unos cinco minutos."}
        </p>

        <div className="mt-4">
          <MapaRastreo
            shipmentId={shipmentId}
            folio={embarque.folio}
            modo={embarque.modo === "gps" ? "gps" : "simulado"}
            ruta={ruta.map((p) => ({
              nombre: p.nombre,
              lat: p.lat,
              lng: p.lng,
              tipo: p.tipo,
              nota: p.nota,
            }))}
            estadoInicial={{
              ok: true,
              lat: estado.lat,
              lng: estado.lng,
              progreso: estado.progreso,
              velocidadKmh: estado.velocidadKmh,
              kilometroActual: estado.kilometroActual,
              kilometrajeTotal: estado.kilometrajeTotal,
              estado: estado.estado,
              completado: estado.completado,
              posicionEn: estado.posicionEn,
              proximoCheckpoint: estado.proximoCheckpoint,
            }}
            esOperador={esOperador || esDocente}
          />
        </div>
      </section>

      {/* ------------------------------ PARADAS ------------------------------ */}
      <section className="tarjeta p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Icono nombre="ruta" tamano={20} className="text-inst-700" />
          Ruta planeada
        </h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ruta.map((punto, indice) => (
            <div
              key={`${punto.nombre}-${indice}`}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                    punto.tipo === "origen"
                      ? "bg-teal-100 text-teal-800"
                      : punto.tipo === "destino"
                        ? "bg-rose-100 text-rose-800"
                        : punto.tipo === "checkpoint"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {indice + 1}
                </span>
                <p className="truncate text-sm font-bold text-slate-900">{punto.nombre}</p>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-slate-400">
                {punto.lat.toFixed(4)}, {punto.lng.toFixed(4)}
              </p>
              {punto.nota ? <p className="mt-1 text-xs text-slate-600">{punto.nota}</p> : null}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------- LÍNEA DE TIEMPO ---------------------------- */}
      <section className="tarjeta p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Icono nombre="asistencias" tamano={20} className="text-inst-700" />
          Línea de tiempo
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Cambios de estado, checkpoints alcanzados, incidencias y posiciones recibidas por GPS.
        </p>

        <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-5">
          {eventos.map((evento) => (
            <li key={evento.id} className="relative">
              <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-inst-600" />
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      COLOR_EVENTO[evento.tipo] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icono
                      nombre={ICONO_EVENTO[evento.tipo] ?? "punto"}
                      tamano={12}
                    />
                    {evento.tipo}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {formatoFechaHora(evento.createdAt)}
                  </span>
                  {evento.registradoPorNombre ? (
                    <span className="text-[11px] font-semibold text-slate-400">
                      · {evento.registradoPorNombre}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm font-bold text-slate-900">{evento.titulo}</p>
                {evento.detalle ? (
                  <p className="mt-0.5 text-xs text-slate-600">{evento.detalle}</p>
                ) : null}
                {evento.latitud !== null && evento.longitud !== null ? (
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    {evento.latitud.toFixed(5)}, {evento.longitud.toFixed(5)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
          {eventos.length === 0 ? (
            <li className="text-sm text-slate-500">Todavía no hay movimientos registrados.</li>
          ) : null}
        </ol>
      </section>
    </div>
  );
}
