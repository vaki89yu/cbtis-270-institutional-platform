"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { Campo, FormatoDinamico } from "@/lib/formatos/catalogo";
import {
  GRUPOS,
  SEMESTRES,
  TURNOS,
  INCOTERMS_2020,
  UNIDADES_MEDIDA,
  MEDIOS_TRANSPORTE,
  CONFIGURACIONES_VEHICULARES,
  PRIORIDADES,
  MONEDAS,
  ESTADOS_OT,
  GARANTIAS_OFERTA,
  CONDICIONES_PAGO,
  TIEMPOS_ENTREGA,
} from "@/lib/formatos/opciones";
import { abrirImprimible } from "@/lib/formatos/imprimible";
import { Icono } from "@/components/iconos";

type Datos = Record<string, string | string[]>;

type Props = {
  formato: FormatoDinamico;
  perfilUsuario?: {
    nombre: string;
    matricula: string | null;
    grupo: string;
    semestre: string;
    turno: string;
  } | null;
  docentes: Array<{ id: number; nombre: string }>;
};

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function matriculaDeUsuario(u?: Props["perfilUsuario"]): string {
  if (!u) return "";
  const base = u.matricula?.trim();
  if (base) return base;
  const año = new Date().getFullYear();
  const sem = u.semestre || "2";
  const grupo = u.grupo || "E";
  return `270-${año}-${sem}${grupo}`;
}

function seleccionarCampo(
  campo: Campo,
  valor: unknown,
  onChange: (v: string | string[]) => void,
): ReactElement {
  const v = String(valor ?? "");
  const inputClass = "campo w-full";

  if (campo.tipo === "fecha") {
    const esFechaElaboracion = campo.id === "fecha";
    return (
      <input type="date" value={v || hoy()} readOnly={esFechaElaboracion} onChange={(e) => onChange(e.target.value)} className={`${inputClass} ${esFechaElaboracion ? "cursor-not-allowed border-blue-200 bg-blue-50/80 text-slate-600" : ""}`} />
    );
  }

  if (campo.tipo === "numero") {
    return <input type="number" value={v} onChange={(e) => onChange(e.target.value)} placeholder={campo.placeholder} className={inputClass} inputMode="decimal" />;
  }

  if (campo.tipo === "textoLargo") {
    return <textarea rows={3} value={v} onChange={(e) => onChange(e.target.value)} placeholder={campo.placeholder} className={inputClass} />;
  }

  // Selección semántica por contenido del campo
  const id = campo.id.toLowerCase();
  const es = (clave: string) => id.includes(clave);

  const esGrupo = es("grupo") || campo.etiqueta.includes("Grupo (E / F)");
  const esSemestre = es("semestre");
  const esTurno = es("turno") && !es("tutoria") && !es("tipoEntrega");
  const esDocente = es("docente") || campo.etiqueta.includes("Docente responsable");
  const esMatricula = id === "matricula";
  const esIncoterms = es("incoterms");
  const esUnidadMedida = campo.etiqueta.includes("Unidad de medida") || es("unidad") || id === "umt";
  const esTransporte = es("transporte") && !es("transportista");
  const esConfigVehicular = es("configvehicular") || campo.etiqueta.includes("Configuración vehicular");
  const esPrioridad = es("prioridad") || campo.etiqueta.includes("Prioridad");
  const esMoneda = es("moneda");
  const esEstado = es("estado") && !es("estadoFisico") && !es("estadoRecepcion");
  const esTipo = es("tipo") && !es("tipoSello") && !es("tipocomprobante");
  const esTipoSello = es("tiposello") || es("sello");

  const lugarEntregaOAlmacen = es("almacen") || es("lugar_entrega") || campo.etiqueta.includes("Lugar de entrega") || campo.etiqueta.includes("Área / almacén");

  if (campo.tipo === "correo") {
    return <input type="email" value={v} onChange={(e) => onChange(e.target.value)} placeholder={campo.placeholder} className={inputClass} inputMode="email" />;
  }
  if (campo.tipo === "telefono") {
    return <input type="tel" value={v} onChange={(e) => onChange(e.target.value)} placeholder={campo.placeholder} className={inputClass} inputMode="tel" />;
  }

  if (esGrupo) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona</option>
        {GRUPOS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    );
  }

  if (esSemestre) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona</option>
        {SEMESTRES.map((x) => <option key={x} value={x}>{x}°</option>)}
      </select>
    );
  }

  if (esTurno) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona</option>
        {TURNOS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    );
  }

  if (esDocente) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona el docente</option>
        {docentesFromProps.map((d) => (
          <option key={d.id} value={d.nombre}>{d.nombre}</option>
        ))}
      </select>
    );
  }

  if (esMatricula) {
    return (
      <input
        value={v || matriculaAutom}
        readOnly
        className={`${inputClass} cursor-not-allowed border-blue-200 bg-blue-50/70 text-slate-600`}
      />
    );
  }

  if (esIncoterms) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona INCOTERM</option>
        {INCOTERMS_2020.map((x) => <option key={x} value={x.split(" – ")[0]}>{x}</option>)}
      </select>
    );
  }

  if (esUnidadMedida) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona unidad</option>
        {UNIDADES_MEDIDA.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    );
  }

  const esGarantia = es("garantia") && !es("tipoSello");
  const esCondicionesPago = es("condicionespago") || es("condicionpagou") || campo.etiqueta === "Condiciones de pago";
  const esTiempoEntrega = es("tiempoentrega") || es("tiempoentregaq") || campo.etiqueta.includes("Tiempo de entrega");

  if (esGarantia) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona garantía</option>
        {GARANTIAS_OFERTA.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    );
  }

  if (esCondicionesPago) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona condición de pago</option>
        {CONDICIONES_PAGO.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    );
  }

  if (esTiempoEntrega) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona tiempo de entrega</option>
        {TIEMPOS_ENTREGA.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    );
  }

  if (esTransporte) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona medio</option>
        {MEDIOS_TRANSPORTE.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    );
  }

  if (esConfigVehicular) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona configuración</option>
        {CONFIGURACIONES_VEHICULARES.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    );
  }

  if (esPrioridad) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona prioridad</option>
        {PRIORIDADES.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    );
  }

  if (esMoneda) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona moneda</option>
        {MONEDAS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    );
  }

  if (esEstado || esTipo || esTipoSello) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona</option>
        {ESTADOS_OT.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    );
  }

  if (lugarEntregaOAlmacen) {
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Selecciona ubicación</option>
        <option>Almacén Escuela · Edificio C</option>
        <option>Aula de prácticas · Logística</option>
        <option>Zona Norte · Racks partido</option>
        <option>Muelle de carga · Partido Romero</option>
      </select>
    );
  }

  return (
    <input
      type="text"
      value={v}
      onChange={(e) => onChange(e.target.value)}
      placeholder={campo.placeholder}
      className={inputClass}
    />
  );
}

