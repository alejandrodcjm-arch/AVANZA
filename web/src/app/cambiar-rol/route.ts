import { NextResponse, type NextRequest } from "next/server";
import { CTX_COOKIE, getSession } from "@/lib/auth";

/** Cambia la escuela/rol activo (por ejemplo, una maestra que también es mamá en la escuela). */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("a");
  const next = request.nextUrl.searchParams.get("siguiente") ?? "/inicio";
  const session = await getSession();
  const target = session?.memberships.find((m) => m.id === id);
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/inicio";
  const res = NextResponse.redirect(new URL(target ? safe : "/inicio", request.nextUrl.origin));
  if (target) res.cookies.set(CTX_COOKIE, target.id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
