/**
 * Motor de exportación de la plataforma.
 *
 * Cada pantalla que dirección necesita en papel o en hoja de cálculo tiene aquí
 * su armado de tabla: encabezados en español, datos ya filtrados por rol y una
 * nota al pie con la fuente. El formato final (XLSX con exceljs o CSV con BOM)
 * se resuelve en `/api/exportar/[tipo]`.
 *
 * Reglas:
 *  - el estudiante no exporta nada;
 *  - el docente sólo exporta sus aulas y sus alumnos;
 *  - la bitácora y el padrón completo de usuarios son exclusivos de admin.
 */

import { alias } from "drizzle-orm/pg-core";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendances,
  courses,
  enrollments,
  studentProfiles,
  users,
} from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { alumnosDelAula, concentradoCalificaciones } from "@/lib/academico/aula";
import { analiticaDeCuestionarios, intentosParaAnalitica } from "@/lib/academico/analitica";
import { embarquesDelDocente } from "@/lib/academico/rastreo";
import { consultarBitacora, etiquetaAccion } from "@/lib/bitacora";
import { practicasAlmacen } from "@/lib/consultas";
import { demoListUsers } from "@/lib/demo-store";
import { NOMBRE_MODULO } from "@/lib/formatos/catalogo";

export const TIPOS_EXPORTACION = [
  "calificaciones",
  "asistencias",
  "alumnos",
  "usuarios",
  "analitica",
  "practicas",
  "embarques",
  "bitacora",
] as const;

export type TipoExportacion = (typeof TIPOS_EXPORTACION)[number];

export function esTipoExportacion(valor: string): valor is TipoExportacion {
  return (TIPOS_EXPORTACION as readonly string[]).includes(valor);
}

export type TablaExportable = {
  titulo: string;
  hoja: string;
  encabezados: string[];
  filas: Array<Array<string | number | null>>;
  nota?: string;
};

export type ResultadoExportacion =
  | { ok: true; tabla: TablaExportable }
  | { ok: false; status: number; error: string };

const SIN_PERMISO: ResultadoExportacion = {
  ok: false,
  status: 403,
  error: "Tu rol no tiene permiso para esta exportación.",
};

function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor);
}

async function cursoPermitido(user: SessionUser, courseId: number) {
  if (!Number.isFinite(courseId)) return null;
  try {
    const [curso] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!curso) return null;
    if (user.rol === "admin") return curso;
    if (user.rol === "docente" && curso.docenteId === user.id) return curso;
    return null;
  } catch {
    return null;
  }
}

function nombreArchivoBase(tipo: TipoExportacion) {
  return `CBTIS270-${tipo}`;
}

/* ------------------------------ CALIFICACIONES ------------------------------ */

async function exportarCalificaciones(user: SessionUser, params: URLSearchParams): Promise<ResultadoExportacion> {
  const courseId = Number(params.get("aula"));
  const curso = await cursoPermitido(user, courseId);
  if (!curso) return { ok: false, status: 404, error: "Aula no encontrada o sin permiso." };

  const { alumnos, actividades, notas } = await concentradoCalificaciones(curso.id);
  const encabezados = [
    "#",
    "Alumno",
    "Matrícula",
    ...actividades.map((a) => `P${a.parcial} · ${a.titulo}`),
    "Promedio",
  ];

  const filas = alumnos.map((alumno, indice) => {
    const calificaciones = actividades.map((a) => notas.get(`${alumno.id}|${a.id}`) ?? null);
    const validas = calificaciones.filter((c): c is number => typeof c === "number");
    const promedio =
      validas.length === 0 ? null : Math.round(validas.reduce((a, b) => a + b, 0) / validas.length);
    return [
      indice + 1,
      alumno.nombre,
      alumno.matricula ?? "",
      ...calificaciones,
      promedio,
    ];
  });

  return {
    ok: true,
    tabla: {
      titulo: `Concentrado de calificaciones · ${curso.nombre}`,
      hoja: "Calificaciones",
      encabezados,
      filas,
      nota: `Aula ${curso.clave} · ${curso.semestre}° ${curso.grupo} · ${curso.turno}. Generado el ${new Date().toLocaleString("es-MX")}.`,
    },
  };
}