let docentesFromProps: Array<{ id: number; nombre: string }> = [];
let matriculaAutom = "";

export function FormatoLlenable({ formato, perfilUsuario, docentes }: Props) {
  const [datos, setDatos] = useState<Datos>({});
  const [loading, setLoading] = useState<"pdf" | "guardar" | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [faltantes, setFaltantes] = useState<string[]>([]);

  docentesFromProps = docentes;
  matriculaAutom = matriculaDeUsuario(perfilUsuario);

  // precarga inteligente del perfil
  useEffect(() => {
    setDatos((prev) => ({
      ...prev,
      alumno: prev.alumno ?? perfilUsuario?.nombre ?? "",
      matricula: prev.matricula ?? matriculaAutom,
      grupo: prev.grupo ?? (perfilUsuario?.grupo || ""),
      semestre: prev.semestre ?? (perfilUsuario?.semestre || ""),
      turno: prev.turno ?? (perfilUsuario?.turno || ""),
      fecha: prev.fecha ?? hoy(),
    }));
  }, [perfilUsuario]);

  const setValor = (id: string, valor: string | string[]) => {
    setDatos((prev) => ({ ...prev, [id]: valor }));
  };

  const setFila = (id: string, fila: number, col: number, valor: string) => {
    setDatos((prev) => {
      const arr = Array.isArray(prev[id]) ? [...(prev[id] as string[])] : [];
      const partes = (arr[fila] ?? "").split("|");
      while (partes.length <= col) partes.push("");
      partes[col] = valor;
      arr[fila] = partes.join("|");
      return { ...prev, [id]: arr };
    });
  };

  const progreso = useMemo(() => {
    const requeridos: Campo[] = [];
    formato.secciones.forEach((s) =>
      s.campos.forEach((c) => {
        if (c.requerido) requeridos.push(c);
      }),
    );
    const llenos = requeridos.filter((c) => {
      const v = datos[c.id];
      return Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim());
    }).length;
    return {
      total: requeridos.length,
      llenos,
      pct: requeridos.length ? Math.round((llenos / requeridos.length) * 100) : 100,
    };
  }, [datos, formato]);

  function validar(): boolean {
    const falt: string[] = [];
    formato.secciones.forEach((s) =>
      s.campos.forEach((c) => {
        if (!c.requerido) return;
        const v = datos[c.id];
        const vacio = Array.isArray(v) ? v.length === 0 : !v || !String(v).trim();
        if (vacio) falt.push(c.etiqueta);
      }),
    );
    setFaltantes(falt);
    return falt.length === 0;
  }

  function imprimir() {
    const abierto = abrirImprimible(formato, datos);
    setMensaje(
      abierto
        ? { tipo: "ok", texto: "Se abrió la vista imprimible. Usa Imprimir y luego Guardar como PDF." }
        : { tipo: "error", texto: "Tu navegador bloqueó la ventana emergente. Permite las ventanas emergentes e inténtalo de nuevo." },
    );
  }

  async function guardar() {
    setLoading("guardar");
    setMensaje(null);
    try {
      const res = await fetch("/api/formatos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: formato.codigo, datos }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      setMensaje(
        json.ok
          ? { tipo: "ok", texto: json.message ?? "Formato guardado en tu expediente." }
          : { tipo: "error", texto: json.error ?? "No se pudo guardar." },
      );
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión al guardar." });
    } finally {
      setLoading(null);
    }
  }

  const colClass = (ancho: number) =>
    ancho === 3 ? "sm:col-span-3" : ancho === 2 ? "sm:col-span-2" : "col-span-1";

  return (
    <div className="space-y-5">
      {/* Barra de progreso */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Progreso del llenado</p>
            <p className="text-xs text-slate-500">
              {progreso.llenos} de {progreso.total} campos requeridos completados
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${
              progreso.pct === 100 ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
            }`}
          >
            {progreso.pct}%
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
            style={{ width: `${progreso.pct}%` }}
          />
        </div>
      </div>

      {/* Secciones */}
      {formato.secciones.map((seccion, si) => (
        <section key={si} className="tarjeta-azul tarjeta-estatica rounded-2xl p-5 text-white">
          <h3 className="text-xs font-black uppercase tracking-wider text-sky-200">{seccion.titulo}</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {seccion.campos.map((campo) => {
              const valor = datos[campo.id];
              const esTabla = campo.tipo === "tabla";

              if (esTabla) {
                const columnas = campo.columnas ?? [];
                const filas = Math.max(campo.filasTabla ?? 5, 1);
                const arr = Array.isArray(valor) ? valor : [];
                return (
                  <div key={campo.id} className={`${colClass(campo.ancho ?? 1)} overflow-x-auto`}>
                    <p className="mb-2 text-xs font-semibold text-white">
                      {campo.etiqueta} {campo.requerido ? "*" : ""}
                    </p>
                    <table className="w-full border-collapse overflow-hidden rounded-lg text-[11px]">
                      <thead>
                        <tr>
                          {columnas.map((col) => (
                            <th
                              key={col}
                              className="border border-white/20 bg-white/20 px-2 py-1.5 text-left font-bold text-white"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: filas }).map((_, fi) => (
                          <tr key={fi}>
                            {columnas.map((_, ci) => (
                              <td key={ci} className="border border-white/15 p-0">
                                <input
                                  value={((arr[fi] ?? "").split("|")[ci] ?? "")}
                                  onChange={(e) => setFila(campo.id, fi, ci, e.target.value)}
                                  className="w-full bg-white/95 px-2 py-1.5 text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-sky-300"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              return (
                <label key={campo.id} className={`block ${colClass(campo.ancho ?? 1)}`}>
                  <span className="mb-1.5 block text-xs font-semibold text-white">
                    {campo.etiqueta} {campo.requerido ? <span className="text-amber-300">*</span> : ""}
                  </span>
                  {seleccionarCampo(campo, valor, (v) => setValor(campo.id, v))}
                </label>
              );
            })}
          </div>
        </section>
      ))}

      {/* Instrucciones */}
      <section className="tarjeta p-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-inst-700">Instrucciones de llenado</h3>
        <ul className="mt-3 space-y-1.5">
          {formato.instrucciones.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
              <span className="font-bold text-inst-600">{i + 1}.</span>
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          Referencia normativa: <strong>{formato.referenciaNormativa}</strong>
        </p>
      </section>

      {/* Acciones */}
      <div className="sticky bottom-3 z-20 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-xl backdrop-blur-md">
        {mensaje ? (
          <p
            className={`mb-3 rounded-xl px-3 py-2 text-sm font-semibold ${
              mensaje.tipo === "error"
                ? "bg-rose-50 text-rose-700"
                : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {mensaje.texto}
          </p>
        ) : null}

        {faltantes.length > 0 ? (
          <p className="mb-3 text-xs text-rose-600">
            Campos pendientes: {faltantes.join(" · ")}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={imprimir}
            className="btn-primario flex-1 sm:flex-none sm:px-6"
          >
            <Icono nombre="imprimir" tamano={17} /> Vista imprimible · Dictamen
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={loading !== null}
            className="btn-secundario flex-1 sm:flex-none sm:px-6"
          >
            {loading === "guardar" ? "Guardando..." : "Guardar en mi expediente"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDatos({});
              setFaltantes([]);
              setMensaje(null);
            }}
            className="btn-mini"
          >
            Limpiar
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          La vista imprimible incluye membrete institucional, marca de agua, folio, dictamen, observaciones,
          sello y bloque de firmas del CBTIS No. 270 (CCT 08DCT0270T).
        </p>
      </div>
    </div>
  );
}
