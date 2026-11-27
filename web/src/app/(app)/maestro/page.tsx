import Link from "next/link";
import { Meter } from "@/components/charts";
import { ButtonLink, Card, CardTitle, Empty, Kpi, cx } from "@/components/ui";
import { WeekTable } from "@/components/week-table";
import { requireRole } from "@/lib/auth";
import { describeAlert, INDICATOR_LABEL } from "@/lib/alerts";
import { KIND_LABEL, NO_CLASS } from "@/lib/calendar/kinds";
import { firstName, formatDate, formatShortDate, plural } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { teacherGroups, weekStart } from "@/lib/teacher";
import { addDays, isoWeekday, isWeekday, todayLocal } from "@/lib/time";

export const metadata = { title: "Mi semana" };

function Check({ done, children, href }: { done: boolean; children: React.ReactNode; href: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-10 items-center gap-3">
        <span aria-hidden className={cx("flex size-6 shrink-0 items-center justify-center rounded-full text-sm", done ? "bg-good text-white" : "ring-2 ring-line")}>
          {done ? "✓" : ""}
        </span>
        <span className={done ? "text-muted" : "font-medium"}>{children}</span>
        <span className="sr-only">{done ? "(hecho)" : "(pendiente)"}</span>
      </Link>
    </li>
  );
}

