"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthStart, todayLocal } from "@/lib/time";

export async function saveGoal(studentId: string, _prev: { error: string }, form: FormData) {
  const goal = z.string().trim().min(3).max(300).safeParse(form.get("goal"));
  if (!goal.success) return { error: "Escriba una meta de 3 a 300 letras." };
  const session = await getSession();
  if (!session?.active) return { error: "Su sesión terminó. Entre de nuevo." };
  const supabase = await createClient();
  const { error } = await supabase.from("monthly_goals").upsert(
    { school_id: session.active.schoolId, student_id: studentId, month: monthStart(todayLocal()), goal: goal.data, created_by: session.userId },
    { onConflict: "student_id,month" },
  );
  if (error) return { error: "No se pudo guardar. Intente de nuevo." };
  revalidatePath(`/hijos/${studentId}`);
  return { error: "" };
}

export async function markGoal(studentId: string, goalId: string, achieved: boolean) {
  const supabase = await createClient();
  await supabase.from("monthly_goals").update({ achieved }).eq("id", goalId);
  revalidatePath(`/hijos/${studentId}`);
}
