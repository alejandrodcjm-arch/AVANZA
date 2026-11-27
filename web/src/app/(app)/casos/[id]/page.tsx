import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { ACTION_LABEL, INDICATOR_LABEL, describeAlert } from "@/lib/alerts";
import { requireRole } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";
import { escalate } from "../actions";
import { AddActionForm, CloseCaseForm, CompleteActionForm } from "./forms";

const STATUS = { open: "Abierto", escalated: "Con dirección", closed: "Cerrado" } as const;

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireRole("teacher", "director");
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("cases")
    .select("id, status, summary, outcome, opened_at, closed_at, student_id, students(first_name, last_name), owner:owner_id(full_name), alerts(indicator, detail), case_actions(id, action_type, description, due_on, status, result, done_at)")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();
  const today = todayLocal();
  const actions = [...(c.case_actions ?? [])].sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1));

  return (
    <>
      <PageHeader
        title={`${c.students?.first_name} ${c.students?.last_name}`}
        subtitle={`Caso abierto el ${formatShortDate(c.opened_at.slice(0, 10))} · a cargo de ${c.owner?.full_name ?? "—"}`}
        back={membership.role === "director" ? "/director/casos" : `/alumnos/${c.student_id}`}
        action={<Badge tone={c.status === "closed" ? "muted" : "care"}>{STATUS[c.status]}</Badge>}
      />
      <div className="space-y-4">
        <Card>
          {c.alerts && (
            <p className="text-sm text-muted">
              Empezó por: {INDICATOR_LABEL[c.alerts.indicator]} — {describeAlert(c.alerts.indicator, c.alerts.detail)}
            </p>
          )}
          {c.summary && <p className="mt-2">{c.summary}</p>}
          <Link href={`/alumnos/${c.student_id}`} className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-brand underline">
            Ver ficha del alumno
          </Link>
        </Card>

        <Card>
          <h2 className="font-semibold">Acciones</h2>
          {actions.length ? (
            <ul className="mt-2 divide-y divide-line">
              {actions.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{ACTION_LABEL[a.action_type] ?? a.action_type}</span>
                    {a.status === "done" ? (
                      <Badge tone="good">Hecha</Badge>
                    ) : a.due_on && a.due_on < today ? (
                      <Badge tone="care">Vencida {formatShortDate(a.due_on)}</Badge>
                    ) : a.due_on ? (
                      <Badge>Para {formatShortDate(a.due_on)}</Badge>
                    ) : null}
                  </div>
                  <p className="text-ink/85">{a.description}</p>
                  {a.result && <p className="mt-1 text-sm text-muted">Resultado: {a.result}</p>}
                  {a.status === "pending" && c.status !== "closed" && <CompleteActionForm caseId={c.id} actionId={a.id} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">Sin acciones todavía. Lo más efectivo suele ser una plática temprana con la familia.</p>
          )}
          {c.status !== "closed" && (
            <div className="mt-4 border-t border-line pt-4">
              <AddActionForm caseId={c.id} />
            </div>
          )}
        </Card>

        {c.status === "closed" ? (
          <Card>
            <h2 className="font-semibold">Cierre</h2>
            <p className="mt-1">{c.outcome}</p>
          </Card>
        ) : (
          <Card>
            {c.status === "open" && membership.role === "teacher" && (
              <form action={escalate.bind(null, c.id)} className="mb-4">
                <Button variant="secondary">Pasar a dirección</Button>
              </form>
            )}
            <CloseCaseForm caseId={c.id} />
          </Card>
        )}
      </div>
    </>
  );
}
