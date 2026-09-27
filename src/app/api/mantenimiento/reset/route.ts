import { pool } from "@/db";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ENDPOINT TEMPORAL DE MANTENIMIENTO.
 * Vacía las cuentas y todo lo que cuelga de ellas para arrancar el ciclo
 * escolar desde cero. Se borra del repositorio en cuanto se usa.
 *
 * Requiere token y frase de confirmación explícita.
 */
const TOKEN = "cbtis270-reinicio-2026-09-27-7f3a91c4";

const TABLAS = [
  "audit_log",
  "attendance_justifications",
  "attendance_sessions",
  "attendances",
  "submissions",
  "assignments",
  "class_posts",
  "class_sessions",
  "materials",
  "enrollments",
  "courses",
  "formato_habilitaciones",
  "formatos_llenados",
  "warehouse_practices",
  "internal_messages",
  "notifications",
  "user_activity",
  "sessions",
  "otp_codes",
  "student_profiles",
  "teacher_profiles",
  "users",
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return Response.json({ ok: false, error: "Token inválido" }, { status: 403 });
  }
  if (url.searchParams.get("confirmar") !== "BORRAR-TODO") {
    return Response.json(
      { ok: false, error: "Falta la confirmación explícita" },
      { status: 400 },
    );
  }

  const conAdmin = url.searchParams.get("admin") === "1";
  const claveAdmin = url.searchParams.get("clave") ?? "";

  const cliente = await pool.connect();
  const borradas: string[] = [];
  try {
    await cliente.query("BEGIN");
    for (const tabla of TABLAS) {
      try {
        await cliente.query(`TRUNCATE TABLE ${tabla} RESTART IDENTITY CASCADE`);
        borradas.push(tabla);
      } catch {
        // La tabla puede no existir todavía; seguimos.
      }
    }

    let admin: { email: string } | null = null;
    if (conAdmin && claveAdmin.length >= 8) {
      const email = "jefatura@cbtis270.edu.mx";
      await cliente.query(
        `INSERT INTO users (nombre, email, password_hash, rol, especialidad, activo, email_verificado)
         VALUES ($1, $2, $3, 'admin', 'Logística', true, true)`,
        ["Jefatura de Logística", email, hashPassword(claveAdmin)],
      );
      admin = { email };
    }

    await cliente.query("COMMIT");

    const conteo = await cliente.query("SELECT count(*)::int AS n FROM users");
    return Response.json({
      ok: true,
      mensaje: "Base de cuentas reiniciada. Ya puedes registrar al docente desde cero.",
      tablasVaciadas: borradas.length,
      usuariosRestantes: conteo.rows[0]?.n ?? 0,
      admin,
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return Response.json(
      { ok: false, error: (error as Error).message?.slice(0, 300) },
      { status: 500 },
    );
  } finally {
    cliente.release();
  }
}
