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

type DemoStore = {
  users: DemoUser[];
  studentProfiles: DemoProfileStudent[];
  teacherProfiles: DemoProfileTeacher[];
  nextId: number;
};

const STORE_PATH = join(tmpdir(), "cbtis270_demo_store.json");

function loadStore(): DemoStore {
  try {
    if (existsSync(STORE_PATH)) {
      const raw = readFileSync(STORE_PATH, "utf8");
      const parsed = JSON.parse(raw) as DemoStore;
      if (parsed.users && Array.isArray(parsed.users)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[demo-store] Error cargando store:", (e as Error).message);
  }
  return { users: [], studentProfiles: [], teacherProfiles: [], nextId: 1 };
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
  globalForDemo.__cbtisDemoStore = { users: [], studentProfiles: [], teacherProfiles: [], nextId: 1 };
  persist();
}

// Para debug
export function demoStorePath() {
  return STORE_PATH;
}
