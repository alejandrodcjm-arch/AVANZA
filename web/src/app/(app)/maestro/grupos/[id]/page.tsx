import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { groupStudents } from "@/lib/teacher";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("teacher", "director");
  const supabase = await createClient();
  const [{ data: g }, students, { data: alerts }] = await Promise.all([
    supabase.from("groups").select("grade, name").eq("id", id).maybeSingle(),
    groupStudents(supabase, id),
    supabase.from("alerts").select("student_id").eq("status", "open"),
  ]);
  const flagged = new Set((alerts ?? []).map((a) => a.student_id));
  return (
    <>
      <PageHeader title={g ? `${g.grade}°${g.name}` : "Grupo"} subtitle={`${students.length} alumnos`} back="/maestro" />
      <Card className="p-0">
        <ul className="divide-y divide-line">
          {students.map((s, i) => (
            <li key={s.id}>
              <Link href={`/alumnos/${s.id}`} className="flex min-h-14 items-center gap-3 px-4">
                <span className="num w-6 text-right text-sm text-muted">{i + 1}</span>
                <span className="flex-1">
                  {s.last_name} {s.second_last_name} {s.first_name}
                </span>
                {flagged.has(s.id) && <span className="size-2.5 rounded-full bg-care" aria-label="Requiere revisión" />}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
