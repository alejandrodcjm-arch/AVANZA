import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

/**
 * Cliente con llave secreta: SALTA RLS. Úsese solo en el servidor y solo para:
 * crear cuentas de personal, tareas programadas (/api/cron) y el envío de avisos.
 */
export function createAdminClient() {
  const e = env();
  if (!e.SUPABASE_SECRET_KEY) throw new Error("Falta SUPABASE_SECRET_KEY");
  return createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
