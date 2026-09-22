import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, user: null, message: "No hay sesión" }, { status: 401 });
  }
  return Response.json({ ok: true, user });
}
