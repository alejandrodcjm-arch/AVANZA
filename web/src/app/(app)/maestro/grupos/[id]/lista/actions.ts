"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";

const schema = z.object({
  date: z.iso.date(),
  exceptions: z.record(z.guid(), z.enum(["absent", "late", "excused"])),
});

export async function saveAttendance(groupId: string, input: { date: string; exceptions: Record<string, string> }) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos incompletos." };
  if (parsed.data.date > todayLocal()) return { ok: false, error: "No se puede pasar lista de días futuros." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_attendance", { p_group: groupId, p_date: parsed.data.date, p_exceptions: parsed.data.exceptions });
  if (error) return { ok: false, error: error.code === "42501" ? "No da clase a este grupo." : "No se pudo guardar. Intente de nuevo." };
  revalidatePath("/maestro");
  return { ok: true, error: "" };
}
