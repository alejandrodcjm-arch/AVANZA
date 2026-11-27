import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Derecho de acceso: descarga en JSON de todo lo que la app tiene de usted y de sus hijos. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "sin sesión" }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return NextResponse.json({ error: "no se pudo generar" }, { status: 500 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mis-datos-avanza.json"`,
      "Cache-Control": "no-store",
    },
  });
}
