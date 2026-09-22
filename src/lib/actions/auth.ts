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
import {
  demoFindUserByEmail,
  demoCreateUser,
  demoCreateStudentProfile,
  demoCreateTeacherProfile,
  demoFindUserById,
  demoSaveOtp,
  demoVerifyOtp,
} from "@/lib/demo-store";

export type ActionState = { error?: string; ok?: string };

function buildPanelRedirect(sess?: { token?: string; hint?: string } | null) {
  if (!sess?.token) return "/panel";
  const p = new URLSearchParams();
  p.set("session_token", sess.token);
  if (sess.hint) p.set("session_hint", sess.hint);
  return `/panel?${p.toString()}`;
}

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
  const emailLower = email.toLowerCase().trim();
  const codigoTrim = codigo.trim();
  
  console.log(`[verificarOtp] Iniciando verificación: email=${emailLower} codigo=${codigoTrim}`);

  // 1. Intentar DB
  try {
    await asegurarEsquemaCore();
    const rows = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, emailLower),
          eq(otpCodes.code, codigoTrim),
          eq(otpCodes.used, false),
          gt(otpCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    const otp = rows[0];
    if (otp) {
      console.log(`[verificarOtp] Encontrado en DB: ${otp.email} ${otp.code}`);
      try {
        await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));
      } catch {}
      return true;
    }
    console.log(`[verificarOtp] No encontrado en DB, probando fallbacks`);
  } catch (error) {
    console.warn("[verificarOtp] DB falló, usando fallbacks:", (error as Error).message?.slice(0, 200));
  }

  // 2. Intentar demo store (más confiable que cookies)
  try {
    const demoOk = demoVerifyOtp(emailLower, codigoTrim);
    if (demoOk) {
      console.log(`[verificarOtp] Verificado via demo-store: ${emailLower}`);
      // También limpiar cookie fallback si existe
      try {
        const jar = await cookies();
        jar.delete("otp_fallback");
        jar.delete("otp_fallback_client");
      } catch {}
      return true;
    }
  } catch (e) {
    console.warn("[verificarOtp] demo store falló:", (e as Error).message);
  }

  // 3. Fallback: cookie
  try {
    const jar = await cookies();
    // Intentar ambas cookies
    let fallback = jar.get("otp_fallback")?.value ?? jar.get("otp_fallback_client")?.value ?? "";
    console.log(`[verificarOtp] Cookie raw: ${fallback.slice(0, 100)}`);
    
    if (fallback) {
      // Decodificar si está URL-encoded
      try {
        const decoded = decodeURIComponent(fallback);
        if (decoded !== fallback) {
          console.log(`[verificarOtp] Cookie decodificada: ${decoded.slice(0, 100)}`);
          fallback = decoded;
        }
      } catch {
        // Intentar decodificar solo si parece encoded
        if (fallback.includes("%")) {
          try {
            fallback = decodeURIComponent(fallback);
          } catch {}
        }
      }
      
      const parts = fallback.split("|");
      console.log(`[verificarOtp] Cookie parts:`, parts);
      if (parts.length >= 3) {
        const [savedEmail, savedCode, expiresRaw] = parts;
        const expires = Number(expiresRaw);
        console.log(`[verificarOtp] Comparando: savedEmail=${savedEmail} savedCode=${savedCode} expires=${expires} now=${Date.now()}`);
        if (
          savedEmail?.toLowerCase().trim() === emailLower &&
          savedCode?.trim() === codigoTrim &&
          Number.isFinite(expires) &&
          expires > Date.now()
        ) {
          console.log(`[verificarOtp] Verificado via cookie: ${emailLower}`);
          try {
            jar.delete("otp_fallback");
            jar.delete("otp_fallback_client");
          } catch {}
          // También marcar como usado en demo store si existe
          try {
            demoVerifyOtp(emailLower, codigoTrim);
          } catch {}
          return true;
        }
      }
    }
  } catch (e) {
    console.warn("[verificarOtp] Error leyendo cookies:", (e as Error).message);
  }

  console.log(`[verificarOtp] Falló verificación para ${emailLower} código ${codigoTrim}`);
  return false;
}

