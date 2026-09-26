/**
 * Almacenamiento demo en memoria + archivo para cuando no hay DB
 * Permite que login y registro funcionen sin PostgreSQL
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

type DemoUser = {
  id: number;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: "admin" | "docente" | "estudiante";
  matricula?: string | null;
  especialidad?: string | null;
  semestre?: number | null;
  turno?: string | null;
  activo: boolean;
  emailVerificado: boolean;
  createdAt: string;
};

type DemoProfileStudent = {
  userId: number;
  numeroControl: string;
  grupo: string;
  tutorDocenteId?: number | null;
};

type DemoProfileTeacher = {
  userId: number;
  semestreResponsable?: number | null;
  grupoResponsable?: string | null;
  turnoResponsable?: string | null;
  gruposResponsables?: string | null;
  turnosResponsables?: string | null;
  moduloNumero?: number | null;
  submoduloNumero?: number | null;
};

type DemoOtp = {
  email: string;
  code: string;
  expiresAt: number;
  used: boolean;
  createdAt: number;
};

type DemoNotification = {
  id: number;
  userId: number;
  titulo: string;
  contenido: string;
  tipo: string;
  leida: boolean;
  createdAt: string;
};

type DemoMessage = {
  id: number;
  fromUserId: number;
  toUserId: number;
  asunto: string;
  contenido: string;
  leido: boolean;
  createdAt: string;
};

type DemoHabilitacion = {
  codigo: string;
  tipo: string;
  modulo: number;
  semestre: number;
  docenteId: number;
  createdAt: string;
};

type DemoStore = {
  users: DemoUser[];
  studentProfiles: DemoProfileStudent[];
  teacherProfiles: DemoProfileTeacher[];
  otps: DemoOtp[];
  notifications: DemoNotification[];
  messages: DemoMessage[];
  habilitaciones: DemoHabilitacion[];
  nextId: number;
};

const STORE_PATH = join(tmpdir(), "cbtis270_demo_store.json");

function loadStore(): DemoStore {
  try {
    if (existsSync(STORE_PATH)) {
      const raw = readFileSync(STORE_PATH, "utf8");
      const parsed = JSON.parse(raw) as DemoStore;
      if (parsed.users && Array.isArray(parsed.users)) {
        return {
          users: parsed.users,
          studentProfiles: parsed.studentProfiles ?? [],
          teacherProfiles: parsed.teacherProfiles ?? [],
          otps: parsed.otps ?? [],
          notifications: parsed.notifications ?? [],
          messages: parsed.messages ?? [],
          habilitaciones: parsed.habilitaciones ?? [],
          nextId: parsed.nextId ?? 1,
        };
      }
    }
  } catch (e) {
    console.warn("[demo-store] Error cargando store:", (e as Error).message);
  }
  return {
    users: [],
    studentProfiles: [],
    teacherProfiles: [],
    otps: [],
    notifications: [],
    messages: [],
    habilitaciones: [],
    nextId: 1,
  };
}

function saveStore(store: DemoStore) {
  try {
    // Asegurar directorio existe
    try {
      mkdirSync(join(tmpdir()), { recursive: true });
    } catch {}
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
    console.warn("[demo-store] Error guardando store:", (e as Error).message);
  }
}

// Cache en memoria global para no leer disco en cada request
const globalForDemo = globalThis as typeof globalThis & {
  __cbtisDemoStore?: DemoStore;
};

function getStore(): DemoStore {
  if (!globalForDemo.__cbtisDemoStore) {
    globalForDemo.__cbtisDemoStore = loadStore();
  }
  // Asegurar colecciones existen (stores antiguos en disco no las traen)
  if (!globalForDemo.__cbtisDemoStore.otps) {
    globalForDemo.__cbtisDemoStore.otps = [];
  }
  if (!globalForDemo.__cbtisDemoStore.notifications) {
    globalForDemo.__cbtisDemoStore.notifications = [];
  }
  if (!globalForDemo.__cbtisDemoStore.messages) {
    globalForDemo.__cbtisDemoStore.messages = [];
  }
  if (!globalForDemo.__cbtisDemoStore.habilitaciones) {
    globalForDemo.__cbtisDemoStore.habilitaciones = [];
  }
  return globalForDemo.__cbtisDemoStore;
}

function persist() {
  if (globalForDemo.__cbtisDemoStore) {
    saveStore(globalForDemo.__cbtisDemoStore);
  }
}

export function demoFindUserByEmail(email: string): DemoUser | null {
  const store = getStore();
  return store.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function demoFindUserById(id: number): DemoUser | null {
  const store = getStore();
  return store.users.find((u) => u.id === id) ?? null;
}

export function demoGetAllDocentes(): Array<{ id: number; nombre: string; semestre: number | null; grupo: string | null; turno: string | null }> {
  const store = getStore();
  const docentes = store.users.filter((u) => u.rol === "docente" && u.activo);
  return docentes.map((d) => {
    const perfil = store.teacherProfiles.find((p) => p.userId === d.id);
    return {
      id: d.id,
      nombre: d.nombre,
      semestre: perfil?.semestreResponsable ?? d.semestre ?? null,
      grupo: perfil?.gruposResponsables ?? perfil?.grupoResponsable ?? "E",
      turno: perfil?.turnosResponsables ?? perfil?.turnoResponsable ?? "Matutino",
    };
  });
}

export function demoCreateUser(data: {
  nombre: string;
  email: string;
  passwordHash: string;
  rol: "admin" | "docente" | "estudiante";
  matricula?: string | null;
  especialidad?: string | null;
  semestre?: number | null;
  turno?: string | null;
}): DemoUser {
  const store = getStore();
  const existing = store.users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
  if (existing) {
    throw new Error("users_email_unique");
  }

  const user: DemoUser = {
    id: store.nextId++,
    nombre: data.nombre,
    email: data.email.toLowerCase(),
    passwordHash: data.passwordHash,
    rol: data.rol,
    matricula: data.matricula ?? null,
    especialidad: data.especialidad ?? null,
    semestre: data.semestre ?? null,
    turno: data.turno ?? null,
    activo: true,
    emailVerificado: true,
    createdAt: new Date().toISOString(),
  };

  store.users.push(user);
  persist();
  console.log(`[demo-store] Usuario creado: ${user.email} (${user.rol}) id=${user.id}`);
  return user;
}

export function demoCreateStudentProfile(data: DemoProfileStudent) {
  const store = getStore();
  store.studentProfiles = store.studentProfiles.filter((p) => p.userId !== data.userId);
  store.studentProfiles.push(data);
  persist();
}

export function demoCreateTeacherProfile(data: DemoProfileTeacher) {
  const store = getStore();
  store.teacherProfiles = store.teacherProfiles.filter((p) => p.userId !== data.userId);
  store.teacherProfiles.push(data);
  persist();
}

export function demoListUsers(): DemoUser[] {
  return getStore().users;
}

export function demoClearStore() {
  globalForDemo.__cbtisDemoStore = {
    users: [],
    studentProfiles: [],
    teacherProfiles: [],
    otps: [],
    notifications: [],
    messages: [],
    habilitaciones: [],
    nextId: 1,
  };
  persist();
}

// ========== OTP DEMO STORE ==========

export function demoSaveOtp(email: string, code: string, expiresAtMs: number) {
  const store = getStore();
  // Limpiar OTPs expirados del mismo email
  store.otps = store.otps.filter(o => o.email.toLowerCase() !== email.toLowerCase() || o.expiresAt > Date.now());
  store.otps.push({
    email: email.toLowerCase(),
    code,
    expiresAt: expiresAtMs,
    used: false,
    createdAt: Date.now(),
  });
  persist();
  console.log(`[demo-store] OTP guardado: ${email} -> ${code} expira ${new Date(expiresAtMs).toISOString()}`);
}

export function demoVerifyOtp(email: string, code: string): boolean {
  const store = getStore();
  const now = Date.now();
  // Buscar OTP válido más reciente
  const validOtps = store.otps
    .filter(o => 
      o.email.toLowerCase() === email.toLowerCase() && 
      o.code === code && 
      !o.used && 
      o.expiresAt > now
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  console.log(`[demo-store] Verificando OTP: email=${email} code=${code} encontrados=${validOtps.length} totalOtps=${store.otps.length}`);
  if (validOtps.length > 0) {
    validOtps[0].used = true;
    persist();
    console.log(`[demo-store] OTP verificado correctamente: ${email}`);
    return true;
  }
  // Debug: mostrar OTPs del email
  const emailOtps = store.otps.filter(o => o.email.toLowerCase() === email.toLowerCase());
  console.log(`[demo-store] OTPs para ${email}:`, emailOtps.map(o => `${o.code} usado=${o.used} exp=${o.expiresAt > now}`));
  return false;
}

export function demoListOtps() {
  return getStore().otps;
}

// Para debug
export function demoStorePath() {
  return STORE_PATH;
}

/* ---------------------------------------------------------------
 * NOTIFICACIONES (modo demo, sin base de datos)
 * --------------------------------------------------------------- */

