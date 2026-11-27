import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Badge, Button, Card, Empty, Field, Input, PageHeader, Select, Textarea, cx } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { DIRECTOR_KINDS, KIND_LABEL, NO_CLASS, TEACHER_KINDS, type EventKind } from "@/lib/calendar/kinds";
import { googleEventUrl, subscribeLinks } from "@/lib/calendar/links";
import { env } from "@/lib/env";
import { formatMonth } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { teacherGroups } from "@/lib/teacher";
import { addDays, todayLocal } from "@/lib/time";
import { createEvent, deleteEvent, loadSep } from "./actions";
import { AnnounceButton } from "./announce-button";
import { SubscribeCard } from "./subscribe";

export const metadata = { title: "Calendario" };

const dayFmt = new Intl.DateTimeFormat("es-MX", { weekday: "short", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
const at = (d: string) => new Date(`${d}T12:00:00Z`);

type Item = {
  id: string;
  kind: EventKind;
  title: string;
  description: string | null;
  starts_on: string;
  ends_on: string;
  start_time: string | null;
  end_time: string | null;
  group: string | null;
  canEdit: boolean;
  announced: boolean;
  staffOnly: boolean;
  isPayment?: boolean;
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const session = await getSession();
  if (!session?.active) redirect("/entrar");
  const { role, schoolId, schoolName } = session.active;
  const supabase = await createClient();
  const today = todayLocal();
  const all = (await searchParams).ver === "todo";

  const { data: year } = await supabase.from("school_years").select("starts_on, ends_on").eq("school_id", schoolId).eq("is_current", true).maybeSingle();
  const from = all ? (year?.starts_on ?? addDays(today, -200)) : today;
  const to = all ? (year?.ends_on ?? addDays(today, 365)) : addDays(today, 120);

  const groups = role === "teacher" ? await teacherGroups(supabase, session.userId) : [];
  const [{ data: events }, { data: allGroups }, { data: feed }, payments] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, kind, title, description, starts_on, ends_on, start_time, end_time, staff_only, source, created_by, announced_at, group_id, groups(grade, name)")
      .eq("school_id", schoolId)
      .gte("ends_on", from)
      .lte("starts_on", to)
      .order("starts_on")
      .order("start_time", { nullsFirst: true }),
    role === "director"
      ? supabase.from("groups").select("id, grade, name, school_years!inner(is_current)").eq("school_id", schoolId).eq("school_years.is_current", true).order("grade").order("name")
      : Promise.resolve({ data: null }),
    supabase.from("calendar_feeds").select("token").eq("user_id", session.userId).maybeSingle(),
    role === "guardian"
      ? supabase.from("tuition_charges").select("id, concept, due_on, amount, paid, students(first_name)").eq("school_id", schoolId).gte("due_on", from).lte("due_on", to)
      : Promise.resolve({ data: null }),
  ]);

  const items: Item[] = (events ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    title: e.title,
    description: e.description,
    starts_on: e.starts_on,
    ends_on: e.ends_on,
    start_time: e.start_time,
    end_time: e.end_time,
    group: e.groups ? `${e.groups.grade}°${e.groups.name}` : null,
    canEdit: role === "director" || (role === "teacher" && e.created_by === session.userId),
    announced: Boolean(e.announced_at),
    staffOnly: e.staff_only,
  }));
  for (const p of payments.data ?? []) {
    if (Number(p.paid) >= Number(p.amount)) continue;
    items.push({ id: `pago-${p.id}`, kind: "pago", title: `Fecha de pago: ${p.concept}`, description: null, starts_on: p.due_on, ends_on: p.due_on, start_time: null, end_time: null, group: p.students?.first_name ?? null, canEdit: false, announced: true, staffOnly: false, isPayment: true });
  }
  items.sort((a, b) => a.starts_on.localeCompare(b.starts_on) || (a.start_time ?? "").localeCompare(b.start_time ?? ""));

  const months = new Map<string, Item[]>();
  for (const it of items) {
    const key = (it.starts_on < from ? from : it.starts_on).slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), it]);
  }
  const nextNoClass = items.find((i) => NO_CLASS.includes(i.kind) && i.ends_on >= today);
  const hasSep = (events ?? []).some((e) => e.source === "sep") || all;
  const base = env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const links = feed?.token ? subscribeLinks(`${base}/api/calendario/${feed.token}.ics`, schoolName) : null;
  const groupOptions =
    role === "director" ? (allGroups ?? []).map((g) => ({ id: g.id, label: `${g.grade}°${g.name}` })) : groups.map((g) => ({ id: g.id, label: g.label }));
  const kinds = role === "director" ? DIRECTOR_KINDS : TEACHER_KINDS;

  return (
    <>
      <PageHeader
        title="Calendario"
        subtitle={all ? "Todo el ciclo escolar." : "Lo que viene en los próximos meses."}
        action={
          <Link href={all ? "/calendario" : "/calendario?ver=todo"} className="min-h-10 content-center text-sm text-brand underline">
            {all ? "Solo lo próximo" : "Ver todo el ciclo"}
          </Link>
        }
      />

      <div className="space-y-4">
        {nextNoClass && !all && (
          <Card className="bg-care-soft">
            <p className="text-sm text-[#6b450d]">Próximo día sin clases</p>
            <p className="text-lg font-semibold">
              {shortFmt.format(at(nextNoClass.starts_on))}
              {nextNoClass.ends_on > nextNoClass.starts_on && ` al ${shortFmt.format(at(nextNoClass.ends_on))}`} · {nextNoClass.title.replace(/^Sin clases: /, "")}
            </p>
          </Card>
        )}

        {role === "director" && !hasSep && (
          <Card className="space-y-2">
            <p className="font-semibold">Calendario oficial SEP 2026-2027</p>
            <p className="text-muted">Días sin clases, Consejo Técnico, vacaciones y registro de calificaciones. Después puede borrar o ajustar lo que su escuela haga distinto.</p>
            <form action={loadSep}>
              <Button>Cargar fechas oficiales</Button>
            </form>
          </Card>
        )}

        {items.length === 0 ? (
          <Empty title="No hay fechas en este periodo">{role === "director" ? "Agregue eventos abajo o cargue el calendario oficial." : "Cuando la escuela agende algo, aparecerá aquí."}</Empty>
        ) : (
          [...months].map(([month, list]) => (
            <section key={month} aria-label={formatMonth(`${month}-01`)}>
              <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">{formatMonth(`${month}-01`)}</h2>
              <Card className="p-0">
                <ul className="divide-y divide-line">
                  {list.map((e) => {
                    const past = e.ends_on < today;
                    return (
                      <li key={e.id} className={cx("flex gap-3 px-4 py-3", past && "opacity-60")}>
                        <div className={cx("w-12 shrink-0 rounded-lg py-1 text-center", NO_CLASS.includes(e.kind) ? "bg-care-soft" : "bg-brand-soft")}>
                          <div className="text-xs text-muted capitalize">{dayFmt.format(at(e.starts_on)).replace(".", "")}</div>
                          <div className="num text-xl leading-6 font-bold">{at(e.starts_on).getUTCDate()}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{e.title}</p>
                          <p className="text-sm text-muted">
                            {e.ends_on > e.starts_on && `Hasta el ${shortFmt.format(at(e.ends_on))}. `}
                            {e.start_time && `${e.start_time.slice(0, 5)}${e.end_time ? `–${e.end_time.slice(0, 5)}` : ""} h. `}
                            {e.description}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <Badge tone={NO_CLASS.includes(e.kind) ? "care" : "muted"}>{KIND_LABEL[e.kind]}</Badge>
                            {e.group && <span className="text-sm text-muted">{e.group}</span>}
                            {e.staffOnly && <span className="text-sm text-muted">Solo personal</span>}
                            {!past && !e.isPayment && (
                              <a href={googleEventUrl(e)} target="_blank" rel="noopener" className="min-h-8 content-center text-sm text-brand underline">
                                Agregar a Google
                              </a>
                            )}
                            {e.canEdit && !past && !e.staffOnly && !e.announced && <AnnounceButton id={e.id} />}
                            {e.canEdit && e.announced && !past && <span className="text-sm text-muted">Familias avisadas</span>}
                            {e.canEdit && (
                              <form action={deleteEvent.bind(null, e.id)}>
                                <button className="min-h-8 text-sm text-muted underline">Borrar</button>
                              </form>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))
        )}

        {role !== "guardian" && groupOptions.length + (role === "director" ? 1 : 0) > 0 && (
          <Card>
            <details>
              <summary className="min-h-11 cursor-pointer content-center text-lg font-semibold">{role === "director" ? "Agregar evento" : "Agendar examen o evento de su grupo"}</summary>
              <ActionForm action={createEvent} submit="Guardar en el calendario" success="Guardado." className="mt-3 space-y-3">
                <Field label="Qué es">
                  <Input name="title" required maxLength={120} placeholder={role === "director" ? "Junta de padres, festival, suspensión…" : "Examen de fracciones"} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tipo">
                    <Select name="kind" defaultValue={role === "director" ? "evento" : "examen"}>
                      {kinds.map((k) => (
                        <option key={k} value={k}>
                          {KIND_LABEL[k]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Para">
                    <Select name="group" defaultValue={role === "director" ? "" : groupOptions[0]?.id}>
                      {role === "director" && <option value="">Toda la escuela</option>}
                      {groupOptions.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Fecha">
                    <Input name="starts_on" type="date" required min={addDays(today, -30)} />
                  </Field>
                  <Field label="Hasta (si dura varios días)">
                    <Input name="ends_on" type="date" />
                  </Field>
                  <Field label="Hora de inicio (opcional)">
                    <Input name="start_time" type="time" />
                  </Field>
                  <Field label="Hora de fin (opcional)">
                    <Input name="end_time" type="time" />
                  </Field>
                </div>
                <Field label="Detalles para las familias (opcional)">
                  <Textarea name="description" rows={2} maxLength={1000} placeholder="Qué llevar, dónde, a qué hora salen…" />
                </Field>
                <label className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" name="announce" className="size-5 accent-brand" />
                  <span>Avisar ahora a las familias {role === "teacher" ? "del grupo" : ""} (llega como notificación)</span>
                </label>
                {role === "director" && (
                  <label className="flex min-h-11 items-center gap-3">
                    <input type="checkbox" name="staff_only" className="size-5 accent-brand" />
                    <span>Solo para el personal (las familias no lo ven)</span>
                  </label>
                )}
              </ActionForm>
            </details>
          </Card>
        )}

        <SubscribeCard links={links} role={role} />
      </div>
    </>
  );
}