async function marcarCorreoVerificado(email: string) {
  const jar = await cookies();
  jar.set("otp_verified_email", email.toLowerCase(), {
    httpOnly: true,
    sameSite: "none",
    path: "/",
    maxAge: 30 * 60,
    secure: true,
      // @ts-ignore
      partitioned: true as any,
  });
  console.log(`[auth] Correo marcado verificado: ${email}`);
}

async function correoEstaVerificado(email: string) {
  const jar = await cookies();
  const a = jar.get("otp_verified_email")?.value?.toLowerCase();
  const b = jar.get("google_verified_email")?.value?.toLowerCase();
  const isVerified = a === email.toLowerCase() || b === email.toLowerCase();
  console.log(`[auth] correoEstaVerificado ${email}: ${isVerified} (otp=${a} google=${b})`);
  return isVerified;
}

export async function solicitarOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await asegurarEsquemaCore();
  } catch {}
  const email = valor(formData, "email").toLowerCase();
  if (!email || !email.includes("@")) return { error: "Escribe un correo válido." };
  if (!esCorreoInstitucional(email)) {
    return { error: "Escribe un correo válido para recibir tu código OTP." };
  }

  const codigo = generarOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  
  try {
    demoSaveOtp(email, codigo, expiresAt);
  } catch {}

  try {
    await db.insert(otpCodes).values({
      email,
      code: codigo,
      purpose: "registro",
      expiresAt: new Date(expiresAt),
    });
  } catch {
    // Continuar en modo demo
  }

  // Guardar fallback siempre
  try {
    const jar = await cookies();
    jar.set("otp_fallback", `${email}|${codigo}|${expiresAt}`, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      // @ts-ignore
      partitioned: true as any,
      path: "/",
      maxAge: 10 * 60,
    });
    jar.set("otp_fallback_client", `${email}|${codigo}|${expiresAt}`, {
      httpOnly: false,
      sameSite: "none",
      secure: true,
      // @ts-ignore
      partitioned: true as any,
      path: "/",
      maxAge: 10 * 60,
    });
  } catch {}

  const envio = await enviarOtpReal({
    email,
    codigo,
    origin: "https://cbtis270.edu.mx",
  });
  if (!envio.sent) {
    // En modo demo, mostrar código directamente como ok
    if (envio.modo === "demo") {
      return { ok: `Modo demo: tu código es ${codigo}. Úsalo para continuar.` };
    }
    return { error: envio.message };
  }
  return { ok: envio.message };
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await asegurarEsquemaCore();
  } catch {}

  const email = valor(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Escribe tu correo y contraseña." };
  }

  // Intentar DB primero
  let user: any = null;
  let isDemoUser = false;

  try {
    const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
    user = found[0] ?? null;
  } catch (error) {
    console.warn("[login] DB falló, intentando demo store:", (error as Error).message?.slice(0, 150));
    const demo = demoFindUserByEmail(email);
    if (demo) {
      user = {
        id: demo.id,
        nombre: demo.nombre,
        email: demo.email,
        passwordHash: demo.passwordHash,
        rol: demo.rol,
        matricula: demo.matricula,
        especialidad: demo.especialidad,
        semestre: demo.semestre,
        turno: demo.turno,
        activo: demo.activo,
        emailVerificado: demo.emailVerificado,
      };
      isDemoUser = true;
    }
  }

  // Si no se encontró en DB, intentar demo store
  if (!user) {
    const demo = demoFindUserByEmail(email);
    if (demo) {
      user = {
        id: demo.id,
        nombre: demo.nombre,
        email: demo.email,
        passwordHash: demo.passwordHash,
        rol: demo.rol,
        matricula: demo.matricula,
        especialidad: demo.especialidad,
        semestre: demo.semestre,
        turno: demo.turno,
        activo: demo.activo,
        emailVerificado: demo.emailVerificado,
      };
      isDemoUser = true;
    }
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Credenciales incorrectas. Verifica tus datos." };
  }
  if (!user.activo) {
    return { error: "Tu cuenta está desactivada. Acude a Jefatura de Logística." };
  }

  const sess = await createSession(user.id, user);

  // Notificaciones no bloqueantes
  try {
    await registrarActividad(user.id, "inicio_sesion", "Acceso correcto a la plataforma.");
  } catch (error) {
    console.warn("No se pudo registrar actividad:", (error as Error).message?.slice(0, 150));
  }

  if (user.rol === "estudiante" && !isDemoUser) {
    try {
      await notificarDocentesInicioSesion(user.id);
    } catch (error) {
      console.warn("No se pudieron notificar docentes:", (error as Error).message?.slice(0, 150));
    }
  }

  // Redirigir con token en URL como fallback para iframe con bloqueo 3rd party
  const params = new URLSearchParams();
  if (sess?.token) params.set("session_token", sess.token);
  if (sess?.hint) params.set("session_hint", sess.hint);
  const dest = params.toString() ? `/panel?${params.toString()}` : "/panel";
  redirect(dest);
}