export default async function TeacherHome() {
  const { session } = await requireRole("teacher");
  const supabase = await createClient();
  const today = todayLocal();
  const week = weekStart(today);
  const groups = await teacherGroups(supabase, session.userId);
  const gids = groups.length ? groups.map((g) => g.id) : ["00000000-0000-0000-0000-000000000000"];

  const [attendance, cuts, pending, recs, incs, alerts, summaries, enroll, blocks, upcoming] = await Promise.all([
    supabase.from("attendance").select("group_id, date, status, student_id").in("group_id", gids).gte("date", week).lte("date", today).limit(5000),
    supabase.from("weekly_pending").select("subject_id, student_id").eq("week_start", week).eq("recorded_by", session.userId),
    supabase.from("weekly_pending").select("student_id, pending_count, subjects(name)").eq("week_start", week).gt("pending_count", 0).limit(5000),
    supabase.from("recognitions").select("id", { count: "exact", head: true }).eq("created_by", session.userId).gte("created_at", week),
    supabase.from("incidents").select("id", { count: "exact", head: true }).eq("reported_by", session.userId).gte("occurred_on", week),
    supabase.from("alerts").select("id, indicator, detail, student_id, students(first_name, last_name)").eq("status", "open").order("created_at").limit(30),
    supabase.from("monthly_summaries").select("id", { count: "exact", head: true }).neq("status", "approved"),
    supabase.from("enrollments").select("group_id, student_id, students(first_name, last_name)").in("group_id", gids),
    supabase.from("schedule_blocks").select("id, group_id, subject_id, weekday, starts_at, ends_at, room, subjects(name)").in("group_id", gids),
    supabase.from("calendar_events").select("id, title, starts_on, kind, groups(grade, name)").gte("ends_on", today).lte("starts_on", addDays(today, 14)).order("starts_on").limit(6),
  ]);

  const mine = new Set(groups.flatMap((g) => g.subjects.map((s) => `${g.id}:${s.id}`)));
  const label = new Map(groups.map((g) => [g.id, g.label]));
  const myBlocks = (blocks.data ?? []).filter((b) => b.subject_id && mine.has(`${b.group_id}:${b.subject_id}`));
  const classesToday = myBlocks.filter((b) => b.weekday === isoWeekday(today)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const studentGroup = new Map((enroll.data ?? []).map((e) => [e.student_id, e.group_id]));
  const nameOf = new Map((enroll.data ?? []).map((e) => [e.student_id, `${e.students?.first_name ?? ""} ${e.students?.last_name ?? ""}`.trim()]));
  const count = new Map<string, number>();
  for (const e of enroll.data ?? []) count.set(e.group_id, (count.get(e.group_id) ?? 0) + 1);
  const att = attendance.data ?? [];
  const takenToday = new Set(att.filter((a) => a.date === today).map((a) => a.group_id));
  const weekdaysSoFar = [0, 1, 2, 3, 4].map((k) => addDays(week, k)).filter((d) => d <= today).length;
  const daysTaken = (gid: string) => new Set(att.filter((a) => a.group_id === gid).map((a) => a.date)).size;
  const cutDone = (gid: string, sid: string) => (cuts.data ?? []).some((c) => c.subject_id === sid && studentGroup.get(c.student_id) === gid);
  const rate = (rows: typeof att) => (rows.length ? (100 * rows.filter((a) => a.status !== "absent").length) / rows.length : null);
  const weekRate = rate(att);
  const absentToday = att.filter((a) => a.date === today && a.status === "absent");
  const pend = (pending.data ?? []).filter((p) => studentGroup.has(p.student_id));
  const pendStudents = new Set(pend.map((p) => p.student_id)).size;
  const recN = recs.count ?? 0;
  const incN = incs.count ?? 0;

  const tasks = groups.flatMap((g) => [...(isWeekday(today) ? [takenToday.has(g.id)] : []), ...g.subjects.map((s) => cutDone(g.id, s.id))]);
  const tasksDone = tasks.filter(Boolean).length;

  const byStudent = new Map<string, string[]>();
  for (const a of alerts.data ?? []) {
    if (!studentGroup.has(a.student_id)) continue;
    byStudent.set(a.student_id, [...(byStudent.get(a.student_id) ?? []), `${INDICATOR_LABEL[a.indicator]}: ${describeAlert(a.indicator, a.detail)}`]);
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted first-letter:uppercase">{formatDate(today)}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hola, {firstName(session.fullName) || "maestra/o"}</h1>
          <p className="text-muted">{groups.map((g) => g.label).join(" · ")}</p>
        </div>
        {tasks.length > 0 && (
          <div className="w-full max-w-xs">
            <Meter label="Tareas de la semana" value={tasksDone} max={tasks.length} detail={`${tasksDone} de ${tasks.length}: listas de hoy y cortes de pendientes`} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Asistencia esta semana" value={weekRate === null ? "—" : `${weekRate.toFixed(1)}%`} sub={isWeekday(today) ? `${absentToday.length} faltas hoy` : "En sus grupos"} />
        <Kpi label="Con trabajos pendientes" value={pendStudents} sub="alumnos en el corte de esta semana" tone={pendStudents ? "care" : undefined} />
        <Kpi label="Reconocimientos / reportes" value={`${recN} / ${incN}`} sub="Meta: 4 reconocimientos por cada reporte" tone={incN === 0 || recN / incN >= 4 ? "good" : undefined} />
        <Kpi label="Señales de apoyo" value={byStudent.size} sub="alumnos de sus grupos" tone={byStudent.size ? "care" : undefined} href="/maestro/alertas" />
        <Kpi label="Resúmenes por revisar" value={summaries.count ?? 0} sub="unos 30 segundos cada uno" href="/maestro/resumenes" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {groups.length === 0 ? (
            <Empty title="Aún no tiene grupos asignados">Dirección le asigna sus grupos y materias en Escuela › Grupos.</Empty>
          ) : (
            <div className={cx("grid gap-4", groups.length > 1 && "xl:grid-cols-2")}>
              {groups.map((g) => {
                const gAtt = att.filter((a) => a.group_id === g.id);
                const gRate = rate(gAtt);
                const gAbs = gAtt.filter((a) => a.date === today && a.status === "absent");
                const gPend = new Set(pend.filter((p) => studentGroup.get(p.student_id) === g.id).map((p) => p.student_id)).size;
                return (
                  <Card key={g.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-xl font-bold">
                        <Link href={`/maestro/grupos/${g.id}`} className="text-ink">
                          {g.label}
                        </Link>
                      </h2>
                      <span className="text-sm text-muted">{count.get(g.id) ?? 0} alumnos</span>
                    </div>
                    <p className="text-sm text-muted">{g.subjects.map((s) => s.name).join(" · ")}</p>

                    <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#f6f3ee] p-3 text-center">
                      <div>
                        <dt className="text-xs text-muted">Asistencia</dt>
                        <dd className="num text-lg font-bold">{gRate === null ? "—" : `${Math.round(gRate)}%`}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Faltas hoy</dt>
                        <dd className="num text-lg font-bold">{takenToday.has(g.id) ? gAbs.length : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Con pendientes</dt>
                        <dd className={cx("num text-lg font-bold", gPend > 0 && "text-care")}>{gPend}</dd>
                      </div>
                    </dl>
                    {gAbs.length > 0 && <p className="mt-2 text-sm text-muted">Faltaron hoy: {gAbs.map((a) => nameOf.get(a.student_id)).join(", ")}</p>}

                    <ul className="mt-2 space-y-0.5">
                      {isWeekday(today) && (
                        <Check done={takenToday.has(g.id)} href={`/maestro/grupos/${g.id}/lista`}>
                          Lista de hoy
                        </Check>
                      )}
                      <Check done={daysTaken(g.id) >= weekdaysSoFar} href={`/maestro/grupos/${g.id}/lista`}>
                        Lista de la semana ({daysTaken(g.id)} de {weekdaysSoFar} días)
                      </Check>
                      {g.subjects.map((s) => (
                        <Check key={s.id} done={cutDone(g.id, s.id)} href={`/maestro/grupos/${g.id}/pendientes?materia=${s.id}`}>
                          Corte de pendientes · {s.name}
                        </Check>
                      ))}
                    </ul>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <ButtonLink href={`/maestro/grupos/${g.id}/lista`} variant={takenToday.has(g.id) ? "secondary" : "primary"}>
                        Pasar lista
                      </ButtonLink>
                      <ButtonLink href={`/maestro/grupos/${g.id}/pendientes`} variant="secondary">
                        Pendientes
                      </ButtonLink>
                      <ButtonLink href={`/maestro/grupos/${g.id}/conducta`} variant="secondary">
                        Conducta
                      </ButtonLink>
                      <ButtonLink href={`/maestro/grupos/${g.id}/calificaciones`} variant="secondary">
                        Calificaciones
                      </ButtonLink>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card>
            <CardTitle href="/horario" linkText="Semana completa">
              {isWeekday(today) ? "Mis clases de hoy" : "Hoy no hay clases"}
            </CardTitle>
            {classesToday.length ? (
              <ol className="space-y-1.5 text-sm">
                {classesToday.map((b) => (
                  <li key={b.id} className="flex gap-3">
                    <span className="num w-24 shrink-0 text-muted">
                      {b.starts_at.slice(0, 5)}–{b.ends_at.slice(0, 5)}
                    </span>
                    <span>
                      <strong>{label.get(b.group_id)}</strong> · {b.subjects?.name}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">{isWeekday(today) ? "Dirección aún no carga su horario." : "Disfrute su fin de semana."}</p>
            )}
          </Card>

          <Card>
            <CardTitle href="/calendario" linkText="Calendario">
              Próximas 2 semanas
            </CardTitle>
            {upcoming.data?.length ? (
              <ul className="space-y-2 text-sm">
                {upcoming.data.map((e) => (
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
              <p className="text-sm text-muted">Nada agendado.</p>
            )}
          </Card>

          <Card>
            <CardTitle href="/maestro/alertas" linkText="Todas">
              Alumnos que podrían necesitar apoyo
            </CardTitle>
            {byStudent.size ? (
              <ul className="divide-y divide-line">
                {[...byStudent.entries()].slice(0, 5).map(([id, items]) => (
                  <li key={id} className="py-2">
                    <Link href={`/alumnos/${id}`} className="font-medium text-brand hover:underline">
                      {nameOf.get(id)}
                    </Link>
                    <span className="text-sm text-muted"> · {label.get(studentGroup.get(id)!)}</span>
                    <p className="text-sm text-muted">{items[0]}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nadie con señales abiertas.</p>
            )}
            {pend.length > 0 && (
              <p className="mt-3 text-sm text-muted">
                Pendientes esta semana: {plural(pend.reduce((t, p) => t + p.pending_count, 0), "trabajo", "trabajos")} de {plural(pendStudents, "alumno", "alumnos")}.
              </p>
            )}
          </Card>
        </div>

        {myBlocks.length > 0 && (
          <Card className="lg:col-span-12">
            <CardTitle href="/horario" linkText="Imprimir">
              Mi semana
            </CardTitle>
            <WeekTable
              compact
              todayWeekday={isoWeekday(today)}
              blocks={myBlocks.map((b) => ({ id: b.id, weekday: b.weekday, starts_at: b.starts_at, ends_at: b.ends_at, title: b.subjects?.name ?? "", sub: label.get(b.group_id), isSubject: true, colorKey: b.subject_id }))}
            />
          </Card>
        )}
      </div>
    </>
  );
}
