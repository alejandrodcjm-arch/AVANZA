import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { groupStudents } from "@/lib/teacher";
import { todayLocal } from "@/lib/time";
import { AttendanceForm } from "./attendance-form";

export const metadata = { title: "Pasar lista" };

export default async function AttendancePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fecha?: string }> }) {
  const [{ id }, { fecha }] = await Promise.all([params, searchParams]);
  await requireRole("teacher", "director");
  const today = todayLocal();
  const date = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha <= today ? fecha : today;
  const supabase = await createClient();
  const [students, { data: rows }] = await Promise.all([
    groupStudents(supabase, id),
    supabase.from("attendance").select("student_id, status").eq("group_id", id).eq("date", date),
  ]);
  const initial = Object.fromEntries((rows ?? []).filter((r) => r.status !== "present").map((r) => [r.student_id, r.status])) as Record<string, "absent" | "late" | "excused">;

  return (
    <>
      <p className="mb-3 text-muted">{formatDate(date)} · Todos están presentes; toque solo a quien faltó o llegó tarde.</p>
      <AttendanceForm
        key={date}
        groupId={id}
        date={date}
        today={today}
        initial={initial}
        students={students.map((s) => ({ id: s.id, name: `${s.last_name} ${s.second_last_name ?? ""} ${s.first_name}`.replace(/\s+/g, " ") }))}
      />
    </>
  );
}