/* -------------------------------- ASISTENCIAS -------------------------------- */

async function exportarAsistencias(user: SessionUser, params: URLSearchParams): Promise<ResultadoExportacion> {
  const courseId = Number(params.get("aula"));
  const curso = await cursoPermitido(user, courseId);
  if (!curso) return { ok: false, status: 404, error: "Aula no encontrada o sin permiso." };

  const filasCrudas = await db
    .select({
      alumno: users.nombre,
      matricula: users.matricula,
      presentes: sql<number>`count(*) filter (where ${attendances.estado} = 'presente')::int`,
      retardos: sql<number>`count(*) filter (where ${attendances.estado} = 'retardo')::int`,
      faltas: sql<number>`count(*) filter (where ${attendances.estado} = 'falta')::int`,
      justificados: sql<number>`count(*) filter (where ${attendances.estado} = 'justificado')::int`,
    })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .leftJoin(
      attendances,
      and(eq(attendances.studentId, enrollments.studentId), eq(attendances.courseId, curso.id)),
    )
    .where(eq(enrollments.courseId, curso.id))
    .groupBy(users.id, users.nombre, users.matricula)
    .orderBy(asc(users.nombre));

  const filas = filasCrudas.map((fila, indice) => {
    const total = fila.presentes + fila.retardos + fila.faltas + fila.justificados;
    // Criterio del plantel: retardo y falta justificada cuentan como asistencia.
    const asistidas = fila.presentes + fila.retardos + fila.justificados;
    const porcentaje = total === 0 ? null : Math.round((asistidas / total) * 100);
    return [
      indice + 1,
      fila.alumno,
      fila.matricula ?? "",
      fila.presentes,
      fila.retardos,
      fila.faltas,
      fila.justificados,
      total,
      porcentaje,
    ];
  });

  return {
    ok: true,
    tabla: {
      titulo: `Asistencia acumulada · ${curso.nombre}`,
      hoja: "Asistencias",
      encabezados: [
        "#",
        "Alumno",
        "Matrícula",
        "Presentes",
        "Retardos",
        "Faltas",
        "Justificados",
        "Registros",
        "% Asistencia",
      ],
      filas,
      nota: "El retardo y la falta justificada cuentan como asistencia; dos retardos equivalen a una falta. Acumulado de todo el semestre.",
    },
  };
}

/* ---------------------------------- ALUMNOS ---------------------------------- */

