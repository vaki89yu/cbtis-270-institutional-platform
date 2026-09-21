"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { notifications, otpCodes, platformSettings, studentProfiles, teacherProfiles, users } from "@/db/schema";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { asegurarEsquemaCore } from "@/lib/ensure-schema";
import { esCorreoInstitucional, generarOtp } from "@/lib/email";
import { enviarOtpReal } from "@/lib/verificacion";
import {
  crearNotificacion,
  notificarDocentesInicioSesion,
  notificarDocentesRegistroAlumno,
  registrarActividad,
} from "@/lib/notificaciones";

export type ActionState = { error?: string; ok?: string };

function valor(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numero(formData: FormData, key: string, fallback: number | null = null) {
  const val = formData.get(key);
  if (val === null || val === undefined || String(val).trim() === "") {
    return fallback;
  }
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

async function verificarOtp(email: string, codigo: string) {
  try {
    await asegurarEsquemaCore();
    const rows = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.code, codigo),
          eq(otpCodes.used, false),
          gt(otpCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    const otp = rows[0];
    if (otp) {
      await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));
      return true;
    }
  } catch (error) {
    console.error("OTP database verification error:", error);
  }

  // Fallback: permite verificar el OTP emitido en esta sesión aunque el almacenamiento
  // de la base de datos temporalmente no esté disponible.
  const jar = await cookies();
  const fallback = jar.get("otp_fallback")?.value ?? "";
  const [savedEmail, savedCode, expiresRaw] = fallback.split("|");
  const expires = Number(expiresRaw);
  if (
    savedEmail?.toLowerCase() === email.toLowerCase() &&
    savedCode === codigo &&
    Number.isFinite(expires) &&
    expires > Date.now()
  ) {
    jar.delete("otp_fallback");
    return true;
  }
  return false;
}

async function marcarCorreoVerificado(email: string) {
  const jar = await cookies();
  jar.set("otp_verified_email", email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
    secure: process.env.NODE_ENV === "production",
  });
}

async function correoEstaVerificado(email: string) {
  const jar = await cookies();
  const a = jar.get("otp_verified_email")?.value?.toLowerCase();
  const b = jar.get("google_verified_email")?.value?.toLowerCase();
  return a === email || b === email;
}

export async function solicitarOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = valor(formData, "email").toLowerCase();
  if (!email || !email.includes("@")) return { error: "Escribe un correo válido." };
  if (!esCorreoInstitucional(email)) {
    return { error: "Escribe un correo válido para recibir tu código OTP." };
  }

  const codigo = generarOtp();
  await db.insert(otpCodes).values({
    email,
    code: codigo,
    purpose: "registro",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const envio = await enviarOtpReal({
    email,
    codigo,
    origin: "https://cbtis270.edu.mx",
  });
  if (!envio.sent) return { error: envio.message };
  return { ok: envio.message };
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = valor(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Escribe tu correo y contraseña." };
  }

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Credenciales incorrectas. Verifica tus datos." };
  }
  if (!user.activo) {
    return { error: "Tu cuenta está desactivada. Acude a Jefatura de Logística." };
  }

  await createSession(user.id);

  // Estas notificaciones son complementarias: nunca deben impedir que el usuario
  // entre al panel si alguna tabla secundaria de actividad/notificaciones falla.
  try {
    await registrarActividad(user.id, "inicio_sesion", "Acceso correcto a la plataforma.");
  } catch (error) {
    console.error("No se pudo registrar la actividad de inicio de sesión:", error);
  }

  if (user.rol === "estudiante") {
    try {
      await notificarDocentesInicioSesion(user.id);
    } catch (error) {
      console.error("No se pudieron notificar los docentes del inicio de sesión:", error);
    }
  }

  redirect("/panel");
}