export function demoListNotifications(userId: number) {
  const store = getStore();
  return store.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 80)
    .map((n) => ({
      id: n.id,
      userId: n.userId,
      titulo: n.titulo,
      contenido: n.contenido,
      tipo: n.tipo,
      leida: n.leida,
      createdAt: new Date(n.createdAt),
    }));
}

export function demoCreateNotification(data: {
  userId: number;
  titulo: string;
  contenido: string;
  tipo: string;
}) {
  const store = getStore();
  const notificacion: DemoNotification = {
    id: store.nextId++,
    userId: data.userId,
    titulo: data.titulo,
    contenido: data.contenido,
    tipo: data.tipo,
    leida: false,
    createdAt: new Date().toISOString(),
  };
  store.notifications.push(notificacion);
  persist();
  return notificacion;
}

export function demoMarkNotificationRead(id: number, userId: number) {
  const store = getStore();
  const notificacion = store.notifications.find((n) => n.id === id && n.userId === userId);
  if (notificacion) {
    notificacion.leida = true;
    persist();
  }
}

export function demoMarkAllNotificationsRead(userId: number) {
  const store = getStore();
  let cambios = false;
  for (const n of store.notifications) {
    if (n.userId === userId && !n.leida) {
      n.leida = true;
      cambios = true;
    }
  }
  if (cambios) persist();
}

