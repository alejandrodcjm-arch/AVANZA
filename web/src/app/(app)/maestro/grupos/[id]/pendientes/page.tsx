import Link from "next/link";
import { Card, Empty, cx } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { groupStudents, teacherGroups, weekStart } from "@/lib/teacher";
import { addDays, todayLocal } from "@/lib/time";
import { WeeklyForm } from "./weekly-form";

export const metadata = { title: "Pendientes de la semana" };

export default async function PendingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ materia?: string; semana?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { session } = await requireRole("teacher");
  const supabase = await createClient();
  const group = (await teacherGroups(supabase, session.userId)).find((g) => g.id === id);
  if (!group) return <Empty title="No da clase a este grupo" />;

  const thisWeek = weekStart(todayLocal());
  const weeks = [0, 1, 2, 3].map((k) => addDays(thisWeek, -7 * k));
  const week = weeks.includes(sp.semana ?? "") ? sp.semana! : thisWeek;
  const subject = group.subjects.find((s) => s.id === sp.materia) ?? group.subjects[0];
  const students = await groupStudents(supabase, id);
  const ids = students.map((s) => s.id);
  const [{ data: cur }, { data: prev }, { data: uploads }] = await Promise.all([
    supabase.from("weekly_pending").select("student_id, pending_count").eq("subject_id", subject.id).eq("week_start", week).in("student_id", ids),
    supabase.from("weekly_pending").select("student_id, pending_count").eq("subject_id", subject.id).eq("week_start", addDays(week, -7)).in("student_id", ids),
    supabase.from("gradebook_uploads").select("file_name, created_at, summary").eq("group_id", id).eq("subject_id", subject.id).order("created_at", { ascending: false }).limit(1),
  ]);
  const initial = Object.fromEntries((cur ?? []).filter((r) => r.pending_count > 0).map((r) => [r.student_id, r.pending_count]));
  const last = new Map((prev ?? []).map((r) => [r.student_id, r.pending_count]));
  const q = (m: string, w: string) => `?materia=${m}&semana=${w}`;

  return (
    <>
      <Card className="mb-4">
        <p className="font-semibold">Dos formas, elija la que le acomode:</p>
        <ul className="mt-2 space-y-1 text-ink/90">
          <li>
            <strong>Corte semanal</strong> (abajo): una vez por semana marque cuántos trabajos debe cada quien. Toma un minuto.
          </li>
          <li>
            <strong>Su Excel de siempre</strong>:{" "}
            <Link href={`/maestro/grupos/${id}/excel`} className="font-medium text-brand underline">
              súbalo aquí
            </Link>{" "}
            y la app calcula los pendientes. No captura dos veces.
          </li>
        </ul>
        {uploads?.[0] && <p className="mt-2 text-sm text-muted">Último Excel de {subject.name}: {uploads[0].file_name}, {formatShortDate(uploads[0].created_at.slice(0, 10))}.</p>}
      </Card>
      <nav className="mb-2 flex gap-2 overflow-x-auto pb-1" aria-label="Materia">
        {group.subjects.map((s) => (
          <Link key={s.id} href={q(s.id, week)} className={cx("min-h-10 shrink-0 content-center rounded-full px-4 text-sm", s.id === subject.id ? "bg-brand text-white" : "bg-card ring-1 ring-line")}>
            {s.name}
          </Link>
        ))}
      </nav>
      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Semana">
        {weeks.map((w, i) => (
          <Link key={w} href={q(subject.id, w)} className={cx("min-h-10 shrink-0 content-center rounded-full px-4 text-sm", w === week ? "bg-brand-soft font-semibold text-brand" : "text-muted")}>
            {i === 0 ? "Esta semana" : `Semana del ${formatShortDate(w)}`}
          </Link>
        ))}
      </nav>
      <WeeklyForm
        key={`${subject.id}-${week}`}
        groupId={id}
        subjectId={subject.id}
        week={week}
        saved={(cur ?? []).length > 0}
        initial={initial}
        rows={students.map((s) => ({ id: s.id, name: `${s.last_name} ${s.second_last_name ?? ""} ${s.first_name}`.replace(/\s+/g, " "), last: last.get(s.id) ?? null }))}
      />
      <Link href={`/maestro/grupos/${id}/tareas`} className="mt-2 inline-flex min-h-10 items-center text-sm text-muted underline">
        Prefiero registrar actividad por actividad
      </Link>
    </>
  );
}
