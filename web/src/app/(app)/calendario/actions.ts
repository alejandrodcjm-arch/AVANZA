"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { DIRECTOR_KINDS, TEACHER_KINDS } from "@/lib/calendar/kinds";
import { createClient } from "@/lib/supabase/server";

type Res = { ok: boolean; error: string };
const time = z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]).transform((v) => v || null);

const schema = z.object({
  title: z.string().trim().min(2, "Escriba el nombre del evento.").max(120),
  kind: z.enum(DIRECTOR_KINDS as [string, ...string[]]),
  group: z.union([z.literal(""), z.guid()]).transform((v) => v || null),
  starts_on: z.iso.date("Elija la fecha."),
  ends_on: z.union([z.literal(""), z.iso.date()]).transform((v) => v || null),
  start_time: time,
  end_time: time,
  description: z.string().trim().max(1000).transform((v) => v || null),
  staff_only: z.preprocess((v) => v === "on", z.boolean()),
  announce: z.preprocess((v) => v === "on", z.boolean()),
});

export async function createEvent(_: Res, form: FormData): Promise<Res> {
  const session = await getSession();
  const active = session?.active;
  if (!active || active.role === "guardian") return { ok: false, error: "Sin permiso." };
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revise los datos." };
  const d = p.data;
  const ends = d.ends_on && d.ends_on > d.starts_on ? d.ends_on : d.starts_on;
  if (d.end_time && (!d.start_time || d.end_time <= d.start_time)) return { ok: false, error: "La hora de fin debe ser después de la de inicio." };
  if (active.role === "teacher" && (!d.group || !TEACHER_KINDS.includes(d.kind as never)))
    return { ok: false, error: "Los maestros agendan exámenes, juntas o eventos de sus grupos." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      school_id: active.schoolId,
      group_id: d.group,
      kind: d.kind as never,
      title: d.title,
      description: d.description,
      starts_on: d.starts_on,
      ends_on: ends,
      start_time: d.start_time,
      end_time: d.end_time,
      staff_only: active.role === "director" && d.staff_only,
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.code === "42501" ? "No tiene permiso para ese grupo." : "No se pudo guardar." };
  if (d.announce && !d.staff_only) {
    const r = await supabase.rpc("announce_event", { p_event: data.id });
    if (r.error) return { ok: false, error: "El evento se guardó, pero no se pudo avisar a las familias." };
  }
  revalidatePath("/calendario");
  return { ok: true, error: "" };
}

export async function deleteEvent(id: string) {
  if (!z.guid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("calendar_events").delete().eq("id", id);
  revalidatePath("/calendario");
}

export async function announce(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("announce_event", { p_event: id });
  revalidatePath("/calendario");
  return error ? (error.message.includes("ya se avisó") ? "Ya se había avisado." : "No se pudo avisar.") : "";
}

export async function loadSep() {
  const session = await getSession();
  if (session?.active?.role !== "director") return;
  const supabase = await createClient();
  await supabase.rpc("load_sep_calendar", { p_school: session.active.schoolId });
  revalidatePath("/calendario");
}

export async function newFeedToken() {
  const supabase = await createClient();
  await supabase.rpc("rotate_calendar_feed");
  revalidatePath("/calendario");
}
