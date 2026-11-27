import Link from "next/link";
import { AlertActions } from "./alert-actions";
import { Badge, Card, Empty } from "./ui";
import { INDICATOR_LABEL, describeAlert } from "@/lib/alerts";
import { formatShortDate } from "@/lib/format";
import type { ServerClient } from "@/lib/supabase/server";

/** Alumnos con señales abiertas, agrupados por alumno (una tarjeta por niño, no por alerta). */
export async function AlertsList({ supabase }: { supabase: ServerClient }) {
  const { data } = await supabase
    .from("alerts")
    .select("id, indicator, detail, created_at, student_id, students(first_name, last_name, enrollments(groups(grade, name)))")
    .eq("status", "open")
    .order("created_at", { ascending: true });
  const byStudent = new Map<string, NonNullable<typeof data>>();
  for (const a of data ?? []) byStudent.set(a.student_id, [...(byStudent.get(a.student_id) ?? []), a]);

  if (!byStudent.size) return <Empty title="Nadie requiere atención especial hoy">Las señales se revisan cada mañana con la asistencia, las tareas, la conducta y las calificaciones.</Empty>;

  return (
    <ul className="space-y-3">
      {[...byStudent.entries()].map(([sid, list]) => {
        const st = list[0].students;
        const g = st?.enrollments?.[0]?.groups;
        return (
          <li key={sid}>
            <Card>
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/alumnos/${sid}`} className="text-lg font-semibold text-brand underline">
                  {st?.first_name} {st?.last_name}
                </Link>
                {g && <span className="text-sm text-muted">{`${g.grade}°${g.name}`}</span>}
              </div>
              <ul className="mt-2 space-y-3">
                {list.map((a) => (
                  <li key={a.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                    <div className="flex items-center gap-2">
                      <Badge tone="care">{INDICATOR_LABEL[a.indicator]}</Badge>
                      <span className="text-sm text-muted">desde {formatShortDate(a.created_at.slice(0, 10))}</span>
                    </div>
                    <p className="mt-1">{describeAlert(a.indicator, a.detail)}</p>
                    <AlertActions alertId={a.id} studentFirstName={st?.first_name ?? ""} />
                  </li>
                ))}
              </ul>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