/* ---------------------------------------------------------------
 * MENSAJES INTERNOS (modo demo, sin base de datos)
 * --------------------------------------------------------------- */

function nombreDemo(userId: number) {
  return demoFindUserById(userId)?.nombre ?? "Usuario";
}

function rolDemo(userId: number) {
  return demoFindUserById(userId)?.rol ?? "estudiante";
}

export function demoListMessagesReceived(userId: number) {
  const store = getStore();
  return store.messages
    .filter((m) => m.toUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50)
    .map((m) => ({
      mensaje: {
        id: m.id,
        fromUserId: m.fromUserId,
        toUserId: m.toUserId,
        asunto: m.asunto,
        contenido: m.contenido,
        leido: m.leido,
        createdAt: new Date(m.createdAt),
      },
      de: nombreDemo(m.fromUserId),
      deRol: rolDemo(m.fromUserId),
    }));
}

export function demoListMessagesSent(userId: number) {
  const store = getStore();
  return store.messages
    .filter((m) => m.fromUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30)
    .map((m) => ({
      mensaje: {
        id: m.id,
        fromUserId: m.fromUserId,
        toUserId: m.toUserId,
        asunto: m.asunto,
        contenido: m.contenido,
        leido: m.leido,
        createdAt: new Date(m.createdAt),
      },
      para: nombreDemo(m.toUserId),
      paraRol: rolDemo(m.toUserId),
    }));
}

