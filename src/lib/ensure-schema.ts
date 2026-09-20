import { pool } from "@/db";

let esquemaListo = false;

const DDL = `
CREATE TABLE IF NOT EXISTS otp_codes (
  id serial PRIMARY KEY,
  email text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'registro',
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

/**
 * Autocuración idempotente: garantiza que las tablas mínimas
 * para OTP y sesiones existan aunque el sandbox vacíe la base.
 */
export async function asegurarEsquemaCore(): Promise<void> {
  if (esquemaListo) return;
  const cliente = await pool.connect();
  try {
    await cliente.query(DDL);
    esquemaListo = true;
  } finally {
    cliente.release();
  }
}
