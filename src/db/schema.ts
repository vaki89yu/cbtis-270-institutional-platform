import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Usuarios de la plataforma: admin | docente | estudiante */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  rol: text("rol").notNull().default("estudiante"),
  matricula: text("matricula"),
  especialidad: text("especialidad"),
  semestre: integer("semestre"),
  turno: text("turno"),
  activo: boolean("activo").notNull().default(true),
  emailVerificado: boolean("email_verificado").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Perfil académico extendido del alumno */
export const studentProfiles = pgTable("student_profiles", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  numeroControl: text("numero_control").notNull(),
  numeroControlEscolar: text("numero_control_escolar"),
  grupo: text("grupo").notNull().default("E"),
  tutorDocenteId: integer("tutor_docente_id").references(() => users.id, { onDelete: "set null" }),
  tutorDocenteNombre: text("tutor_docente_nombre"),
  curp: text("curp"),
  telefono: text("telefono"),
  domicilio: text("domicilio"),
  contactoEmergenciaNombre: text("contacto_emergencia_nombre"),
  contactoEmergenciaTelefono: text("contacto_emergencia_telefono"),
  observaciones: text("observaciones"),
  aceptoReglamento: boolean("acepto_reglamento").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Perfil de docente/tutor responsable por semestre, grupo y turno */
export const teacherProfiles = pgTable("teacher_profiles", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  numeroEmpleado: text("numero_empleado"),
  departamento: text("departamento").notNull().default("Logística"),
  asignaturaBase: text("asignatura_base"),
  moduloNumero: integer("modulo_numero"),
  submoduloNumero: integer("submodulo_numero"),
  moduloNombre: text("modulo_nombre"),
  submoduloNombre: text("submodulo_nombre"),
  semestreResponsable: integer("semestre_responsable"),
  grupoResponsable: text("grupo_responsable"),
  turnoResponsable: text("turno_responsable"),
  gruposResponsables: text("grupos_responsables"),
  turnosResponsables: text("turnos_responsables"),
  telefono: text("telefono"),
  recibeNotificaciones: boolean("recibe_notificaciones").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Códigos OTP para verificar correo institucional */
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  purpose: text("purpose").notNull().default("registro"),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Notificaciones internas para docentes, alumnos y jefatura */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  contenido: text("contenido").notNull(),
  tipo: text("tipo").notNull().default("sistema"),
  leida: boolean("leida").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Mensajes personales dentro de la plataforma */
export const internalMessages = pgTable("internal_messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  toUserId: integer("to_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  asunto: text("asunto").notNull(),
  contenido: text("contenido").notNull(),
  leido: boolean("leido").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Bitácora de actividad: registro, inicio de sesión, entregas, etc. */
export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accion: text("accion").notNull(),
  detalle: text("detalle"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Sesiones de acceso (cookie httpOnly) */
export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Clases / asignaturas impartidas por un docente */
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  clave: text("clave").notNull().unique(),
  descripcion: text("descripcion"),
  especialidad: text("especialidad"),
  semestre: integer("semestre").notNull().default(1),
  grupo: text("grupo").notNull().default("E"),
  turno: text("turno").notNull().default("Matutino"),
  aula: text("aula"),
  color: text("color").notNull().default("#1D5BD5"),
  docenteId: integer("docente_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Inscripción de estudiantes a una clase */
export const enrollments = pgTable(
  "enrollments",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("enrollment_unico").on(table.courseId, table.studentId)],
);

/** Material didáctico: apuntes, enlaces, videos */
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),
  tipo: text("tipo").notNull().default("apunte"),
  url: text("url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Sesiones de clase en vivo (presencial o virtual) */
export const classSessions = pgTable("class_sessions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  tema: text("tema").notNull(),
  descripcion: text("descripcion"),
  modalidad: text("modalidad").notNull().default("Virtual"),
  enlace: text("enlace"),
  inicia: timestamp("inicia", { withTimezone: true }).notNull(),
  duracionMin: integer("duracion_min").notNull().default(50),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Tareas / actividades evaluables con parcial (1°, 2°, 3° Parcial) */
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  instrucciones: text("instrucciones"),
  puntos: integer("puntos").notNull().default(100),
  parcial: integer("parcial").notNull().default(1),
  fechaEntrega: timestamp("fecha_entrega", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Entregas de los estudiantes */
export const submissions = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contenido: text("contenido"),
    url: text("url"),
    calificacion: integer("calificacion"),
    retroalimentacion: text("retroalimentacion"),
    entregadoEn: timestamp("entregado_en", { withTimezone: true }).notNull().defaultNow(),
    calificadoEn: timestamp("calificado_en", { withTimezone: true }),
  },
  (table) => [uniqueIndex("entrega_unica").on(table.assignmentId, table.studentId)],
);

/** Muro de la clase */
export const classPosts = pgTable("class_posts", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  autorId: integer("autor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  contenido: text("contenido").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Avisos institucionales (portada pública) */
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  contenido: text("contenido").notNull(),
  categoria: text("categoria").notNull().default("General"),
  autorId: integer("autor_id").references(() => users.id, { onDelete: "set null" }),
  publicado: boolean("publicado").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Configuración OAuth de Google para abrir las cuentas reales del dispositivo */
export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  googleClientId: text("google_client_id"),
  googleClientSecret: text("google_client_secret"),
  twilioAccountSid: text("twilio_account_sid"),
  twilioAuthToken: text("twilio_auth_token"),
  twilioFromSms: text("twilio_from_sms"),
  twilioFromWhatsapp: text("twilio_from_whatsapp"),
  resendApiKey: text("resend_api_key"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Banner de aviso urgente controlado por jefatura (portada pública) */
export const urgentBanner = pgTable("urgent_banner", {
  id: serial("id").primaryKey(),
  activo: boolean("activo").notNull().default(false),
  titulo: text("titulo").notNull().default(""),
  mensaje: text("mensaje").notNull().default(""),
  nivel: text("nivel").notNull().default("info"), // info | alerta | urgente
  enlace: text("enlace"),
  actualizadoPorId: integer("actualizado_por_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Formatos dinámicos llenados por los usuarios dentro de la plataforma */
export const formatosLlenados = pgTable("formatos_llenados", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codigo: text("codigo").notNull(),
  datos: text("datos").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** MEJORA 1: Control de Asistencia Digital por Asignatura y Alumno */
export const attendances = pgTable(
  "attendances",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fecha: timestamp("fecha", { withTimezone: true }).notNull(),
    estado: text("estado").notNull().default("presente"), // presente | retardo | falta | justificado
    observacion: text("observacion"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("asistencia_dia_alumno").on(table.courseId, table.studentId, table.fecha)],
);

/** MEJORA 4: Buzón de Justificantes Escolares y Médicos */
export const attendanceJustifications = pgTable("attendance_justifications", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  fechaFalta: timestamp("fecha_falta", { withTimezone: true }).notNull(),
  motivo: text("motivo").notNull(),
  documentoUrl: text("documento_url"),
  estado: text("estado").notNull().default("pendiente"), // pendiente | aprobado | rechazado
  notaRevision: text("nota_revision"),
  revisadoPorId: integer("revisado_por_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** MEJORA 2: Biblioteca de Formatos Logísticos Oficiales */
export const logisticsTemplates = pgTable("logistics_templates", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull().unique(), // ej. "FOR-LOG-01"
  titulo: text("titulo").notNull(),
  categoria: text("categoria").notNull(), // Almacén | Transporte | Comercio Exterior | Compras
  descripcion: text("descripcion").notNull(),
  tipoArchivo: text("tipo_archivo").notNull().default("xlsx"),
  descargas: integer("descargas").notNull().default(0),
  urlDescarga: text("url_descarga"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Control de acceso de la Biblioteca de Formatos.
 *
 * Los docentes ven siempre todo el catálogo. Los alumnos sólo ven un formato
 * cuando el docente lo habilita para su semestre, dentro del módulo al que
 * pertenece. Cada registro es una habilitación vigente.
 */
export const formatoHabilitaciones = pgTable(
  "formato_habilitaciones",
  {
    id: serial("id").primaryKey(),
    /** Código del formato llenable o de la plantilla Excel */
    codigo: text("codigo").notNull(),
    /** "llenable" | "plantilla" */
    tipo: text("tipo").notNull().default("llenable"),
    /** Módulo profesional al que pertenece el formato (1..5) */
    modulo: integer("modulo").notNull(),
    /** Semestre al que se le concede el acceso (2..6) */
    semestre: integer("semestre").notNull(),
    /** Docente que concedió el acceso */
    docenteId: integer("docente_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("formato_habilitacion_unica").on(table.codigo, table.semestre)],
);

/** MEJORA 6: Módulo de Prácticas en el Almacén Escuela (Edificio C) */
export const warehousePractices = pgTable("warehouse_practices", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  docenteId: integer("docente_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  objetivo: text("objetivo").notNull(),
  areaAlmacen: text("area_almacen").notNull().default("Zona de Racks y Estantería A"),
  equiposUtilizados: text("equipos_utilizados").notNull(), // Montacargas contrabalanceado, lector láser, transpaleta
  equipoSeguridadObligatorio: text("equipo_seguridad_obligatorio").notNull(), // Chaleco reflejante, botas casquillo, guantes
  fechaPractica: timestamp("fecha_practica", { withTimezone: true }).notNull(),
  duracionMinutos: integer("duracion_minutos").notNull().default(100),
  cupoMaximo: integer("cupo_maximo").notNull().default(30),
  estado: text("estado").notNull().default("programada"), // programada | en_curso | concluida
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type ClassSession = typeof classSessions.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InternalMessage = typeof internalMessages.$inferSelect;
export type Attendance = typeof attendances.$inferSelect;
export type AttendanceJustification = typeof attendanceJustifications.$inferSelect;
export type LogisticsTemplate = typeof logisticsTemplates.$inferSelect;
export type WarehousePractice = typeof warehousePractices.$inferSelect;
