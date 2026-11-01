import { getCurrentUser } from "@/lib/auth";
import { buscarGlobal } from "@/lib/busqueda";

export const dynamic = "force-dynamic";

/**
 * Búsqueda global del panel. Filtra por rol en el servidor: un docente nunca
 * recibe alumnos de aulas ajenas y un estudiante no recibe a otros alumnos.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Inicia sesión para buscar." }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const resultado = await buscarGlobal(q, { id: user.id, rol: user.rol, nombre: user.nombre });

  return Response.json({ ok: true, ...resultado });
}