async function exportarAlumnos(user: SessionUser, params: URLSearchParams): Promise<ResultadoExportacion> {
  const courseId = Number(params.get("aula"));

  // Con aula: la lista del grupo, tal como la ve el docente.
  if (Number.isFinite(courseId) && courseId > 0) {
    const curso = await cursoPermitido(user, courseId);
    if (!curso) return { ok: false, status: 404, error: "Aula no encontrada o sin permiso." };
    const alumnos = await alumnosDelAula(curso.id);
    return {
      ok: true,
      tabla: {
        titulo: `Lista del grupo · ${curso.nombre}`,
        hoja: "Alumnos",
        encabezados: ["#", "Alumno", "Matrícula", "Correo", "Grupo", "Semestre"],
        filas: alumnos.map((a, i) => [i + 1, a.nombre, a.matricula ?? "", a.email, a.grupo ?? "", a.semestre ?? ""]),
        nota: `Aula ${curso.clave} · ${curso.semestre}° ${curso.grupo} · ${curso.turno}.`,
      },
    };
  }

  if (user.rol === "estudiante") return SIN_PERMISO;

  const tutor = alias(users, "tutor");
  const filtroDocente =
    user.rol === "docente"
      ? inArray(
          users.id,
          db
            .select({ id: enrollments.studentId })
            .from(enrollments)
            .innerJoin(courses, eq(courses.id, enrollments.courseId))
            .where(eq(courses.docenteId, user.id)),
        )
      : undefined;

  type FilaAlumno = {
    nombre: string;
    matricula: string | null;
    email: string;
    semestre: number | null;
    turno: string | null;
    grupo: string | null;
    tutor: string | null;
    telefono: string | null;
    activo: boolean;
  };

  let filasCrudas: FilaAlumno[];
  try {
    filasCrudas = await db
      .select({
        nombre: users.nombre,
        matricula: users.matricula,
        email: users.email,
        semestre: users.semestre,
        turno: users.turno,
        grupo: studentProfiles.grupo,
        tutor: tutor.nombre,
        telefono: studentProfiles.telefono,
        activo: users.activo,
      })
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .leftJoin(tutor, eq(tutor.id, studentProfiles.tutorDocenteId))
      .where(and(eq(users.rol, "estudiante"), filtroDocente))
      .orderBy(asc(users.nombre));
  } catch {
    // Preview sin base de datos: se exporta el padrón del almacén demo.
    filasCrudas = demoListUsers()
      .filter((u) => u.rol === "estudiante")
      .map((u) => ({
        nombre: u.nombre,
        matricula: u.matricula ?? null,
        email: u.email,
        semestre: u.semestre ?? null,
        turno: u.turno ?? null,
        grupo: null,
        tutor: null,
        telefono: null,
        activo: u.activo,
      }));
  }

  return {
    ok: true,
    tabla: {
      titulo: user.rol === "admin" ? "Padrón de alumnos del plantel" : "Alumnos de mis aulas",
      hoja: "Alumnos",
      encabezados: ["#", "Alumno", "Matrícula", "Correo", "Semestre", "Grupo", "Turno", "Docente tutor", "Teléfono", "Activo"],
      filas: filasCrudas.map((f, i) => [
        i + 1,
        f.nombre,
        f.matricula ?? "",
        f.email,
        f.semestre ?? "",
        f.grupo ?? "",
        f.turno ?? "",
        f.tutor ?? "",
        f.telefono ?? "",
        f.activo ? "Sí" : "No",
      ]),
      nota: user.rol === "admin" ? "Incluye cuentas dadas de baja." : "Sólo alumnos inscritos en tus aulas.",
    },
  };
}

/* --------------------------------- USUARIOS --------------------------------- */

async function exportarUsuarios(user: SessionUser): Promise<ResultadoExportacion> {
  if (user.rol !== "admin") return SIN_PERMISO;

  type FilaUsuario = {
    nombre: string;
    email: string;
    rol: string;
    matricula: string | null;
    semestre: number | null;
    turno: string | null;
    activo: boolean;
    verificado: boolean;
    creado: Date;
  };

  let filasCrudas: FilaUsuario[];
  try {
    filasCrudas = await db
      .select({
        nombre: users.nombre,
        email: users.email,
        rol: users.rol,
        matricula: users.matricula,
        semestre: users.semestre,
        turno: users.turno,
        activo: users.activo,
        verificado: users.emailVerificado,
        creado: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.rol), asc(users.nombre));
  } catch {
    filasCrudas = demoListUsers().map((u) => ({
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      matricula: u.matricula ?? null,
      semestre: u.semestre ?? null,
      turno: u.turno ?? null,
      activo: u.activo,
      verificado: u.emailVerificado,
      creado: new Date(u.createdAt),
    }));
  }

  return {
    ok: true,
    tabla: {
      titulo: "Padrón de usuarios de la plataforma",
      hoja: "Usuarios",
      encabezados: ["#", "Nombre", "Correo", "Rol", "Matrícula", "Semestre", "Turno", "Activo", "Correo verificado", "Alta"],
      filas: filasCrudas.map((u, i) => [
        i + 1,
        u.nombre,
        u.email,
        u.rol,
        u.matricula ?? "",
        u.semestre ?? "",
        u.turno ?? "",
        u.activo ? "Sí" : "No",
        u.verificado ? "Sí" : "No",
        new Date(u.creado).toLocaleDateString("es-MX"),
      ]),
      nota: "Datos personales: manejar conforme al aviso de privacidad del plantel.",
    },
  };
}

/* --------------------------------- ANALÍTICA -------------------------------- */

