import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await db
      .select({
        id: announcements.id,
        titulo: announcements.titulo,
        contenido: announcements.contenido,
        categoria: announcements.categoria,
        fecha: announcements.createdAt,
      })
      .from(announcements)
      .where(eq(announcements.publicado, true))
      .orderBy(desc(announcements.createdAt))
      .limit(20);

    return Response.json({ ok: true, plantel: "CBTIS No. 270", total: data.length, avisos: data });
  } catch {
    return Response.json({ ok: false, error: "No fue posible consultar los avisos" }, { status: 500 });
  }
}
