import Link from "next/link";
import { Card, Empty } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { teacherGroups } from "@/lib/teacher";
import { todayLocal } from "@/lib/time";
import { NewAssignment } from "./new-form";

export const metadata = { title: "Tareas" };

export default async function AssignmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await requireRole("teacher");
  const supabase = await createClient();
  const group = (await teacherGroups(supabase, session.userId)).find((g) => g.id === id);
  if (!group) return <Empty title="No da clase a este grupo" />;
  const { data: items } = await supabase
    .from("assignments")
    .select("id, title, due_on, subjects(name), assignment_misses(count)")
    .eq("group_id", id)
    .order("due_on", { ascending: false })
    .limit(30);

  return (
    <>
      <h2 className="mb-1 text-lg font-semibold">Actividades una por una</h2>
      <p className="mb-3 text-muted">Opcional. Lo más rápido es el corte semanal o subir su Excel. Solo marque a quien NO entregó.</p>
      <Card>
        <NewAssignment groupId={id} subjects={group.subjects} today={todayLocal()} />
      </Card>
      <h2 className="mt-6 mb-2 font-semibold">Recientes</h2>
      {items?.length ? (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id}>
              <Link href={`/maestro/grupos/${id}/tareas/${a.id}`} className="flex min-h-14 items-center justify-between gap-3 rounded-card bg-card px-4 ring-1 ring-line">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{a.title}</span>
                  <span className="text-sm text-muted">
                    {a.subjects?.name} · {formatShortDate(a.due_on)}
                  </span>
                </span>
                <span className="num shrink-0 text-sm text-muted">{a.assignment_misses?.[0]?.count ?? 0} sin entregar</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="Aún no registra tareas" />
      )}
    </>
  );
}
