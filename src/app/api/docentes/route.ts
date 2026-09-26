import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { teacherProfiles, users } from "@/db/schema";
import { demoGetAllDocentes } from "@/lib/demo-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SIN_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

export async function GET() {
  try {
    const rows = await db
      .select({ docente: users, perfil: teacherProfiles })
      .from(users)
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(and(eq(users.rol, "docente"), eq(users.activo, true)))
      .orderBy(asc(users.nombre));

    const docentes = rows.map(({ docente, perfil }) => {
      const gruposReales = perfil?.gruposResponsables
        ? perfil.gruposResponsables.split(",").map((g) => g.trim()).filter(Boolean)
        : perfil?.grupoResponsable && perfil.grupoResponsable !== "Todos"
          ? [perfil.grupoResponsable]
          : null;

      const turnosReales = perfil?.turnosResponsables
        ? perfil.turnosResponsables.split(",").map((t) => t.trim()).filter(Boolean)
        : perfil?.turnoResponsable
          ? [perfil.turnoResponsable]
          : null;

      return {
        id: docente.id,
        nombre: docente.nombre,
        semestre: perfil?.semestreResponsable ?? null,
        grupo: gruposReales ? gruposReales.join(" y ") : null,
        grupos: gruposReales,
        turno: turnosReales ? turnosReales.join(" y ") : null,
        turnos: turnosReales,
        moduloNombre: perfil?.moduloNombre ?? null,
        submoduloNombre: perfil?.submoduloNombre ?? null,
      };
    });

    // Si no hay docentes en DB, intentar demo
    if (docentes.length === 0) {
      const demo = demoGetAllDocentes();
      if (demo.length > 0) {
        return Response.json({ ok: true, docentes: demo }, { headers: SIN_CACHE });
      }
    }

    return Response.json({ ok: true, docentes }, { headers: SIN_CACHE });
  } catch (error) {
    console.warn("[api/docentes] DB falló, usando demo:", (error as Error).message?.slice(0, 200));
    try {
      const demo = demoGetAllDocentes();
      return Response.json({ ok: true, docentes: demo }, { headers: SIN_CACHE });
    } catch {
      return Response.json({ ok: true, docentes: [] });
    }
  }
}
