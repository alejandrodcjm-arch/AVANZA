"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ title: z.string().trim().min(3).max(200), subject_id: z.guid(), due_on: z.iso.date() });

export async function createAssignment(groupId: string, _p: { error: string }, form: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Escriba el nombre de la tarea, la materia y la fecha de entrega." };
  const session = await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .insert({ school_id: session!.active!.schoolId, group_id: groupId, created_by: session!.userId, ...parsed.data })
    .select("id")
    .single();
  if (error) return { error: "No se pudo crear la tarea." };
  redirect(`/maestro/grupos/${groupId}/tareas/${data.id}`);
}

export async function saveMisses(groupId: string, assignmentId: string, studentIds: string[]) {
  const ids = z.array(z.guid()).safeParse(studentIds);
  if (!ids.success) return { ok: false, error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_assignment_misses", { p_assignment: assignmentId, p_students: ids.data });
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidatePath(`/maestro/grupos/${groupId}/tareas`);
  return { ok: true, error: "" };
}