export async function registroAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await asegurarEsquemaCore();
  } catch {}

  const tipoCuenta = valor(formData, "tipoCuenta") || "estudiante";
  const nombre = valor(formData, "nombre");
  const email = valor(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const otp = valor(formData, "otp");
  const turno = valor(formData, "turno") || "Matutino";
  const semestre = numero(formData, "semestre", tipoCuenta === "docente" ? 2 : 2);
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

  // Verificar si ya existe (DB + demo)
  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return { error: "Ese correo ya tiene cuenta. Inicia sesión con tu contraseña o con OTP." };
    }
  } catch {
    const demoExisting = demoFindUserByEmail(email);
    if (demoExisting) {
      return { error: "Ese correo ya tiene cuenta. Inicia sesión con tu contraseña o con OTP." };
    }
  }

  if (!verificado) {
    if (otp.length !== 6) return { error: "Primero verifica tu correo con el código OTP de 6 dígitos." };
    const otpValido = await verificarOtp(email, otp);
    if (!otpValido) {
      return { error: `El código OTP ${otp} es incorrecto para ${email}, ya fue usado o expiró. Solicita uno nuevo. Revisa que estés usando el último código generado.` };
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
  let createdUser: any = null;
  let usedDemo = false;

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
    createdUser = {
      id: userId,
      nombre,
      email,
      rol: tipoCuenta,
      matricula: tipoCuenta === "estudiante" ? matriculaAlumno : null,
      especialidad: modulo,
      semestre,
      turno,
    };

    if (tipoCuenta === "estudiante") {
      const tutorDocenteId = numero(formData, "tutorDocenteId", null);
      const tutorDocenteNombre = valor(formData, "tutorDocenteNombre");

      try {
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
      } catch (e) {
        console.warn("No se pudo crear perfil estudiante:", (e as Error).message?.slice(0, 150));
      }

      try {
        await notificarDocentesRegistroAlumno({
          alumnoId: userId,
          nombre,
          numeroControl: matriculaAlumno,
          turno,
          semestre,
          grupo,
          tutorDocenteId,
        });
      } catch {}

      try {
        await crearNotificacion(
          userId,
          "Registro verificado",
          "Tu cuenta quedó verificada y guardada. Ya puedes acceder al panel de Logística.",
          "bienvenida",
        );
      } catch {}
    } else {
      const moduloNumero = numero(formData, "moduloNumero", null);
      const submoduloNumero = numero(formData, "submoduloNumero", null);
      const moduloNombre = valor(formData, "moduloNombre");
      const submoduloNombre = valor(formData, "submoduloNombre");

      const gruposSel = formData.getAll("gruposResponsables").map(String).filter(Boolean);
      const turnosSel = formData.getAll("turnosResponsables").map(String).filter(Boolean);
      const gruposFinal = gruposSel.length > 0 ? gruposSel : [grupo];
      const turnosFinal = turnosSel.length > 0 ? turnosSel : [turno];

      try {
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
      } catch (e) {
        console.warn("No se pudo crear perfil docente:", (e as Error).message?.slice(0, 150));
      }

      try {
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
      } catch {}
      try {
        revalidatePath("/registro");
        revalidatePath("/api/docentes");
      } catch {}
    }
  } catch (err: any) {
    console.warn("Error en registro DB, intentando modo demo:", err?.message?.slice(0, 500));
    console.warn("Error cause:", (err?.cause as any)?.message?.slice(0, 300) ?? "sin cause");
    console.warn("Error stack:", (err?.stack as string)?.slice(0, 500) ?? "");

    // Si falla DB, intentar modo demo - SIEMPRE intentar demo si hay error de conexión
    const demoExisting = demoFindUserByEmail(email);
    if (demoExisting) {
      return { error: "Esta cuenta de correo ya está registrada." };
    }

    // Detectar cualquier error de DB para fallback a demo
    const errMsg = String(err?.message || "").toLowerCase();
    const causeMsg = String((err?.cause as any)?.message || "").toLowerCase();
    const isDbError = 
      errMsg.includes("users_email_unique") || 
      errMsg.includes("econnrefused") || 
      errMsg.includes("connect") || 
      errMsg.includes("timeout") ||
      errMsg.includes("failed query") ||
      errMsg.includes("database") ||
      causeMsg.includes("econnrefused") ||
      causeMsg.includes("connect") ||
      causeMsg.includes("timeout");

    if (isDbError || true) { // Siempre intentar demo como fallback
      try {
        const demoUser = demoCreateUser({
          nombre,
          email,
          passwordHash: hashPassword(password),
          rol: tipoCuenta as any,
          matricula: tipoCuenta === "estudiante" ? matriculaAlumno : null,
          especialidad: modulo,
          semestre,
          turno,
        });

        userId = demoUser.id;
        usedDemo = true;
        createdUser = {
          id: demoUser.id,
          nombre: demoUser.nombre,
          email: demoUser.email,
          rol: demoUser.rol,
          matricula: demoUser.matricula,
          especialidad: demoUser.especialidad,
          semestre: demoUser.semestre,
          turno: demoUser.turno,
        };

        if (tipoCuenta === "estudiante") {
          demoCreateStudentProfile({
            userId: demoUser.id,
            numeroControl: matriculaAlumno,
            grupo,
            tutorDocenteId: numero(formData, "tutorDocenteId", null),
          });
        } else {
          const moduloNumero = numero(formData, "moduloNumero", null);
          const submoduloNumero = numero(formData, "submoduloNumero", null);
          const gruposSel = formData.getAll("gruposResponsables").map(String).filter(Boolean);
          const turnosSel = formData.getAll("turnosResponsables").map(String).filter(Boolean);
          demoCreateTeacherProfile({
            userId: demoUser.id,
            semestreResponsable: semestre,
            grupoResponsable: gruposSel.length === 1 ? gruposSel[0] : "Todos",
            turnoResponsable: turnosSel[0] || turno,
            gruposResponsables: gruposSel.length > 0 ? gruposSel.join(",") : grupo,
            turnosResponsables: turnosSel.length > 0 ? turnosSel.join(",") : turno,
            moduloNumero,
            submoduloNumero,
          });
        }

        jar.delete("google_verified_email");
        jar.delete("otp_verified_email");
        const sessDemo = await createSession(userId, createdUser);
        redirect(buildPanelRedirect(sessDemo));
      } catch (demoErr: any) {
        // Si es redirect de Next.js, re-lanzar para que funcione
        if (String(demoErr?.message || "").includes("NEXT_REDIRECT") || String(demoErr?.digest || "").includes("NEXT_REDIRECT")) {
          throw demoErr;
        }
        console.error("Error en registro demo:", demoErr);
        console.error("demoErr stack:", demoErr?.stack?.slice(0, 500));
        let msg = "No se pudo guardar la cuenta. Verifica que los datos sean correctos.";
        if (String(demoErr?.message || "").includes("users_email_unique")) {
          msg = "Esta cuenta de correo ya está registrada.";
        }
        return { error: msg };
      }
    }

    let msg = "No se pudo guardar la cuenta. Verifica que los datos sean correctos.";
    if (String(err?.message || "").includes("users_email_unique")) {
      msg = "Esta cuenta de correo ya está registrada.";
    } else if (String(err?.message || "").includes("unique")) {
      msg = "Esta matrícula o número de control ya está registrada por otro alumno.";
    }
    return { error: msg };
  }

  let finalSess: any = null;
  try {
    jar.delete("google_verified_email");
    jar.delete("otp_verified_email");
    finalSess = await createSession(userId, createdUser);
  } catch (e) {
    console.warn("Error creando sesión post-registro:", (e as Error).message?.slice(0, 150));
    // Intentar de nuevo con demo user si falló
    if (!usedDemo) {
      const demoUser = demoFindUserByEmail(email);
      if (!demoUser) {
        try {
          const newDemo = demoCreateUser({
            nombre,
            email,
            passwordHash: hashPassword(password),
            rol: tipoCuenta as any,
            matricula: tipoCuenta === "estudiante" ? matriculaAlumno : null,
            especialidad: modulo,
            semestre,
            turno,
          });
          await createSession(newDemo.id, {
            id: newDemo.id,
            nombre: newDemo.nombre,
            email: newDemo.email,
            rol: newDemo.rol,
            matricula: newDemo.matricula,
            especialidad: newDemo.especialidad,
            semestre: newDemo.semestre,
            turno: newDemo.turno,
          });
        } catch {}
      }
    }
  }

  redirect(buildPanelRedirect(finalSess));
}

