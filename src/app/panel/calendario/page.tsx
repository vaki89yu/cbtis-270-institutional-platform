import type { Metadata } from "next";
import Link from "next/link";
import { Icono } from "@/components/iconos";
import {
  claveDia,
  eventosDelMes,
  horaLocal,
  mesActual,
  mesVecino,
  rangoDelMes,
  type EventoCalendario,
} from "@/lib/calendario";
import { fechaVencida, requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Calendario de entregas" };
export const dynamic = "force-dynamic";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type Props = { searchParams: Promise<{ mes?: string; aula?: string }> };

function chip(evento: EventoCalendario, estudiante: boolean) {
  const estado = estudiante
    ? evento.entregado
      ? "entregada"
      : "pendiente"
    : `${evento.pendientes ?? 0} pendientes`;
  const color =
    estudiante && evento.entregado
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : estudiante
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <Link
      key={evento.id}
      href={`/panel/tareas/${evento.id}`}
      className={`block truncate rounded-lg border px-1.5 py-1 text-[10px] font-semibold leading-tight ${color}`}
      title={`${evento.titulo} · ${evento.curso} · ${horaLocal(evento.fechaEntrega)} · ${estado}`}
    >
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ backgroundColor: evento.color }} />
      {evento.titulo}
    </Link>
  );
}

export default async function CalendarioPage({ searchParams }: Props) {
  const { mes: mesPedido, aula: aulaPedida } = await searchParams;
  const user = await requireUser();
  const aulaNumero = Number(aulaPedida);
  const aula = Number.isFinite(aulaNumero) && aulaNumero > 0 ? aulaNumero : undefined;

  const mes = mesPedido ?? mesActual();
  const calendario = await eventosDelMes(user, { mes, aula });
  const esEstudiante = user.rol === "estudiante";

  const { inicio } = rangoDelMes(calendario.mes);
  const anio = inicio.getUTCFullYear();
  const numeroMes = inicio.getUTCMonth() + 1;
  const primerDiaSemana = (inicio.getUTCDay() + 6) % 7; // 0 = lunes
  const diasDelMes = new Date(Date.UTC(anio, numeroMes, 0)).getUTCDate();

  const porDia = new Map<string, EventoCalendario[]>();
  for (const evento of calendario.eventos) {
    const clave = claveDia(evento.fechaEntrega);
    const lista = porDia.get(clave) ?? [];
    lista.push(evento);
    porDia.set(clave, lista);
  }

  const celdas: Array<{ dia: number | null; clave: string; eventos: EventoCalendario[] }> = [];
  for (let i = 0; i < primerDiaSemana; i += 1) celdas.push({ dia: null, clave: `vacio-${i}`, eventos: [] });
  for (let dia = 1; dia <= diasDelMes; dia += 1) {
    const clave = `${anio}-${String(numeroMes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    celdas.push({ dia, clave, eventos: porDia.get(clave) ?? [] });
  }
  while (celdas.length % 7 !== 0) celdas.push({ dia: null, clave: `fin-${celdas.length}`, eventos: [] });

  const hoyClave = calendario.hoyClave;
  const proximos = calendario.eventos.filter((evento) => !fechaVencida(evento.fechaEntrega)).slice(0, 6);

  return (
    <div className="space-y-6">
      <header className="tarjeta p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Calendario de entregas</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {esEstudiante
                ? "Todas las actividades de tus aulas en un solo lugar. Toca una para abrirla y subir tu evidencia."
                : "Actividades con fecha de entrega de tus aulas. Sirve para planear la semana y avisar a tiempo."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/panel/calendario?mes=${mesVecino(calendario.mes, -1)}${aula ? `&aula=${aula}` : ""}`}
              className="btn-mini"
              aria-label="Mes anterior"
            >
              ←
            </Link>
            <span className="min-w-40 text-center text-sm font-black capitalize text-slate-800">
              {calendario.tituloMes}
            </span>
            <Link
              href={`/panel/calendario?mes=${mesVecino(calendario.mes, 1)}${aula ? `&aula=${aula}` : ""}`}
              className="btn-mini"
              aria-label="Mes siguiente"
            >
              →
            </Link>
            <Link href="/panel/calendario" className="btn-secundario px-3 py-1.5 text-xs">
              Hoy
            </Link>
          </div>
        </div>

        {calendario.aulas.length > 1 ? (
          <form className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="mes" value={calendario.mes} />
            <label>
              <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                Aula
              </span>
              <select name="aula" defaultValue={calendario.aulaSeleccionada ?? ""} className="campo py-1.5 text-xs">
                <option value="">Todas mis aulas</option>
                {calendario.aulas.map((fila) => (
                  <option key={fila.id} value={fila.id}>
                    {fila.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-secundario px-3 py-1.5 text-xs">
              Filtrar
            </button>
            {calendario.aulaSeleccionada ? (
              <Link href={`/panel/calendario?mes=${calendario.mes}`} className="text-xs font-bold text-inst-700 underline">
                Quitar filtro
              </Link>
            ) : null}
          </form>
        ) : null}
      </header>

      {calendario.sinBaseDeDatos ? (
        <div className="tarjeta p-6 text-sm text-slate-500">
          El calendario necesita la base de datos del plantel. En el preview no hay conexión, así que
          aparece vacío.
        </div>
      ) : calendario.eventos.length === 0 ? (
        <div className="tarjeta p-10 text-center">
          <Icono nombre="calendario" tamano={34} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-base font-bold text-slate-900">Sin entregas este mes</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Cuando tus docentes publiquen actividades con fecha de entrega, aparecerán aquí
            automáticamente.
          </p>
        </div>
      ) : (
        <section className="tarjeta overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {DIAS.map((dia) => (
              <div key={dia} className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                {dia}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {celdas.map((celda) => (
              <div
                key={celda.clave}
                className={`min-h-24 border-b border-r border-slate-100 p-1.5 ${
                  celda.dia === null ? "bg-slate-50/60" : celda.clave === hoyClave ? "bg-inst-50/50" : "bg-white"
                }`}
              >
                {celda.dia ? (
                  <>
                    <p
                      className={`mb-1 text-[11px] font-black ${
                        celda.clave === hoyClave ? "text-inst-700" : "text-slate-400"
                      }`}
                    >
                      {celda.dia}
                    </p>
                    <div className="space-y-1">
                      {celda.eventos.slice(0, 2).map((evento) => chip(evento, esEstudiante))}
                      {celda.eventos.length > 2 ? (
                        <p className="px-1 text-[10px] font-bold text-slate-400">
                          +{celda.eventos.length - 2} más
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}

      {proximos.length > 0 ? (
        <section className="tarjeta p-6">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Icono nombre="reloj" tamano={20} className="text-inst-700" />
            Lo que viene
          </h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {proximos.map((evento) => (
              <li key={evento.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/panel/tareas/${evento.id}`} className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-800">{evento.titulo}</span>
                  <span className="block text-xs text-slate-500">
                    {evento.curso} · {horaLocal(evento.fechaEntrega)} · {evento.parcial}° parcial ·{" "}
                    {evento.puntos} puntos
                  </span>
                </Link>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                  {esEstudiante
                    ? evento.entregado
                      ? "Entregada"
                      : "Pendiente"
                    : `${evento.pendientes ?? 0} de ${evento.inscritos ?? 0} pendientes`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
