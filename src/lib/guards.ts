import { redirect } from "next/navigation";
import { getCurrentUser, type Rol, type SessionUser } from "@/lib/auth";

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Rol[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.rol)) redirect("/panel");
  return user;
}

export const ROL_LABEL: Record<Rol, string> = {
  admin: "Administración",
  docente: "Docente",
  estudiante: "Estudiante",
};

/** Módulos profesionales de la carrera técnica en Logística (DGETI) */
export const ESPECIALIDADES = [
  "Cadena de Suministro",
  "Gestión de Almacenes e Inventarios",
  "Transporte y Distribución",
  "Compras y Abastecimiento",
  "Comercio Exterior y Aduanas",
  "Logística Inversa y Sustentable",
] as const;

/** Módulos formativos por semestre del plan de estudios */
export const MODULOS_CARRERA = [
  {
    modulo: "Módulo I",
    semestre: 2,
    nombre: "Gestiona la adquisición de mercancías y servicios",
    submodulos: ["Introducción a la logística", "Flujo de materiales e información"],
  },
  {
    modulo: "Módulo II",
    semestre: 3,
    nombre: "Organiza el flujo de mercancías en almacén",
    submodulos: ["Recepción y acomodo", "Control de inventarios y conteo cíclico"],
  },
  {
    modulo: "Módulo III",
    semestre: 4,
    nombre: "Gestiona el tráfico de mercancías de importación y exportación",
    submodulos: ["Rutas y modos de transporte", "Abastecimiento y proveedores"],
  },
  {
    modulo: "Módulo IV",
    semestre: 5,
    nombre: "Gestiona la distribución física de mercancías",
    submodulos: ["Aduanas e INCOTERMS", "Logística inversa y KPI"],
  },
  {
    modulo: "Módulo V",
    semestre: 6,
    nombre: "Cotiza costos de la cadena de suministro",
    submodulos: [
      "Tecnologías aplicadas a la cadena de suministro",
      "Proyecto integrador de logística",
    ],
  },
] as const;

export function formatoFecha(date: Date | string | null | undefined) {
  if (!date) return "Sin fecha";
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export function formatoFechaHora(date: Date | string | null | undefined) {
  if (!date) return "Sin fecha";
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function paraInputDateTime(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}
