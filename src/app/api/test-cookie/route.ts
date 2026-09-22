import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  jar.set("cbtis270_test", "test-value-123", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60*60*24,
    // @ts-ignore
    partitioned: true,
  } as any);

  jar.set("cbtis270_test2", "test-value-456", {
    httpOnly: false,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60*60*24,
    // @ts-ignore
    partitioned: true,
  } as any);

  const all = jar.getAll().map(c=>c.name);
  return Response.json({ ok: true, cookiesSet: all, message: "Revisa Set-Cookie headers y luego ve a /api/check-cookie" });
}

export async function POST() {
  return GET();
}
