import { Badge, Card, Empty } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { CATEGORY_LABEL, LOCATION_LABEL, RECOGNITION, SEVERITY_LABEL } from "@/lib/convivencia";
import { formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { groupStudents, pickList, teacherGroups } from "@/lib/teacher";
import { addDays, todayLocal } from "@/lib/time";
import { ConductPanel } from "./forms";

export const metadata = { title: "Conducta" };

export default async function ConductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await requireRole("teacher");
  const supabase = await createClient();
  const group = (await teacherGroups(supabase, session.userId)).find((g) => g.id === id);
  if (!group) return <Empty title="No da clase a este grupo" />;
  const students = await groupStudents(supabase, id);
  const ids = students.map((s) => s.id);
  const today = todayLocal();
  const since = addDays(today, -30);
  const [{ data: reports }, { data: recs }, mine, myRecs] = await Promise.all([
    supabase.from("behavior_reports").select("id, occurred_on, severity, involvement, student_id, incidents(category, location, occurred_time)").in("student_id", ids).gte("occurred_on", since).order("occurred_on", { ascending: false }).limit(20),
    supabase.from("recognitions").select("id, category, student_id, created_at").in("student_id", ids).gte("created_at", since).order("created_at", { ascending: false }).limit(20),
    supabase.from("incidents").select("id", { count: "exact", head: true }).eq("reported_by", session.userId).gte("occurred_on", since),
    supabase.from("recognitions").select("id", { count: "exact", head: true }).eq("created_by", session.userId).gte("created_at", since),
  ]);
  const name = new Map(students.map((s) => [s.id, `${s.first_name} ${s.last_name}`]));
  const nowTime = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit" }).format(new Date());
  const ratio = (mine.count ?? 0) > 0 ? ((myRecs.count ?? 0) / (mine.count ?? 1)).toFixed(1) : null;

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Sus últimos 30 días</p>
          <p className="text-sm text-muted">
            {myRecs.count ?? 0} reconocimientos · {mine.count ?? 0} incidencias{ratio ? ` · ${ratio} a 1` : ""}
          </p>
        </div>
        <Badge tone={ratio === null || Number(ratio) >= 4 ? "good" : "care"}>Meta: 4 a 1</Badge>
      </Card>
      <Card>
        <ConductPanel groupId={id} students={pickList(students)} today={today} nowTime={nowTime} />
      </Card>
      <Card>
        <h2 className="font-semibold">Últimos 30 días en el grupo</h2>
        {!reports?.length && !recs?.length ? (
          <p className="mt-2 text-muted">Sin registros.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {[
              ...(reports ?? []).map((r) => ({ key: r.id, date: r.occurred_on, el: (
                <>
                  <Badge tone={r.involvement === "afectado" ? "muted" : r.severity === "minor" ? "neutral" : "care"}>{r.involvement === "afectado" ? "Afectado" : SEVERITY_LABEL[r.severity]}</Badge>{" "}
                  <strong>{name.get(r.student_id)}</strong> · {r.incidents ? `${CATEGORY_LABEL[r.incidents.category]}, ${LOCATION_LABEL[r.incidents.location].toLowerCase()}` : "Reporte"}
                </>
              ) })),
              ...(recs ?? []).map((r) => ({ key: r.id, date: r.created_at.slice(0, 10), el: (
                <>
                  <Badge tone="good">⭐ {RECOGNITION.find((x) => x.key === r.category)?.label}</Badge> <strong>{name.get(r.student_id)}</strong>
                </>
              ) })),
            ]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 25)
              .map((x) => (
                <li key={x.key} className="flex items-start justify-between gap-2 py-2 text-sm">
                  <span>{x.el}</span>
                  <span className="shrink-0 text-muted">{formatShortDate(x.date)}</span>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
