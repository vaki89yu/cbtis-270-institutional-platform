"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registroAction, type ActionState } from "@/lib/actions/auth";

type Docente = {
  id: number;
  nombre: string;
  semestre: number | null;
  grupo: string | null;
  turno: string | null;
};

type Props = {
  docentes: Docente[];
  modulos: readonly string[];
  googleEmail?: string;
  googleVerified?: boolean;
  googleMode?: boolean;
  googleName?: string;
};

const NOMBRES_MODULOS: Record<string, string> = {
  "1": "Gestiona la adquisición de mercancías y servicios",
  "2": "Organiza el flujo de mercancías en almacén",
  "3": "Gestiona el tráfico de mercancías de importación y exportación",
  "4": "Gestiona la distribución física de mercancías",
  "5": "Cotiza costos de la cadena de suministro",
};

function Boton({ children, className = "btn-primario", pendingText = "Procesando..." }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

function Estado({ estado }: { estado: ActionState }) {
  if (estado.error) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">{estado.error}</p>;
  }
  if (estado.ok) {
    return <p className="rounded-xl border border-inst-200 bg-inst-50 px-3.5 py-2.5 text-sm font-semibold text-inst-800">{estado.ok}</p>;
  }
  return null;
}

function Campo({ label, children, helper }: { label: string; children: React.ReactNode; helper?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {helper ? <span className="mt-1 block text-xs text-slate-500">{helper}</span> : null}
    </label>
  );
}

