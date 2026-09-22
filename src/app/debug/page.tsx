import { cookies, headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  const jar = await cookies();
  const h = await headers();
  const user = await getCurrentUser();
  const all = jar.getAll().map(c => ({ name: c.name, value: c.value.slice(0, 30) + "...", httpOnly: true }));
  const cookieHeader = h.get("cookie") || "";

  return (
    <div className="p-6 space-y-4 font-mono text-sm">
      <h1 className="text-xl font-bold">Debug Sesión</h1>
      <div className="p-4 bg-slate-100 rounded">
        <p><strong>User:</strong> {user ? JSON.stringify(user) : "null - no hay sesión"}</p>
      </div>
      <div className="p-4 bg-slate-100 rounded">
        <p><strong>Cookies en jar:</strong> {jar.getAll().map(c=>c.name).join(", ") || "ninguna"}</p>
        <ul className="mt-2">
          {jar.getAll().map(c => (
            <li key={c.name}>{c.name}: {c.value.slice(0, 50)}...</li>
          ))}
        </ul>
      </div>
      <div className="p-4 bg-slate-100 rounded">
        <p><strong>Cookie header raw length:</strong> {cookieHeader.length}</p>
        <p className="break-all">{cookieHeader.slice(0, 500)}</p>
      </div>
      <div className="p-4 bg-yellow-100 rounded">
        <p>Si ves user null y cookies vacías después de registro, es bloqueo de third-party cookies en iframe.</p>
        <p>Abre el preview en pestaña nueva: copia la URL del preview y ábrela fuera del iframe.</p>
      </div>
      <div className="space-x-2">
        <a href="/panel" className="underline text-blue-600">Ir a /panel</a>
        <a href="/panel/formatos" className="underline text-blue-600">Ir a /panel/formatos</a>
        <a href="/login" className="underline text-blue-600">Ir a /login</a>
        <a href="/api/me" className="underline text-blue-600">API /api/me</a>
      </div>
    </div>
  );
}
