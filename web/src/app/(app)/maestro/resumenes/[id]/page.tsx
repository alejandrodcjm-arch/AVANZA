import { notFound } from "next/navigation";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { snapshotSchema } from "@/lib/ai/snapshot";
import { requireRole } from "@/lib/auth";
import { formatMonth, formatScore } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";

export const metadata = { title: "Revisar resumen" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("teacher", "director");
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("monthly_summaries")
    .select("id, month, status, final_text, student_id, students(first_name, last_name), summary_drafts(draft_text, data_snapshot, validation_errors)")
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();
  const draft = s.summary_drafts;
  const snapshot = snapshotSchema.parse(draft?.data_snapshot);
  const { data: nextRow } = await supabase.from("monthly_summaries").select("id").eq("month", s.month).neq("status", "approved").neq("id", id).limit(1).maybeSingle();

  const a = snapshot.attendance;
  return (
    <>
      <PageHeader title={`${s.students?.first_name} ${s.students?.last_name}`} subtitle={`Resumen de ${formatMonth(s.month)}`} back="/maestro/resumenes" />
      <div className="space-y-4">
        <Card>
          <h2 className="font-semibold">Datos del mes (lo único que vio la IA)</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat value={a.month_absences} label="faltas del mes" />
            <Stat value={a.month_lates} label="retardos" />
            <Stat value={a.period_absences} label="faltas del periodo" />
          </div>
          {snapshot.grades.length > 0 && (
            <ul className="mt-3 space-y-1">
              {snapshot.grades.map((g) => (
                <li key={g.subject} className="flex justify-between gap-2">
                  <span>{g.subject}</span>
                  <span className="num">
                    {g.previous !== null && <span className="text-muted">{formatScore(g.previous)} → </span>}
                    <strong>{formatScore(g.score)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {snapshot.missed_assignments.map((m) => (
              <Badge key={m.subject} tone="care">
                {m.count} sin entregar · {m.subject}
              </Badge>
            ))}
            {snapshot.behavior_reports > 0 && <Badge tone="care">{snapshot.behavior_reports} reportes de conducta</Badge>}
            {snapshot.monthly_goal && <Badge>Meta: {snapshot.monthly_goal.goal}</Badge>}
          </div>
          {snapshot.teacher_observations.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-ink/85">
              {snapshot.teacher_observations.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{s.status === "approved" ? "Enviado a la familia" : "Borrador"}</h2>
            {s.status !== "approved" && <span className="text-sm text-muted">Edítelo con libertad: usted firma.</span>}
          </div>
          <ReviewForm
            summaryId={s.id}
            nextId={nextRow?.id ?? null}
            initialText={s.status === "approved" ? (s.final_text ?? "") : (draft?.draft_text ?? "")}
            snapshot={snapshot}
            approved={s.status === "approved"}
            aiErrors={(draft?.validation_errors as string[] | null) ?? []}
          />
        </Card>
      </div>
    </>
  );
}
