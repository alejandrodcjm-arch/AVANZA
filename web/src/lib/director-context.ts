import "server-only";
import type { ServerClient } from "@/lib/supabase/server";

/** Ciclo actual y periodos de la escuela (para rangos y filtros de reportes). */
export async function schoolCalendar(supabase: ServerClient, schoolId: string, today: string) {
  const { data: year } = await supabase
    .from("school_years")
    .select("id, name, starts_on, ends_on, periods(id, name, sort, starts_on, ends_on)")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();
  const periods = [...(year?.periods ?? [])].sort((a, b) => a.sort - b.sort);
  const period = periods.filter((p) => p.starts_on <= today).at(-1) ?? periods[0] ?? null;
  return { year, periods, period };
}