export async function registroAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tipoCuenta = valor(formData, "tipoCuenta") || "estudiante";
  const nombre = valor(formData, "nombre");
  const email = valor(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const otp = valor(formData, "otp");
  const turno = valor(formData, "turno") || "Matutino";
  const semestre = numero(formData, "semestre", tipoCuenta === "docente" ? 1 : 1);
  const grupo = valor(formData, "grupo") || "E";
  const modulo = valor(formData, "especialidad") || "Cadena de Suministro";
  const gruposPermitidos = ["E", "F"];

  if (!["estudiante", "docente"].includes(tipoCuenta)) return { error: "Tipo de cuenta no válido." };
  if (nombre.length < 5) return { error: "Escribe el nombre completo con apellidos." };
  if (!esCorreoInstitucional(email)) return { error: "Escribe un correo válido." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (!gruposPermitidos.includes(grupo)) return { error: "El grupo permitido para esta etapa nacional es E o F." };
  if (!semestre || semestre < 2 || semestre > 6) return { error: "Selecciona un semestre válido de 2° a 6°." };

  const jar = await cookies();
  const verificado = await correoEstaVerificado(email);

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return { error: "Ese correo ya tiene cuenta. Inicia sesión con tu contraseña o con OTP." };
  }

  if (!verificado) {
    if (otp.length !== 6) return { error: "Primero verifica tu correo con el código OTP de 6 dígitos." };
    const otpValido = await verificarOtp(email, otp);
    if (!otpValido) {
      return { error: "El código OTP es incorrecto, ya fue usado o expiró. Solicita uno nuevo." };
    }
    await marcarCorreoVerificado(email);
  }

  const numeroControlEscolar = valor(formData, "numeroControlEscolar");
  const matriculaCapturada =
    valor(formData, "matriculaAlumno") || valor(formData, "numeroControl") || numeroControlEscolar;
  const matriculaAlumno =
    matriculaCapturada ||
    `270-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;



  let userId: number;
  try {
    const inserted = await db
      .insert(users)
      .values({
        nombre,
        email,
        passwordHash: hashPassword(password),
        rol: tipoCuenta,
        matricula: tipoCuenta === "estudiante" ? matriculaAlumno : null,
        especialidad: modulo,
        semestre,
        turno,
        emailVerificado: true,
      })
      .returning({ id: users.id });

    userId = inserted[0].id;

    if (tipoCuenta === "estudiante") {
      const tutorDocenteId = numero(formData, "tutorDocenteId", null);
      const tutorDocenteNombre = valor(formData, "tutorDocenteNombre");

      await db.insert(studentProfiles).values({
        userId,
        numeroControl: matriculaAlumno,
        numeroControlEscolar: numeroControlEscolar || null,
        grupo,
        tutorDocenteId,
        tutorDocenteNombre: tutorDocenteNombre || null,
        curp: valor(formData, "curp") || null,
        telefono: valor(formData, "telefono") || null,
        domicilio: valor(formData, "domicilio") || null,
        contactoEmergenciaNombre: valor(formData, "contactoEmergenciaNombre") || null,
        contactoEmergenciaTelefono: valor(formData, "contactoEmergenciaTelefono") || null,
        observaciones: valor(formData, "observaciones") || null,
        aceptoReglamento: formData.get("aceptoReglamento") === "on",
      });

      await notificarDocentesRegistroAlumno({
        alumnoId: userId,
        nombre,
        numeroControl: matriculaAlumno,
        turno,
        semestre,
        grupo,
        tutorDocenteId,
      });

      await crearNotificacion(
        userId,
        "Registro verificado",
        "Tu cuenta quedó verificada y guardada. Ya puedes acceder al panel de Logística.",
        "bienvenida",
      );
    } else {
      const moduloNumero = numero(formData, "moduloNumero", null);
      const submoduloNumero = numero(formData, "submoduloNumero", null);
      const moduloNombre = valor(formData, "moduloNombre");
      const submoduloNombre = valor(formData, "submoduloNombre");

      const gruposSel = formData.getAll("gruposResponsables").map(String).filter(Boolean);
      const turnosSel = formData.getAll("turnosResponsables").map(String).filter(Boolean);
      const gruposFinal = gruposSel.length > 0 ? gruposSel : [grupo];
      const turnosFinal = turnosSel.length > 0 ? turnosSel : [turno];

      await db.insert(teacherProfiles).values({
        userId,
        numeroEmpleado: valor(formData, "numeroEmpleado"),
        departamento: "Logística",
        asignaturaBase:
          moduloNumero && submoduloNumero
            ? `Módulo ${moduloNumero} · Submódulo ${submoduloNumero}`
            : valor(formData, "asignaturaBase") || modulo,
        moduloNumero,
        submoduloNumero,
        moduloNombre: moduloNombre || null,
        submoduloNombre: submoduloNombre || null,
        semestreResponsable: semestre,
        grupoResponsable: gruposFinal.length === 1 ? gruposFinal[0] : "Todos",
        turnoResponsable: turnosFinal[0],
        gruposResponsables: gruposFinal.join(","),
        turnosResponsables: turnosFinal.join(","),
        telefono: valor(formData, "telefono") || null,
        recibeNotificaciones: true,
      });

      const admins = await db.select({ id: users.id }).from(users).where(eq(users.rol, "admin"));
      for (const admin of admins) {
        await db.insert(notifications).values({
          userId: admin.id,
          titulo: "Nuevo docente registrado",
          contenido: `${nombre} se registró como docente de Logística. ${
            moduloNumero && submoduloNumero ? `Módulo ${moduloNumero} · Submódulo ${submoduloNumero}. ` : ""
          }Semestre ${semestre}°, grupos ${gruposFinal.join(" y ")}, turnos ${turnosFinal.join(" y ")}.`,
          tipo: "registro_docente",
        });
      }
      await registrarActividad(userId, "registro_docente_verificado", "Docente registrado con validación de correo.");
      revalidatePath("/registro");
      revalidatePath("/api/docentes");
    }

    jar.delete("google_verified_email");
    jar.delete("otp_verified_email");
    await createSession(userId);
  } catch (err: any) {
    console.error("Error en registroAction:", err);
    let msg = "No se pudo guardar la cuenta. Verifica que los datos sean correctos.";
    if (String(err?.message || "").includes("users_email_unique")) {
      msg = "Esta cuenta de correo ya está registrada.";
    } else if (String(err?.message || "").includes("unique")) {
      msg = "Esta matrícula o número de control ya está registrada por otro alumno.";
    }
    return { error: msg };
  }

  redirect("/panel");
}

export async function continuarConGoogleCorreoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = valor(formData, "email").toLowerCase();
  const otp = valor(formData, "otp");
  const nombre = valor(formData, "nombre");

  if (!email || !esCorreoInstitucional(email)) {
    return { error: "Escribe el correo de tu cuenta de Google." };
  }
  if (otp.length !== 6) {
    return { error: "Escribe el código OTP de 6 dígitos." };
  }

  const otpValido = await verificarOtp(email, otp);
  if (!otpValido) {
    return { error: "El código OTP es incorrecto o ya expiró. Solicita uno nuevo." };
  }

  await marcarCorreoVerificado(email);

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];

  if (user) {
    if (!user.activo) return { error: "Tu cuenta está desactivada." };
    await createSession(user.id);

    try {
      await registrarActividad(user.id, "inicio_sesion_otp", "Inicio de sesión con correo verificado por OTP.");
    } catch (error) {
      console.error("No se pudo registrar la actividad de inicio de sesión OTP:", error);
    }

    if (user.rol === "estudiante") {
      try {
        await notificarDocentesInicioSesion(user.id);
      } catch (error) {
        console.error("No se pudieron notificar los docentes del inicio de sesión OTP:", error);
      }
    }

    redirect("/panel");
  }

  const jar = await cookies();
  jar.set("google_verified_email", email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
    secure: process.env.NODE_ENV === "production",
  });

  const params = new URLSearchParams({
    googleEmail: email,
    googleVerified: "1",
    googleMode: "1",
  });
  if (nombre) params.set("googleName", nombre);
  redirect(`/registro?${params.toString()}`);
}

export async function googlePreviewAction(formData: FormData) {
  const email = valor(formData, "email").toLowerCase();
  const nombre = valor(formData, "nombre");

  if (!email || !esCorreoInstitucional(email)) {
    redirect("/google?error=correo");
  }

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];

  if (user) {
    if (!user.activo) redirect("/login?google=inactivo");
    await createSession(user.id);

    try {
      await registrarActividad(
        user.id,
        "inicio_sesion_google_preview",
        "Acceso mediante selector Google de vista previa.",
      );
    } catch (error) {
      console.error("No se pudo registrar la actividad de inicio Google:", error);
    }

    if (user.rol === "estudiante") {
      try {
        await notificarDocentesInicioSesion(user.id);
      } catch (error) {
        console.error("No se pudieron notificar los docentes del inicio Google:", error);
      }
    }

    redirect("/panel");
  }

  const jar = await cookies();
  jar.set("google_verified_email", email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 20 * 60,
    secure: process.env.NODE_ENV === "production",
  });

  const params = new URLSearchParams({
    googleEmail: email,
    googleVerified: "1",
    googleMode: "1",
  });
  if (nombre) params.set("googleName", nombre);
  redirect(`/registro?${params.toString()}`);
}

function esClientIdGoogle(clientId: string) {
  return /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(clientId);
}

export async function guardarGoogleOAuthAction(formData: FormData) {
  const clientId = valor(formData, "googleClientId");
  const clientSecret = valor(formData, "googleClientSecret");
  if (!esClientIdGoogle(clientId) || clientSecret.length < 12) {
    redirect("/google?error=config");
  }

  const existentes = await db.select({ id: platformSettings.id }).from(platformSettings).limit(1);
  if (existentes[0]) {
    await db
      .update(platformSettings)
      .set({ googleClientId: clientId, googleClientSecret: clientSecret, updatedAt: new Date() })
      .where(eq(platformSettings.id, existentes[0].id));
  } else {
    await db.insert(platformSettings).values({ googleClientId: clientId, googleClientSecret: clientSecret });
  }

  redirect("/google?listo=1");
}

export async function borrarGoogleOAuthAction() {
  await db.delete(platformSettings);
  redirect("/google?reset=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