export function RegistroProfesional({
  docentes,
  modulos,
  googleEmail = "",
  googleVerified = false,
  googleMode = false,
  googleName = "",
}: Props) {
  const [tipo, setTipo] = useState<"estudiante" | "docente">("estudiante");
  const [turno, setTurno] = useState("Matutino");
  const [semestre, setSemestre] = useState("2");
  const [grupo, setGrupo] = useState("E");
  const [gruposDocente, setGruposDocente] = useState<string[]>(["E"]);
  const [turnosDocente, setTurnosDocente] = useState<string[]>(["Matutino"]);
  const [moduloNum, setModuloNum] = useState("1");
  const [submoduloNum, setSubmoduloNum] = useState("1");
  const [emailOtp, setEmailOtp] = useState(googleEmail);

  const [otpState, setOtpState] = useState<ActionState>({});
  const [otpLoading, setOtpLoading] = useState(false);
  const [codigoDemo, setCodigoDemo] = useState("");
  const otpInputRef = useRef<HTMLInputElement>(null);
  const [registroState, registroFormAction] = useActionState(registroAction, {});
  const [docentesLive, setDocentesLive] = useState<Docente[]>(docentes);

  const cargarDocentes = useCallback(async () => {
    try {
      const res = await fetch("/api/docentes");
      const data = (await res.json()) as { ok?: boolean; docentes?: Docente[] };
      if (data.ok && data.docentes) setDocentesLive(data.docentes);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    cargarDocentes();
    const intervalo = setInterval(cargarDocentes, 8000);
    return () => clearInterval(intervalo);
  }, [cargarDocentes]);

  useEffect(() => {
    if (tipo === "estudiante") cargarDocentes();
  }, [tipo, cargarDocentes]);

  // Sincronizar email si viene de Google
  useEffect(() => {
    if (googleEmail) setEmailOtp(googleEmail);
  }, [googleEmail]);

  const docentesSugeridos = useMemo(
    () =>
      docentesLive.filter((d) => {
        const semOk = !d.semestre || String(d.semestre) === semestre;
        const grupoStr = d.grupo ?? "";
        const grupoOk = !grupoStr || grupoStr.includes(grupo);
        const turnoStr = d.turno ?? "";
        const turnoOk = !turnoStr || turnoStr.includes(turno);
        return semOk && grupoOk && turnoOk;
      }),
    [docentesLive, turno, semestre, grupo],
  );

  const docentesRestantes = useMemo(() => {
    const sugeridos = new Set(docentesSugeridos.map((d) => d.id));
    return docentesLive.filter((d) => !sugeridos.has(d.id));
  }, [docentesLive, docentesSugeridos]);

  function alternar(lista: string[], valor: string, set: (v: string[]) => void) {
    set(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);
  }

  function enTexto(valores: string[], vacio: string) {
    if (valores.length === 0) return vacio;
    if (valores.length === 1) return valores[0];
    return `${valores.slice(0, -1).join(", ")} y ${valores[valores.length - 1]}`;
  }

  function autocompletarOtp(codigo: string) {
    setOtpState({ ok: `Código ${codigo} cargado. Ahora completa el formulario y crea tu cuenta.` });
    // Buscar el input OTP en el formulario
    const otpInput = document.querySelector('input[name="otp"]') as HTMLInputElement;
    if (otpInput) {
      otpInput.value = codigo;
      otpInput.focus();
    }
  }

  async function pedirOtp() {
    console.log("[OTP] Solicitando código para:", emailOtp);
    if (!emailOtp || !emailOtp.includes("@")) {
      setOtpState({ error: "Escribe un correo válido primero." });
      return;
    }
    setOtpLoading(true);
    setOtpState({});
    setCodigoDemo("");
    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailOtp }),
        credentials: "same-origin",
      });
      console.log("[OTP] Respuesta status:", res.status);
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        modo?: string;
        codigo?: string;
      };
      console.log("[OTP] Data:", data);
      if (!res.ok || !data.ok) {
        setOtpState({ error: data.error ?? "No se pudo generar el código." });
        return;
      }
      if (data.codigo) {
        setCodigoDemo(data.codigo);
        setOtpState({
          ok: data.modo === "demo" 
            ? `✅ Modo demo: tu código es ${data.codigo}. ¡Ya puedes usarlo abajo!`
            : data.message ?? "Código enviado. Revisa tu correo.",
        });
      } else {
        setOtpState({ ok: data.message ?? "Código enviado. Revisa tu correo." });
      }
    } catch (err) {
      console.error("[OTP] Error fetch:", err);
      setOtpState({ error: "No se pudo conectar para generar el código. Intenta nuevamente. Verifica que el correo sea válido." });
    } finally {
      setOtpLoading(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[0.82fr_1.48fr]">
      <aside className="space-y-5 lg:sticky lg:top-6">
        <div className="auth-dark-card rounded-[26px] p-6 text-white sm:p-7">
          <span className="auth-kicker">Sistema Escolar</span>
          <h2 className="mt-5 text-2xl font-bold leading-tight">Alta en la Plataforma</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Registro institucional para la comunidad de Logística. Selecciona tu perfil, verifica tu correo
            y vincula tus asignaturas escolares.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              ["Paso 1", "Verificar"],
              ["Paso 2", "Completar"],
              ["Paso 3", "Ingresar"],
            ].map(([paso, texto]) => (
              <div key={paso} className="rounded-xl border border-white/12 bg-white/8 p-3 text-center">
                <p className="text-[11px] font-bold text-sky-200">{paso}</p>
                <p className="mt-0.5 text-xs font-semibold text-white/90">{texto}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-sky-200/25 bg-white/10 p-4 text-xs leading-relaxed text-white/80">
            <strong className="text-sky-200">Grupos escolares:</strong> E y F en turnos matutino y vespertino.
            Alumnos eligen a su docente; docentes configuran submódulos y grupos a su cargo.
          </div>
        </div>

        <div className="auth-card rounded-[26px] p-6">
          <h2 className="text-base font-bold text-slate-800">Verificación de Correo</h2>
          {googleVerified && googleEmail ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-800">Cuenta Google seleccionada</p>
              <p className="mt-1 text-xs text-emerald-700">{googleEmail}</p>
              <p className="mt-2 text-xs text-emerald-700">
                Ahora solicita tu OTP para confirmar que tienes acceso a ese correo.
              </p>
            </div>
          ) : null}
          <div className="mt-5 space-y-3">
            <Campo label="Correo para vincular la cuenta">
              <input
                name="emailOtpVisible"
                type="email"
                required
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value)}
                className="campo"
                placeholder="usuario@gmail.com"
                readOnly={googleVerified && Boolean(googleEmail)}
              />
            </Campo>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              El código de verificación se envía únicamente a tu correo electrónico. En modo demo se muestra aquí mismo.
            </p>
            <Estado estado={otpState} />
            {codigoDemo ? (
              <div className="rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  🎉 Código generado
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-3xl font-black tracking-[0.3em] text-blue-900">{codigoDemo}</span>
                  <button
                    type="button"
                    onClick={() => autocompletarOtp(codigoDemo)}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700"
                  >
                    Usar código
                  </button>
                </div>
                <p className="mt-2 text-xs text-blue-600">Click en "Usar código" para autocompletar abajo</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={pedirOtp}
              disabled={otpLoading || !emailOtp.includes("@")}
              className="btn-primario w-full border-2 border-blue-700 shadow-md shadow-blue-900/15 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {otpLoading ? "⏳ Generando..." : "📧 Enviar código al correo"}
            </button>
            <p className="text-[11px] text-slate-400 text-center">Si el botón no responde, verifica que el correo tenga @ y dominio</p>
          </div>
        </div>

        <a
          href="/google"
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-black text-inst-800 shadow-sm">
            G
          </span>
          Continuar con Google
        </a>

        {googleMode && !googleVerified ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            <p className="font-black">Continúa con OTP</p>
            <p className="mt-1 text-xs leading-relaxed">
              Para esta versión rápida, escribe tu correo y solicita el código OTP. Cuando se agreguen
              credenciales Google OAuth reales, este mismo botón iniciará sesión automáticamente.
            </p>
          </div>
        ) : null}
      </aside>

      <section className="auth-card overflow-hidden rounded-[30px]">
        <div className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-r from-inst-50 via-white to-amber-50 px-6 py-6 sm:px-8">
          <div className="absolute -right-10 -top-14 h-32 w-32 rounded-full bg-inst-200/40 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Formulario Oficial</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Información del Usuario</h2>
              <p className="mt-1.5 text-sm text-slate-600">Elige si eres estudiante o docente para completar los datos correspondientes.</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm ring-1 ring-slate-200">✓</div>
          </div>
        </div>

        <form action={registroFormAction} className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTipo("estudiante")}
              className={`group rounded-2xl border p-4 text-left transition ${tipo === "estudiante" ? "border-sky-300 bg-gradient-to-br from-sky-50 to-white shadow-md ring-1 ring-sky-200/50" : "border-slate-200 bg-white/80 hover:border-sky-200 hover:bg-sky-50/50"}`}
            >
              <span className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold shadow-sm ${tipo === "estudiante" ? "bg-sky-300 text-white" : "bg-slate-100 text-slate-500"}`}>A</span>
                <span>
                  <span className="block text-base font-semibold text-slate-900">Alumno</span>
                  <span className="mt-0.5 block text-xs font-semibold text-slate-600">Control escolar y docente a cargo</span>
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTipo("docente")}
              className={`group rounded-2xl border p-4 text-left transition ${tipo === "docente" ? "border-sky-300 bg-gradient-to-br from-sky-50 to-white shadow-md ring-1 ring-sky-200/50" : "border-slate-200 bg-white/80 hover:border-sky-200 hover:bg-sky-50/50"}`}
            >
              <span className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold shadow-sm ${tipo === "docente" ? "bg-sky-300 text-white" : "bg-slate-100 text-slate-500"}`}>D</span>
                <span>
                  <span className="block text-base font-semibold text-slate-900">Docente</span>
                  <span className="mt-0.5 block text-xs font-semibold text-slate-600">Módulos, grupos y turnos</span>
                </span>
              </span>
            </button>
          </div>
          <input type="hidden" name="tipoCuenta" value={tipo} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Campo label="Nombre completo">
                <input name="nombre" required defaultValue={googleName} className="campo" placeholder={tipo === "docente" ? "Mtra. Pamela Gómez Hernández" : "Josué Roberto Hernández López"} />
              </Campo>
            </div>

            <Campo label="Correo">
              <input
                name="email"
                type="email"
                required
                value={googleVerified ? googleEmail : emailOtp}
                onChange={(e) => setEmailOtp(e.target.value)}
                readOnly={googleVerified}
                className="campo disabled:bg-slate-100"
                placeholder="usuario@cetis270.edu.mx"
              />
            </Campo>

            {googleVerified ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                Correo verificado. Completa tus datos de alumno o docente para guardar la cuenta.
              </div>
            ) : (
              <Campo label="Código OTP" helper={codigoDemo ? `Usa: ${codigoDemo}` : "El mismo código que te llegó a tu correo."}>
                <input ref={otpInputRef} name="otp" required={!googleVerified} inputMode="numeric" maxLength={6} className="campo tracking-[0.35em] font-bold" placeholder="123456" />
              </Campo>
            )}

            <Campo label="Contraseña" helper="Mínimo 8 caracteres.">
              <input name="password" type="password" required minLength={8} className="campo" placeholder="Contraseña " />
            </Campo>

            <Campo label="Teléfono de contacto">
              <input name="telefono" className="campo" placeholder="55 1234 5678" />
            </Campo>

            {tipo === "estudiante" ? (
              <Campo label="Turno">
                <select name="turno" className="campo" value={turno} onChange={(e) => setTurno(e.target.value)}>
                  <option>Matutino</option>
                  <option>Vespertino</option>
                </select>
              </Campo>
            ) : (
              <input type="hidden" name="turno" value={turno} />
            )}

            <div className={tipo === "estudiante" ? "grid grid-cols-2 gap-3" : ""}>
              <Campo label="Semestre">
                <select name="semestre" className="campo" value={semestre} onChange={(e) => setSemestre(e.target.value)}>
                  {[2, 3, 4, 5, 6].map((sem) => (
                    <option key={sem} value={sem}>{sem}°</option>
                  ))}
                </select>
              </Campo>
              {tipo === "estudiante" ? (
                <Campo label="Grupo">
                  <select name="grupo" className="campo" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
                    <option value="E">E</option>
                    <option value="F">F</option>
                  </select>
                </Campo>
              ) : (
                <input type="hidden" name="grupo" value={grupo} />
              )}
            </div>

            {tipo === "docente" ? (
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Módulo">
                  <select
                    name="moduloNumero"
                    className="campo"
                    value={moduloNum}
                    onChange={(e) => setModuloNum(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5].map((m) => (
                      <option key={m} value={m}>Módulo {m}</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Submódulo">
                  <select
                    name="submoduloNumero"
                    className="campo"
                    value={submoduloNum}
                    onChange={(e) => setSubmoduloNum(e.target.value)}
                  >
                    {[1, 2, 3, 4].map((s) => (
                      <option key={s} value={s}>Submódulo {s}</option>
                    ))}
                  </select>
                </Campo>
              </div>
            ) : null}

            {tipo === "estudiante" ? (
              <>
                <div className="sm:col-span-2">
                  <Campo
                    label="Tutor / docente a cargo"
                    helper={
                      docentes.length === 0
                        ? "Aún no hay docentes registrados en la plataforma."
                        : "Elige al docente registrado que llevará tu seguimiento."
                    }
                  >
                    <select name="tutorDocenteId" className="campo" defaultValue="">
                      <option value="">Selecciona tu docente</option>
                      {docentesLive.map((docente) => (
                        <option key={docente.id} value={docente.id}>
                          {docente.nombre}
                          {docente.semestre ? ` · ${docente.semestre}°` : ""}
                          {docente.grupo ? ` · Grupo ${docente.grupo}` : ""}
                          {docente.turno ? ` · ${docente.turno}` : ""}
                        </option>
                      ))}
                    </select>
                  </Campo>
                </div>
                <Campo label="Número de control escolar">
                  <input name="numeroControlEscolar" className="campo" placeholder="CE-270-014" />
                </Campo>
                <label className="sm:col-span-2 flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <input type="checkbox" name="aceptoReglamento" required className="mt-1 h-4 w-4 rounded border-slate-300" />
                  Acepto el reglamento, el uso académico de mis datos y el seguimiento por parte del docente responsable de Logística.
                </label>
              </>
            ) : (
              <>
                <Campo label="Nombre del módulo" helper="Se completa automáticamente según el módulo seleccionado.">
                  <input
                    name="moduloNombre"
                    value={NOMBRES_MODULOS[moduloNum] ?? ""}
                    readOnly
                    className="campo cursor-not-allowed border-blue-200 bg-blue-50/70 font-medium text-slate-700"
                  />
                </Campo>
                <Campo label="Nombre del submódulo">
                  <input name="submoduloNombre" className="campo" placeholder="Control de inventarios y conteo cíclico" />
                </Campo>

                <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="mb-2 text-sm font-semibold text-slate-800">Grupos que atiende</p>
                    <p className="mb-2 text-xs text-slate-500">Puedes marcar uno o los dos.</p>
                    <div className="flex gap-4">
                      {["E", "F"].map((g) => (
                        <label key={g} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            name="gruposResponsables"
                            value={g}
                            checked={gruposDocente.includes(g)}
                            onChange={() => alternar(gruposDocente, g, setGruposDocente)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Grupo {g}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="mb-2 text-sm font-semibold text-slate-800">Turnos que atiende</p>
                    <p className="mb-2 text-xs text-slate-500">Puedes marcar uno o los dos.</p>
                    <div className="flex gap-4">
                      {["Matutino", "Vespertino"].map((t) => (
                        <label key={t} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            name="turnosResponsables"
                            value={t}
                            checked={turnosDocente.includes(t)}
                            onChange={() => alternar(turnosDocente, t, setTurnosDocente)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          {t}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-2xl border border-inst-200 bg-inst-50 p-4 text-sm text-inst-800">
                  <p className="font-bold">Resumen de tu asignación</p>
                  <ul className="mt-2 space-y-1">
                    <li>
                      Impartes <strong>Módulo {moduloNum} · Submódulo {submoduloNum}</strong>
                    </li>
                    <li>
                      Semestre: <strong>{semestre}°</strong>
                    </li>
                    <li>
                      {gruposDocente.length > 1 ? "Grupos" : "Grupo"}:{" "}
                      <strong>{enTexto(gruposDocente, "sin grupo seleccionado")}</strong>
                    </li>
                    <li>
                      {turnosDocente.length > 1 ? "Turnos" : "Turno"}:{" "}
                      <strong>{enTexto(turnosDocente, "sin turno seleccionado")}</strong>
                    </li>
                  </ul>
                  <p className="mt-3">
                    {gruposDocente.length === 0 || turnosDocente.length === 0 ? (
                      <span className="font-semibold text-rose-700">
                        Marca al menos un grupo y un turno para recibir el seguimiento de alumnos.
                      </span>
                    ) : (
                      <>
                        Recibirás registros, inicios de sesión y seguimiento de los alumnos de{" "}
                        <strong>{semestre}° semestre</strong>, {gruposDocente.length > 1 ? "grupos" : "grupo"}{" "}
                        <strong>{enTexto(gruposDocente, "")}</strong>,{" "}
                        {turnosDocente.length > 1 ? "turnos" : "turno"}{" "}
                        <strong>{enTexto(turnosDocente, "")}</strong>.
                      </>
                    )}
                  </p>
                </div>
              </>
            )}
          </div>

          <Estado estado={registroState} />
          <Boton className="btn-primario px-8 text-base" pendingText="Creando cuenta ...">
            Crear cuenta
          </Boton>
        </form>
      </section>
    </div>
  );
}
