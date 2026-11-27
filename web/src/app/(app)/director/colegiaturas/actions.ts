"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";

const rows = z
  .array(
    z.object({
      student_id: z.guid(),
      concept: z.string().trim().min(2).max(80),
      amount: z.number().positive().max(999999),
      paid: z.number().min(0),
      due_on: z.iso.date(),
      paid_on: z.iso.date().nullable(),
    }),
  )
  .min(1)
  .max(20000);

export async function importTuition(input: z.infer<typeof rows>) {
  const { membership } = await requireRole("director");
  const p = rows.safeParse(input);
  if (!p.success) return { ok: false, error: "Los datos del archivo no son válidos.", created: 0, updated: 0 };
  const supabase = await createClient();
  let created = 0;
  let updated = 0;
  for (let i = 0; i < p.data.length; i += 4000) {
    const { data, error } = await supabase.rpc("import_tuition", { p_school: membership.schoolId, p_rows: p.data.slice(i, i + 4000) });
    if (error) return { ok: false, error: "No se pudo guardar. Revise que los alumnos sean de esta escuela.", created, updated };
    const r = data as { created: number; updated: number };
    created += r.created;
    updated += r.updated;
  }
  revalidatePath("/director/colegiaturas");
  return { ok: true, error: "", created, updated };
}

export async function markPaid(chargeId: string) {
  await requireRole("director");
  if (!z.guid().safeParse(chargeId).success) return;
  const supabase = await createClient();
  const { data } = await supabase.from("tuition_charges").select("amount").eq("id", chargeId).single();
  if (!data) return;
  await supabase.from("tuition_charges").update({ paid: data.amount, paid_on: todayLocal() }).eq("id", chargeId);
  revalidatePath("/director/colegiaturas");
}

export async function savePaymentInfo(_: { ok: boolean; error: string }, form: FormData) {
  const { membership } = await requireRole("director");
  const info = String(form.get("payment_info") ?? "").trim().slice(0, 1000);
  const supabase = await createClient();
  const { error } = await supabase.from("schools").update({ payment_info: info || null }).eq("id", membership.schoolId);
  revalidatePath("/director/colegiaturas");
  return error ? { ok: false, error: "No se pudo guardar." } : { ok: true, error: "" };
}
