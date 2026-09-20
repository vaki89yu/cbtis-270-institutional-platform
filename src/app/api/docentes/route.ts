import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { teacherProfiles, users } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select({ docente: users, perfil: teacherProfiles })
      .from(users)
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(eq(users.rol, "docente"))
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

    return Response.json({ ok: true, docentes });
  } catch {
    return Response.json({ ok: false, docentes: [] }, { status: 500 });
  }
}