async function exportarAnalitica(user: SessionUser, params: URLSearchParams): Promise<ResultadoExportacion> {
  if (user.rol === "estudiante") return SIN_PERMISO;

  const clave = params.get("clave")?.trim();
  const intentos = await intentosParaAnalitica(user);
  const data = await analiticaDeCuestionarios(intentos, clave ? [clave] : undefined);

  const filas: Array<Array<string | number | null>> = [];
  let indice = 0;
  for (const cuestionario of data.porCuestionario) {
    for (const reactivo of cuestionario.reactivos) {
      indice += 1;
      filas.push([
        indice,
        cuestionario.clave,
        cuestionario.titulo,
        reactivo.posicion + 1,
        reactivo.extra ? "Propio del docente" : "Catálogo",
        reactivo.enunciado,
        reactivo.intentos,
        reactivo.aciertos,
        reactivo.porcentaje,
        reactivo.distractorTop
          ? `Opción ${String.fromCharCode(65 + reactivo.distractorTop.indice)}: ${reactivo.distractorTop.texto} (${reactivo.distractorTop.veces})`
          : "",
      ]);
    }
  }

  return {
    ok: true,
    tabla: {
      titulo: "Analítica por reactivo · cuestionarios",
      hoja: "Analitica",
      encabezados: [
        "#",
        "Cuestionario",
        "Título",
        "Reactivo",
        "Origen",
        "Enunciado",
        "Intentos",
        "Aciertos",
        "% Acierto",
        "Error más común",
      ],
      filas,
      nota:
        data.global.intentos === 0
          ? "Sin intentos registrados todavía."
          : `${data.global.intentos} intentos de ${data.global.alumnos} alumnos · promedio ${data.global.promedio ?? "—"} · acierto global ${data.global.porcentajeAcierto ?? "—"}%.`,
    },
  };
}

/* --------------------------------- PRÁCTICAS -------------------------------- */

async function exportarPracticas(user: SessionUser): Promise<ResultadoExportacion> {
  if (user.rol === "estudiante") return SIN_PERMISO;

  const practicas = await practicasAlmacen(user.rol === "docente" ? user.id : undefined);
  return {
    ok: true,
    tabla: {
      titulo: "Agenda de prácticas · Almacén Escuela (Edificio C)",
      hoja: "Practicas",
      encabezados: ["#", "Fecha", "Práctica", "Aula", "Docente", "Área", "Equipos", "EPP", "Estado", "Duración (min)", "Cupo"],
      filas: practicas.map((p, i) => [
        i + 1,
        new Date(p.practica.fechaPractica).toLocaleString("es-MX"),
        p.practica.titulo,
        p.curso.nombre,
        p.docente,
        p.practica.areaAlmacen,
        p.practica.equiposUtilizados,
        p.practica.equipoSeguridadObligatorio,
        p.practica.estado,
        p.practica.duracionMinutos,
        p.practica.cupoMaximo,
      ]),
      nota: "EPP obligatorio conforme a NOM-006-STPS-2014.",
    },
  };
}

/* --------------------------------- EMBARQUES -------------------------------- */

async function exportarEmbarques(user: SessionUser): Promise<ResultadoExportacion> {
  if (user.rol === "estudiante") return SIN_PERMISO;

  const embarques = await embarquesDelDocente(user.id, user.rol);
  return {
    ok: true,
    tabla: {
      titulo: "Rastreo GPS de embarques",
      hoja: "Embarques",
      encabezados: [
        "#",
        "Folio",
        "Escenario",
        "Módulo",
        "Origen",
        "Destino",
        "Carga",
        "Unidad",
        "Distancia (km)",
        "Modo",
        "Estado",
        "Avance %",
        "Operador",
        "Creado",
      ],
      filas: embarques.map((e, i) => [
        i + 1,
        e.folio,
        e.titulo,
        NOMBRE_MODULO[e.modulo] ?? `Módulo ${e.modulo}`,
        e.origenNombre,
        e.destinoNombre,
        e.carga ?? "",
        e.unidad ?? "",
        e.distanciaKm,
        e.modo,
        e.estado,
        Math.round((e.progreso ?? 0) * 100),
        e.operadorNombre ?? "",
        new Date(e.createdAt).toLocaleDateString("es-MX"),
      ]),
      nota: "Avance calculado sobre la ruta planeada.",
    },
  };
}

/* --------------------------------- BITÁCORA --------------------------------- */

