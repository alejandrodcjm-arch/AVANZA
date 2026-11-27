import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que se ven sin sesión.
const PUBLIC = ["/entrar", "/invitacion", "/auth", "/aviso-de-privacidad", "/api/cron", "/manifest.webmanifest", "/sw.js", "/sin-conexion"];

/** Refresca la sesión de Supabase en cada petición y manda a /entrar si no hay sesión. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims valida la firma del JWT; no confiar en getSession() del lado del servidor.
  let signedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  } catch {
    signedIn = false;
  }

  const path = request.nextUrl.pathname;
  const isPublic = path === "/" || PUBLIC.some((p) => path === p || path.startsWith(p + "/"));
  if (!signedIn && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/entrar";
    to.search = path === "/inicio" ? "" : `?siguiente=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:png|svg|jpg|jpeg|webp|ico)$).*)"],
};
