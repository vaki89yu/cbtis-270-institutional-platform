import { pool } from "@/db";

let esquemaListo = false;
let intentoFallido = false;

/**
 * Esquema autocurable para producción.
 * La plataforma no depende de que Vercel haya ejecutado una migración externa:
 * crea de forma idempotente todas las tablas que utiliza el portal y el panel.
 * 
 * MODO DEMO: Si la DB no está disponible, no lanza error, solo advierte
 * y permite que la app siga funcionando con almacenamiento demo.
 */
const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  rol text NOT NULL DEFAULT 'estudiante',
  matricula text,
  especialidad text,
  semestre integer,
  turno text,
  activo boolean NOT NULL DEFAULT true,
  email_verificado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  numero_control text NOT NULL,
  numero_control_escolar text,
  grupo text NOT NULL DEFAULT 'E',
  tutor_docente_id integer REFERENCES users(id) ON DELETE SET NULL,
  tutor_docente_nombre text,
  curp text,
  telefono text,
  domicilio text,
  contacto_emergencia_nombre text,
  contacto_emergencia_telefono text,
  observaciones text,
  acepto_reglamento boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
  user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  numero_empleado text,
  departamento text NOT NULL DEFAULT 'Logística',
  asignatura_base text,
  modulo_numero integer,
  submodulo_numero integer,
  modulo_nombre text,
  submodulo_nombre text,
  semestre_responsable integer,
  grupo_responsable text,
  turno_responsable text,
  grupos_responsables text,
  turnos_responsables text,
  telefono text,
  recibe_notificaciones boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id serial PRIMARY KEY,
  email text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'registro',
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  contenido text NOT NULL,
  tipo text NOT NULL DEFAULT 'sistema',
  leida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internal_messages (
  id serial PRIMARY KEY,
  from_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asunto text NOT NULL,
  contenido text NOT NULL,
  leido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_activity (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accion text NOT NULL,
  detalle text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  clave text NOT NULL UNIQUE,
  descripcion text,
  especialidad text,
  semestre integer NOT NULL DEFAULT 1,
  grupo text NOT NULL DEFAULT 'E',
  turno text NOT NULL DEFAULT 'Matutino',
  aula text,
  color text NOT NULL DEFAULT '#1D5BD5',
  docente_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id serial PRIMARY KEY,
  course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrollment_unico UNIQUE (course_id, student_id)
);

CREATE TABLE IF NOT EXISTS materials (
  id serial PRIMARY KEY,
  course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  tipo text NOT NULL DEFAULT 'apunte',
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id serial PRIMARY KEY,
  course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tema text NOT NULL,
  descripcion text,
  modalidad text NOT NULL DEFAULT 'Virtual',
  enlace text,
  inicia timestamptz NOT NULL,
  duracion_min integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id serial PRIMARY KEY,
  course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  instrucciones text,
  puntos integer NOT NULL DEFAULT 100,
  parcial integer NOT NULL DEFAULT 1,
  fecha_entrega timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id serial PRIMARY KEY,
  assignment_id integer NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contenido text,
  url text,
  calificacion integer,
  retroalimentacion text,
  entregado_en timestamptz NOT NULL DEFAULT now(),
  calificado_en timestamptz,
  CONSTRAINT entrega_unica UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS class_posts (
  id serial PRIMARY KEY,
  course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  autor_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id serial PRIMARY KEY,
  titulo text NOT NULL,
  contenido text NOT NULL,
  categoria text NOT NULL DEFAULT 'General',
  autor_id integer REFERENCES users(id) ON DELETE SET NULL,
  publicado boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_settings (
  id serial PRIMARY KEY,
  google_client_id text,
  google_client_secret text,
  twilio_account_sid text,
  twilio_auth_token text,
  twilio_from_sms text,
  twilio_from_whatsapp text,
  resend_api_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS urgent_banner (
  id serial PRIMARY KEY,
  activo boolean NOT NULL DEFAULT false,
  titulo text NOT NULL DEFAULT '',
  mensaje text NOT NULL DEFAULT '',
  nivel text NOT NULL DEFAULT 'info',
  enlace text,
  actualizado_por_id integer REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formatos_llenados (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  datos text NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendances (
  id serial PRIMARY KEY,
  course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fecha timestamptz NOT NULL,
  estado text NOT NULL DEFAULT 'presente',
  observacion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asistencia_dia_alumno UNIQUE (course_id, student_id, fecha)
);

CREATE TABLE IF NOT EXISTS attendance_justifications (
  id serial PRIMARY KEY,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  fecha_falta timestamptz NOT NULL,
  motivo text NOT NULL,
  documento_url text,
  estado text NOT NULL DEFAULT 'pendiente',
  nota_revision text,
  revisado_por_id integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logistics_templates (
  id serial PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  titulo text NOT NULL,
  categoria text NOT NULL,
  descripcion text NOT NULL,
  tipo_archivo text NOT NULL DEFAULT 'xlsx',
  descargas integer NOT NULL DEFAULT 0,
  url_descarga text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warehouse_practices (
  id serial PRIMARY KEY,
  course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  docente_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  objetivo text NOT NULL,
  area_almacen text NOT NULL DEFAULT 'Zona de Racks y Estantería A',
  equipos_utilizados text NOT NULL,
  equipo_seguridad_obligatorio text NOT NULL,
  fecha_practica timestamptz NOT NULL,
  duracion_minutos integer NOT NULL DEFAULT 100,
  cupo_maximo integer NOT NULL DEFAULT 30,
  estado text NOT NULL DEFAULT 'programada',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formato_habilitaciones (
  id serial PRIMARY KEY,
  codigo text NOT NULL,
  tipo text NOT NULL DEFAULT 'llenable',
  modulo integer NOT NULL,
  semestre integer NOT NULL,
  grupo text NOT NULL DEFAULT 'Todos',
  turno text,
  docente_id integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE formato_habilitaciones ADD COLUMN IF NOT EXISTS grupo text NOT NULL DEFAULT 'Todos';
ALTER TABLE formato_habilitaciones ADD COLUMN IF NOT EXISTS turno text;
DROP INDEX IF EXISTS formato_habilitacion_unica;

CREATE UNIQUE INDEX IF NOT EXISTS formato_habilitacion_ambito
  ON formato_habilitaciones (codigo, docente_id, semestre, grupo);
`;

export async function asegurarEsquemaCore(): Promise<void> {
  if (esquemaListo) return;
  if (intentoFallido) return; // Evitar reintentos constantes si ya falló

  // Si no hay DATABASE_URL, modo demo directo
  if (!process.env.DATABASE_URL) {
    console.warn("[ensure-schema] Sin DATABASE_URL - modo demo activado, saltando creación de tablas");
    esquemaListo = true;
    return;
  }

  try {
    const cliente = await pool.connect();
    try {
      await cliente.query("BEGIN");
      await cliente.query(DDL);
      await cliente.query("COMMIT");
      esquemaListo = true;
      console.log("[ensure-schema] Esquema verificado/creado correctamente");
    } catch (error) {
      await cliente.query("ROLLBACK");
      throw error;
    } finally {
      cliente.release();
    }
  } catch (error) {
    // No lanzar error - modo demo
    console.warn("[ensure-schema] No se pudo conectar a la BD, activando modo demo:", (error as Error).message?.slice(0, 300));
    intentoFallido = true;
    esquemaListo = true; // Marcar como listo para no bloquear login/registro
    // No throw - permitir que la app siga
  }
}

// Para forzar reintento si se configura la DB después
export function resetEsquemaCache() {
  esquemaListo = false;
  intentoFallido = false;
}
