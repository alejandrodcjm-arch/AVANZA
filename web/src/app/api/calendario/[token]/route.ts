import { buildIcs, type Feed } from "@/lib/calendar/ics";
import { createAdminClient } from "@/lib/supabase/admin";

// Calendario suscrito (Google, Apple, Outlook). Sin sesión: el token secreto es la llave.
// Lo que incluye lo decide la base (public.calendar_feed) con las mismas reglas de permisos de la app.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token: raw } = await ctx.params;
  const token = raw.replace(/\.ics$/, "");
  if (!/^[a-f0-9]{64}$/.test(token)) return new Response("No encontrado", { status: 404 });

  const { data, error } = await createAdminClient().rpc("calendar_feed", { p_token: token });
  if (error) return new Response("No disponible", { status: 503 });
  if (!data) return new Response("Este enlace ya no es válido. Genere uno nuevo en Avanza › Calendario.", { status: 404 });

  return new Response(buildIcs(data as unknown as Feed), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="avanza.ics"',
      "Cache-Control": "private, max-age=900",
      "X-Robots-Tag": "noindex",
    },
  });
}
