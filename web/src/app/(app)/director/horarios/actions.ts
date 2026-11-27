"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);
const schema = z
  .array(
    z.object({
      weekday: z.number().int().min(1).max(6),
      starts_at: time,
      ends_at: time,
      subject_id: z.guid().nullable(),
      label: z.string().trim().max(60).nullable(),
      room: z.string().trim().max(40).nullable(),
    }),
  )
  .max(80);

export async function saveSchedule(groupId: string, blocks: z.infer<typeof schema>) {
  await requireRole("director");
  const parsed = schema.safeParse(blocks);
  if (!parsed.success || !z.guid().safeParse(groupId).success) return { ok: false, error: "Revise las horas: deben ser como 08:00." };
  const bad = parsed.data.find((b) => b.ends_at <= b.starts_at || (!b.subject_id && !b.label));
  if (bad) return { ok: false, error: "Cada clase necesita materia (o texto, como «Recreo») y una hora de fin mayor que la de inicio." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_schedule", { p_group: groupId, p_blocks: parsed.data });
  if (error) return { ok: false, error: error.code === "22023" ? "Hay clases que se enciman el mismo día. Revise las horas." : "No se pudo guardar." };
  revalidatePath("/director/horarios");
  return { ok: true, error: "" };
}
