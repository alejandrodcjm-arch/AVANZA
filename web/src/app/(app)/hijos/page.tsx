import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Empty, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { plural } from "@/lib/format";
import type { Overview } from "@/lib/overview";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";

export const metadata = { title: "Mis hijos" };

export default async function ChildrenPage() {
  const { session } = await requireRole("guardian");
  const supabase = await createClient();
  const { data: links } = await supabase.from("student_guardians").select("student_id").eq("guardian_id", session.userId);
  const ids = (links ?? []).map((l) => l.student_id);
  if (ids.length === 1) redirect(`/hijos/${ids[0]}`);

  const today = todayLocal();
  const overviews = await Promise.all(
    ids.map(async (id) => (await supabase.rpc("student_overview", { p_student: id, p_today: today })).data as unknown as Overview | null),
  );

  return (
    <>
      <PageHeader title={session.fullName ? `Hola, ${session.fullName.split(" ")[0]}` : "Hola"} subtitle="Toque a su hijo o hija para ver cómo va." />
      {ids.length === 0 ? (
        <Empty title="Todavía no hay alumnos ligados a su cuenta">Si ya aceptó la invitación de la escuela, pida en dirección que revisen su registro.</Empty>
      ) : (
        <ul className="space-y-3">
          {overviews.filter(Boolean).map((o) => (
            <li key={o!.student.id}>
              <Link href={`/hijos/${o!.student.id}`} className="block">
                <Card className="transition hover:ring-brand">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-xl font-bold">{o!.student.first_name}</h2>
                    <span className="text-muted">{o!.group?.label}</span>
                  </div>
                  <p className="mt-1 text-muted">
                    {o!.attendance && o!.attendance.days > 0
                      ? o!.attendance.absences === 0
                        ? `Sin faltas en el ${o!.period?.name ?? "periodo"}.`
                        : `${plural(o!.attendance.absences, "falta", "faltas")} en el ${o!.period?.name ?? "periodo"}.`
                      : "Aún no hay asistencia registrada."}
                    {o!.pending_work.length > 0 && ` ${plural(o!.pending_work.length, "tarea pendiente", "tareas pendientes")}.`}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
