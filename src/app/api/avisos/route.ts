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
  } catch (error) {
    console.warn("[api/avisos] DB no disponible:", (error as Error).message?.slice(0, 200));
    // Avisos demo por defecto
    return Response.json({
      ok: true,
      plantel: "CBTIS No. 270",
      total: 2,
      avisos: [
        {
          id: 1,
          titulo: "Bienvenidos a la Plataforma de Logística",
          contenido: "Plataforma institucional del CBTIS 270 para la carrera técnica en Logística. Consulta tus aulas y entrega evidencias.",
          categoria: "General",
          fecha: new Date().toISOString(),
        },
        {
          id: 2,
          titulo: "Modo demostración activo",
          contenido: "La plataforma funciona en modo demo sin base de datos. Registra tu cuenta y podrás acceder al panel.",
          categoria: "General",
          fecha: new Date().toISOString(),
        },
      ],
    });
  }
}
