import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertActions } from "@/components/alert-actions";
import { Badge, Card, PageHeader, Stat, Trend } from "@/components/ui";
import { INDICATOR_LABEL, describeAlert } from "@/lib/alerts";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMonth, formatScore, formatShortDate, studentName } from "@/lib/format";
import type { Overview } from "@/lib/overview";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";
import { StaffNotes } from "./forms";

const SEVERITY = { minor: "Leve", moderate: "Moderada", serious: "Grave" } as const;
const CASE_STATUS = { open: "Abierto", escalated: "Con dirección", closed: "Cerrado" } as const;

export default async function StaffStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireRole("teacher", "director");
  const supabase = await createClient();
  const today = todayLocal();
  const { data, error } = await supabase.rpc("student_overview", { p_student: id, p_today: today });
  if (error || !data) notFound();
  const o = data as unknown as Overview;

  const [alerts, behavior, observations, notes, cases, guardians] = await Promise.all([
    supabase.from("alerts").select("id, indicator, detail, created_at").eq("student_id", id).eq("status", "open"),
    supabase.from("behavior_reports").select("id, occurred_on, severity, description").eq("student_id", id).order("occurred_on", { ascending: false }).limit(10),
    supabase.from("observations").select("id, body, created_at, profiles:created_by(full_name)").eq("student_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("sensitive_notes").select("id, body, created_at, profiles:created_by(full_name)").eq("student_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("cases").select("id, status, summary, opened_at").eq("student_id", id).order("opened_at", { ascending: false }),
    supabase.from("student_guardians").select("relationship, profiles:guardian_id(full_name)").eq("student_id", id),
  ]);
  // Registro de quién consulta la ficha (bitácora visible para dirección).
  await supabase.rpc("log_student_view", { p_student: id });

  const a = o.attendance;
  return (
    <>
      <PageHeader title={studentName(o.student)} subtitle={[o.group?.label, o.period?.name].filter(Boolean).join(" · ")} back={membership.role === "director" ? "/director" : "/maestro"} />
      <div className="space-y-4">
        {(alerts.data ?? []).map((al) => (
          <Card key={al.id} className="bg-care-soft ring-care/30">
            <div className="flex items-center gap-2">
              <Badge tone="care">{INDICATOR_LABEL[al.indicator]}</Badge>
              <span className="text-sm text-muted">señal interna · desde {formatShortDate(al.created_at.slice(0, 10))}</span>
            </div>
            <p className="mt-2">{describeAlert(al.indicator, al.detail)}</p>
            <AlertActions alertId={al.id} studentFirstName={o.student.first_name} />
          </Card>
        ))}

        <Card>
          <div className="grid grid-cols-3 gap-3">
            <Stat value={a?.absences ?? 0} label="faltas del periodo" />
            <Stat value={a?.lates ?? 0} label="retardos" />
            <Stat value={o.pending_work.length} label="tareas sin entregar (30 días)" />
          </div>
          {a?.last_absence && <p className="mt-3 text-sm text-muted">Última falta: {formatDate(a.last_absence)}</p>}
        </Card>

        <Card>
          <h2 className="font-semibold">Calificaciones</h2>
          {o.grades.length ? (
            <ul className="mt-2 divide-y divide-line">
              {o.grades.map((g) => (
                <li key={g.subject} className="flex items-center justify-between py-2.5">
                  <div>
                    <p>{g.subject}</p>
                    <Trend delta={g.delta} />
                  </div>
                  <span className="num text-xl font-bold">{formatScore(g.score)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">Sin calificaciones capturadas.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Registrar</h2>
          <StaffNotes studentId={id} firstName={o.student.first_name} today={today} />
        </Card>

        {o.goal && (
          <Card>
            <h2 className="font-semibold">Meta que eligió la familia ({formatMonth(o.goal.month)})</h2>
            <p className="mt-1">{o.goal.goal}</p>
            {o.goal.achieved !== null && <Badge tone={o.goal.achieved ? "good" : "muted"}>{o.goal.achieved ? "Cumplida" : "Todavía no"}</Badge>}
          </Card>
        )}

        {(cases.data ?? []).length > 0 && (
          <Card>
            <h2 className="font-semibold">Casos</h2>
            <ul className="mt-2 space-y-2">
              {cases.data!.map((c) => (
                <li key={c.id}>
                  <Link href={`/casos/${c.id}`} className="flex min-h-12 items-center justify-between gap-2 rounded-xl px-3 ring-1 ring-line">
                    <span className="truncate">{c.summary || "Seguimiento"}</span>
                    <Badge tone={c.status === "closed" ? "muted" : "care"}>{CASE_STATUS[c.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <h2 className="font-semibold">Observaciones</h2>
          {(observations.data ?? []).length ? (
            <ul className="mt-2 space-y-3">
              {observations.data!.map((n) => (
                <li key={n.id}>
                  <p>{n.body}</p>
                  <p className="text-sm text-muted">
                    {n.profiles?.full_name} · {formatShortDate(n.created_at.slice(0, 10))}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">Sin observaciones. Una observación concreta al mes hace el resumen mucho más útil para la familia.</p>
          )}
        </Card>

        {(behavior.data ?? []).length > 0 && (
          <Card>
            <h2 className="font-semibold">Reportes de conducta</h2>
            <ul className="mt-2 space-y-3">
              {behavior.data!.map((b) => (
                <li key={b.id}>
                  <p>
                    <Badge tone={b.severity === "minor" ? "muted" : "care"}>{SEVERITY[b.severity]}</Badge> <span className="text-sm text-muted">{formatShortDate(b.occurred_on)}</span>
                  </p>
                  <p className="mt-1">{b.description}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(notes.data ?? []).length > 0 && (
          <Card className="ring-care/40">
            <h2 className="font-semibold">Notas confidenciales</h2>
            <ul className="mt-2 space-y-3">
              {notes.data!.map((n) => (
                <li key={n.id}>
                  <p>{n.body}</p>
                  <p className="text-sm text-muted">
                    {n.profiles?.full_name} · {formatShortDate(n.created_at.slice(0, 10))}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <h2 className="font-semibold">Familia</h2>
          {(guardians.data ?? []).length ? (
            <ul className="mt-2 space-y-1">
              {guardians.data!.map((g, i) => (
                <li key={i}>
                  {g.profiles?.full_name || "Sin nombre"} <span className="text-muted">· {g.relationship}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">Ningún familiar ha activado su cuenta todavía.</p>
          )}
        </Card>
      </div>
    </>
  );
}