export async function continuarConGoogleCorreoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await asegurarEsquemaCore();
  } catch {}

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
    return { error: `El código OTP ${otp} es incorrecto o ya expiró para ${email}. Solicita uno nuevo.` };
  }

  await marcarCorreoVerificado(email);

  let user: any = null;
  try {
    const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
    user = found[0] ?? null;
  } catch {
    const demo = demoFindUserByEmail(email);
    if (demo) {
      user = { id: demo.id, activo: demo.activo, rol: demo.rol, nombre: demo.nombre, email: demo.email };
    }
  }

  if (user) {
    if (!user.activo) return { error: "Tu cuenta está desactivada." };
    const sessOtp = await createSession(user.id, user);

    try {
      await registrarActividad(user.id, "inicio_sesion_otp", "Inicio de sesión con correo verificado por OTP.");
    } catch {}

    if (user.rol === "estudiante") {
      try {
        await notificarDocentesInicioSesion(user.id);
      } catch {}
    }

    redirect(buildPanelRedirect(sessOtp));
  }

  const jar = await cookies();
  jar.set("google_verified_email", email, {
    httpOnly: true,
    sameSite: "none",
    path: "/",
    maxAge: 30 * 60,
    secure: true,
      // @ts-ignore
      partitioned: true as any,
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
  try {
    await asegurarEsquemaCore();
  } catch {}

  const email = valor(formData, "email").toLowerCase();
  const nombre = valor(formData, "nombre");

  if (!email || !esCorreoInstitucional(email)) {
    redirect("/google?error=correo");
  }

  let user: any = null;
  try {
    const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
    user = found[0] ?? null;
  } catch {
    const demo = demoFindUserByEmail(email);
    if (demo) user = { id: demo.id, activo: demo.activo, rol: demo.rol };
  }

  if (user) {
    if (!user.activo) redirect("/login?google=inactivo");
    const sessPreview = await createSession(user.id, user);

    try {
      await registrarActividad(
        user.id,
        "inicio_sesion_google_preview",
        "Acceso mediante selector Google de vista previa.",
      );
    } catch {}

    if (user.rol === "estudiante") {
      try {
        await notificarDocentesInicioSesion(user.id);
      } catch {}
    }

    redirect(buildPanelRedirect(sessPreview));
  }

  const jar = await cookies();
  jar.set("google_verified_email", email, {
    httpOnly: true,
    sameSite: "none",
    path: "/",
    maxAge: 20 * 60,
    secure: true,
      // @ts-ignore
      partitioned: true as any,
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

  try {
    const existentes = await db.select({ id: platformSettings.id }).from(platformSettings).limit(1);
    if (existentes[0]) {
      await db
        .update(platformSettings)
        .set({ googleClientId: clientId, googleClientSecret: clientSecret, updatedAt: new Date() })
        .where(eq(platformSettings.id, existentes[0].id));
    } else {
      await db.insert(platformSettings).values({ googleClientId: clientId, googleClientSecret: clientSecret });
    }
  } catch (e) {
    console.warn("No se pudo guardar OAuth (sin DB):", (e as Error).message?.slice(0, 150));
    // En modo demo, no se guarda, pero redirigir igual
  }

  redirect("/google?listo=1");
}

export async function borrarGoogleOAuthAction() {
  try {
    await db.delete(platformSettings);
  } catch {}
  redirect("/google?reset=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
