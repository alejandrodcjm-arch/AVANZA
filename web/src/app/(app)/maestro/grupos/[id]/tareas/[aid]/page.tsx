import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { groupStudents } from "@/lib/teacher";
import { MissesForm } from "./misses-form";

export default async function AssignmentPage({ params }: { params: Promise<{ id: string; aid: string }> }) {
  const { id, aid } = await params;
  await requireRole("teacher");
  const supabase = await createClient();
  const [{ data: a }, students, { data: misses }] = await Promise.all([
    supabase.from("assignments").select("title, due_on, subjects(name)").eq("id", aid).eq("group_id", id).maybeSingle(),
    groupStudents(supabase, id),
    supabase.from("assignment_misses").select("student_id").eq("assignment_id", aid),
  ]);
  if (!a) notFound();
  return (
    <>
      <PageHeader title={a.title} subtitle={`${a.subjects?.name} · se entregaba el ${formatDate(a.due_on)}`} back={`/maestro/grupos/${id}/tareas`} />
      <MissesForm
        groupId={id}
        assignmentId={aid}
        initial={(misses ?? []).map((m) => m.student_id)}
        students={students.map((s) => ({ id: s.id, name: `${s.last_name} ${s.second_last_name ?? ""} ${s.first_name}`.replace(/\s+/g, " ") }))}
      />
    </>
  );
}