export function demoCreateMessage(data: {
  fromUserId: number;
  toUserId: number;
  asunto: string;
  contenido: string;
}) {
  const store = getStore();
  const mensaje: DemoMessage = {
    id: store.nextId++,
    fromUserId: data.fromUserId,
    toUserId: data.toUserId,
    asunto: data.asunto,
    contenido: data.contenido,
    leido: false,
    createdAt: new Date().toISOString(),
  };
  store.messages.push(mensaje);
  persist();
  return mensaje;
}

export function demoMarkMessageRead(id: number, userId: number) {
  const store = getStore();
  const mensaje = store.messages.find((m) => m.id === id && m.toUserId === userId);
  if (mensaje) {
    mensaje.leido = true;
    persist();
  }
}

/**
 * Destinatarios disponibles para un usuario en modo demo.
 * Replica las reglas de visibilidad de la versión con base de datos:
 * el docente sólo ve a sus alumnos, el alumno ve docentes y jefatura.
 */
export function demoListarDestinatarios(user: {
  id: number;
  rol: string;
  turno?: string | null;
  semestre?: number | null;
}) {
  const store = getStore();
  const armar = (u: DemoUser) => ({
    usuario: {
      id: u.id,
      nombre: u.nombre,
      rol: u.rol,
      semestre: u.semestre ?? null,
      turno: u.turno ?? null,
    },
    perfilAlumno: store.studentProfiles.find((p) => p.userId === u.id) ?? null,
    perfilDocente: store.teacherProfiles.find((p) => p.userId === u.id) ?? null,
  });

  if (user.rol === "admin") {
    return store.users.filter((u) => u.rol === "estudiante" || u.rol === "docente").map(armar);
  }

  if (user.rol === "docente") {
    const perfil = store.teacherProfiles.find((p) => p.userId === user.id);
    return store.users
      .filter((u) => {
        if (u.rol !== "estudiante") return false;
        if (!perfil) return true;
        if (perfil.turnoResponsable && u.turno !== perfil.turnoResponsable) return false;
        if (perfil.semestreResponsable && u.semestre !== perfil.semestreResponsable) return false;
        if (perfil.grupoResponsable && perfil.grupoResponsable !== "Todos") {
          const alumno = store.studentProfiles.find((p) => p.userId === u.id);
          if (alumno && alumno.grupo !== perfil.grupoResponsable) return false;
        }
        return true;
      })
      .map(armar);
  }

  // Alumno: jefatura y los docentes de su turno/semestre
  return store.users
    .filter((u) => {
      if (u.rol === "admin") return true;
      if (u.rol !== "docente") return false;
      const perfil = store.teacherProfiles.find((p) => p.userId === u.id);
      if (!perfil) return true;
      if (perfil.turnoResponsable && user.turno && perfil.turnoResponsable !== user.turno) return false;
      if (perfil.semestreResponsable && user.semestre && perfil.semestreResponsable !== user.semestre) {
        return false;
      }
      return true;
    })
    .map(armar);
}

/* ---------------------------------------------------------------
 * HABILITACIONES DE FORMATOS (modo demo, sin base de datos)
 * --------------------------------------------------------------- */

export function demoListarHabilitaciones() {
  return getStore().habilitaciones.map((h) => ({
    codigo: h.codigo,
    tipo: h.tipo,
    modulo: h.modulo,
    semestre: h.semestre,
  }));
}

export function demoHabilitarFormato(datos: {
  codigo: string;
  tipo: string;
  modulo: number;
  semestre: number;
  docenteId: number;
}) {
  const store = getStore();
  const yaExiste = store.habilitaciones.some(
    (h) => h.codigo === datos.codigo && h.semestre === datos.semestre,
  );
  if (yaExiste) return;
  store.habilitaciones.push({ ...datos, createdAt: new Date().toISOString() });
  persist();
}

export function demoDeshabilitarFormato(codigo: string, semestre: number) {
  const store = getStore();
  const antes = store.habilitaciones.length;
  store.habilitaciones = store.habilitaciones.filter(
    (h) => !(h.codigo === codigo && h.semestre === semestre),
  );
  if (store.habilitaciones.length !== antes) persist();
}
