import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const h = await headers();
  const cookieHeader = h.get("cookie") || "";
  return Response.json({
    ok: true,
    jar: jar.getAll().map(c=> ({ name: c.name, val: c.value.slice(0,20) })),
    header: cookieHeader.slice(0,500),
    hasTest: cookieHeader.includes("cbtis270_test"),
    hasSession: cookieHeader.includes("cbtis270_session"),
    hasHint: cookieHeader.includes("cbtis270_session_hint"),
  });
}