async function exportarBitacora(user: SessionUser, params: URLSearchParams): Promise<ResultadoExportacion> {
  if (user.rol !== "admin") return SIN_PERMISO;

  const resultado = await consultarBitacora({
    q: params.get("q") ?? undefined,
    accion: params.get("accion") ?? undefined,
    entidad: params.get("entidad") ?? undefined,
    desde: params.get("desde") ?? undefined,
    hasta: params.get("hasta") ?? undefined,
    porPagina: 5000,
    pagina: 1,
  });

  return {
    ok: true,
    tabla: {
      titulo: "Bitácora de auditoría",
      hoja: "Bitacora",
      encabezados: ["#", "Fecha y hora", "Actor", "Acción", "Entidad", "ID", "Detalle"],
      filas: resultado.filas.map((f, i) => [
        i + 1,
        new Date(f.createdAt).toLocaleString("es-MX"),
        f.actor ?? "Sistema",
        etiquetaAccion(f.accion),
        f.entidad ?? "",
        f.entidadId ?? "",
        f.detalle ?? "",
      ]),
      nota: `${resultado.total} registro(s) con los filtros aplicados. Máximo 5000 por archivo.`,
    },
  };
}

/* --------------------------------- FACHADA ---------------------------------- */

export async function construirExportacion(
  tipo: TipoExportacion,
  user: SessionUser,
  params: URLSearchParams,
): Promise<ResultadoExportacion> {
  try {
    switch (tipo) {
      case "calificaciones":
        return await exportarCalificaciones(user, params);
      case "asistencias":
        return await exportarAsistencias(user, params);
      case "alumnos":
        return await exportarAlumnos(user, params);
      case "usuarios":
        return await exportarUsuarios(user);
      case "analitica":
        return await exportarAnalitica(user, params);
      case "practicas":
        return await exportarPracticas(user);
      case "embarques":
        return await exportarEmbarques(user);
      case "bitacora":
        return await exportarBitacora(user, params);
      default:
        return { ok: false, status: 400, error: "Tipo de exportación desconocido." };
    }
  } catch (error) {
    console.warn("[exportar] Falló el armado de la tabla:", (error as Error).message?.slice(0, 200));
    return { ok: false, status: 500, error: "No se pudo generar el archivo." };
  }
}

export function nombreDeArchivo(tipo: TipoExportacion, extension: "xlsx" | "csv", params?: URLSearchParams) {
  const aula = params?.get("aula");
  const sufijo = aula ? `-aula${aula}` : "";
  const ahora = new Date();
  const marca = `${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, "0")}${String(
    ahora.getDate(),
  ).padStart(2, "0")}-${String(ahora.getHours()).padStart(2, "0")}${String(ahora.getMinutes()).padStart(2, "0")}`;
  return `${nombreArchivoBase(tipo)}${sufijo}-${marca}.${extension}`;
}

/* --------------------------------- FORMATOS --------------------------------- */

/** Evita inyección de fórmulas al abrir el CSV en Excel/LibreOffice. */
function celdaCsv(valor: string | number | null): string {
  const valorTexto = texto(valor);
  const seguro = /^[=+\-@\t\r]/.test(valorTexto) ? `'${valorTexto}` : valorTexto;
  if (/[";\n\r]/.test(seguro)) return `"${seguro.replaceAll('"', '""')}"`;
  return seguro;
}

/**
 * CSV con BOM UTF-8 y punto y coma como separador (lo que espera Excel en
 * español). Incluye título, nota y fecha para que el archivo sea autosuficiente.
 */
export function tablaACsv(tabla: TablaExportable): string {
  const lineas: string[] = [];
  lineas.push(celdaCsv(`CBTIS No. 270 · ${tabla.titulo}`));
  lineas.push(celdaCsv(`Generado: ${new Date().toLocaleString("es-MX")}`));
  lineas.push("");
  lineas.push(tabla.encabezados.map(celdaCsv).join(";"));
  for (const fila of tabla.filas) lineas.push(fila.map(celdaCsv).join(";"));
  if (tabla.nota) {
    lineas.push("");
    lineas.push(celdaCsv(tabla.nota));
  }
  return `\uFEFF${lineas.join("\r\n")}`;
}
