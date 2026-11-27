"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const incident = z.object({
  involved: z.array(z.guid()).max(15),
  affected: z.array(z.guid()).max(15),
  date: z.iso.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  location: z.enum(["salon", "patio", "banos", "pasillos", "entrada_salida", "comedor", "deportes", "transporte", "en_linea", "otro"]),
  category: z.enum(["interrupcion", "incumplimiento", "falta_respeto", "agresion_verbal", "agresion_fisica", "acoso", "dano_material", "celular", "deshonestidad", "otra"]),
  severity: z.enum(["minor", "moderate", "serious"]),
  action: z.enum(["platica", "llamada_atencion", "aviso_familia", "citatorio", "reparacion", "suspension", "canalizacion", "ninguna"]),
  description: z.string().trim().min(3).max(3000),
  familyNote: z.string().trim().max(1000),
});

export async function saveIncident(groupId: string, input: z.infer<typeof incident>) {
  const p = incident.safeParse(input);
  if (!p.success) return { ok: false, error: "Elija al menos un alumno y describa qué pasó." };
  const d = p.data;
  if (!d.involved.length && !d.affected.length) return { ok: false, error: "Elija al menos un alumno." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_incident", {
    p_involved: d.involved,
    p_affected: d.affected,
    p_occurred_on: d.date,
    p_time: d.time as string, // null = sin hora (la función acepta null)
    p_location: d.location,
    p_category: d.category,
    p_severity: d.severity,
    p_description: d.description,
    p_action: d.action,
    p_family_note: d.familyNote,
  });
  if (error) return { ok: false, error: error.code === "42501" ? "No tiene permiso con alguno de esos alumnos." : error.code === "22023" ? error.message : "No se pudo guardar." };
  revalidatePath(`/maestro/grupos/${groupId}/conducta`);
  return { ok: true, error: "" };
}

export async function saveRecognition(groupId: string, students: string[], category: string, note: string) {
  const p = z
    .object({ students: z.array(z.guid()).min(1).max(60), category: z.enum(["respeto", "responsabilidad", "esfuerzo", "colaboracion", "mejora", "liderazgo"]), note: z.string().trim().max(300) })
    .safeParse({ students, category, note });
  if (!p.success) return { ok: false, error: "Elija alumnos y el motivo." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("give_recognition", { p_students: p.data.students, p_category: p.data.category, p_note: p.data.note || undefined });
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidatePath(`/maestro/grupos/${groupId}/conducta`);
  return { ok: true, error: "" };
}
