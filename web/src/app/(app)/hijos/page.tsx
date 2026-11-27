import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, CardTitle, Empty, cx } from "@/components/ui";
import { WeekStrip } from "@/components/week-strip";
import { requireRole } from "@/lib/auth";
import { KIND_LABEL, NO_CLASS } from "@/lib/calendar/kinds";
import { firstName, formatDate, formatMoney, formatScore, formatShortDate, plural } from "@/lib/format";
import type { Overview } from "@/lib/overview";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayLocal } from "@/lib/time";
import { balance } from "@/lib/tuition";

export const metadata = { title: "Mis hijos" };

export default async function ChildrenPage() {
  const { session } = await requireRole("guardian");
  const supabase = await createClient();
  const { data: links } = await supabase.from("student_guardians").select("student_id").eq("guardian_id", session.userId);
  const ids = (links ?? []).map((l) => l.student_id);
  if (ids.length === 1) redirect(`/hijos/${ids[0]}`);

  const today = todayLocal();
  const [overviews, { data: events }, { data: charges }] = await Promise.all([
    Promise.all(ids.map(async (id) => (await supabase.rpc("student_overview", { p_student: id, p_today: today })).data as unknown as Overview | null)),
    supabase.from("calendar_events").select("id, title, kind, starts_on, group_id, groups(grade, name)").gte("ends_on", today).lte("starts_on", addDays(today, 21)).order("starts_on").limit(8),
    supabase.from("tuition_charges").select("student_id, concept, amount, paid, due_on"),
  ]);
  const kids = overviews.filter((o): o is Overview => Boolean(o));
  const all = (charges ?? []).map((c) => ({ ...c, amount: Number(c.amount), paid: Number(c.paid) }));
  const fam = balance(all, today);

  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-muted first-letter:uppercase">{formatDate(today)}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hola, {firstName(session.fullName) || "bienvenido"}</h1>
        <p className="text-muted">Toque a su hijo o hija para ver todo el detalle.</p>
      </div>
      {ids.length === 0 ? (
        <Empty title="Todavía no hay alumnos ligados a su cuenta">Si ya aceptó la invitación de la escuela, pida en dirección que revisen su registro.</Empty>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <ul className="grid items-start gap-4 lg:col-span-2 xl:grid-cols-2">
            {kids.map((o) => {
              const a = o.attendance;
              const attPct = a && a.days > 0 ? Math.round((100 * (a.days - a.absences)) / a.days) : null;
              const avg = o.grades.length ? o.grades.reduce((t, g) => t + Number(g.score), 0) / o.grades.length : null;
              const pend = o.week.pending.reduce((t, p) => t + p.count, 0);
              const recs = o.recognitions.filter((r) => r.date >= o.week.start).length;
              const next = (events ?? []).find((e) => !e.group_id || e.group_id === o.group?.id);
              const b = balance(all.filter((c) => c.student_id === o.student.id), today);
              return (
                <li key={o.student.id}>
                  <Link href={`/hijos/${o.student.id}`} className="block h-full">
                    <Card className="h-full transition hover:ring-brand">
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="text-xl font-bold">{o.student.first_name}</h2>
                        <span className="text-muted">{o.group?.label}</span>
                      </div>
                      <div className="mt-3">
                        <WeekStrip days={o.week.days} today={today} />
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#f6f3ee] p-3 text-center sm:grid-cols-4 xl:grid-cols-2">
                        <div>
                          <dt className="text-xs text-muted">Asistencia</dt>
                          <dd className="num text-lg font-bold">{attPct === null ? "—" : `${attPct}%`}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Promedio</dt>
                          <dd className="num text-lg font-bold">{avg === null ? "—" : formatScore(avg)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Pendientes</dt>
                          <dd className={cx("num text-lg font-bold", pend > 0 && "text-care")}>{pend}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">Reconocimientos</dt>
                          <dd className="num text-lg font-bold">{recs}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-sm text-muted">
                        {a && a.days > 0 ? (a.absences === 0 ? `Sin faltas en el ${o.period?.name ?? "periodo"}.` : `${plural(a.absences, "falta", "faltas")} en el ${o.period?.name ?? "periodo"}.`) : "Aún no hay asistencia registrada."}
                        {next && ` Próximo: ${next.title} (${formatShortDate(next.starts_on)}).`}
                      </p>
                      {all.some((c) => c.student_id === o.student.id) && (
                        <div className="mt-2">{b.overdueCount === 0 ? <Badge tone="good">Pagos al corriente</Badge> : <Badge tone="care">{plural(b.overdueCount, "pago pendiente", "pagos pendientes")}</Badge>}</div>
                      )}
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="space-y-4">
            <Card>
              <CardTitle href="/calendario" linkText="Calendario">
                Próximas fechas
              </CardTitle>
              {events?.length ? (
                <ul className="space-y-2 text-sm">
                  {events.slice(0, 6).map((e) => (
                    <li key={e.id} className="flex gap-3">
                      <span className={cx("num w-14 shrink-0 rounded-lg py-0.5 text-center font-semibold", NO_CLASS.includes(e.kind) ? "bg-care-soft" : "bg-brand-soft")}>{formatShortDate(e.starts_on).replace(/\.$/, "")}</span>
                      <span>
                        {e.title}
                        <span className="block text-xs text-muted">
                          {KIND_LABEL[e.kind]}
                          {e.groups && ` · ${e.groups.grade}°${e.groups.name}`}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nada en las próximas semanas.</p>
              )}
            </Card>
            {all.length > 0 && (
              <Card>
                <CardTitle href="/pagos" linkText="Estado de cuenta">
                  Colegiaturas
                </CardTitle>
                {fam.overdueCount === 0 ? <Badge tone="good">Al corriente</Badge> : <p>Saldo pendiente: <strong className="num">{formatMoney(fam.overdueAmount)}</strong></p>}
                {fam.next && (
                  <p className="mt-2 text-sm text-muted">
                    Siguiente pago: {fam.next.concept} · vence el {formatShortDate(fam.next.due_on)}
                  </p>
                )}
              </Card>
            )}
            <Card>
              <CardTitle href="/horario" linkText="Ver">
                Horario de la semana
              </CardTitle>
              <p className="text-sm text-muted">La semana completa de cada hijo en una sola tabla, para preparar la mochila.</p>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
