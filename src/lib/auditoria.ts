import { db } from "@/db";
import { auditLog } from "@/db/schema";

/**
 * Bitácora de auditoría. Nunca debe tumbar una operación: si falla el registro,
 * se traga el error y la acción del usuario continúa.
 */
export async function registrarAuditoria(entrada: {
  userId?: number | null;
  actor?: string | null;
  accion: string;
  entidad?: string | null;
  entidadId?: string | number | null;
  detalle?: string | null;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      userId: entrada.userId ?? null,
      actor: entrada.actor ?? null,
      accion: entrada.accion,
      entidad: entrada.entidad ?? null,
      entidadId: entrada.entidadId != null ? String(entrada.entidadId) : null,
      detalle: entrada.detalle ?? null,
    });
  } catch {
    // La auditoría es informativa, jamás bloqueante.
  }
}
