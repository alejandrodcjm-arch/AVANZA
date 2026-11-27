import Link from "next/link";
import { Empty, cx } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { groupStudents, teacherGroups } from "@/lib/teacher";
import { todayLocal } from "@/lib/time";
import { GradesForm } from "./grades-form";

export const metadata = { title: "Calificaciones" };

export default async function GradesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ materia?: string; periodo?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { session } = await requireRole("teacher");
  const supabase = await createClient();
  const group = (await teacherGroups(supabase, session.userId)).find((g) => g.id === id);
  if (!group) return <Empty title="No da clase a este grupo" />;

  const { data: periods } = await supabase
    .from("periods")
    .select("id, name, starts_on, ends_on, school_years!inner(is_current)")
    .eq("school_years.is_current", true)
    .order("sort");
  const today = todayLocal();
  const current = (periods ?? []).filter((p) => p.starts_on <= today).at(-1) ?? periods?.[0];
  const period = periods?.find((p) => p.id === sp.periodo) ?? current;
  const subject = group.subjects.find((s) => s.id === sp.materia) ?? group.subjects[0];
  if (!period || !subject) return <Empty title="Falta configurar periodos o materias">Pida a dirección que configure el ciclo escolar.</Empty>;

  const [students, { data: grades }] = await Promise.all([
    groupStudents(supabase, id),
    supabase.from("grades").select("student_id, score").eq("subject_id", subject.id).eq("period_id", period.id),
  ]);
  const ids = new Set(students.map((s) => s.id));
  const initial = Object.fromEntries((grades ?? []).filter((g) => ids.has(g.student_id)).map((g) => [g.student_id, Number(g.score)]));
  const q = (m: string, p: string) => `?materia=${m}&periodo=${p}`;

  return (
    <>
      <p className="mb-3 text-muted">Escala de 5 a 10. Deje vacío si aún no la tiene. ¿Ya las tiene en Excel? <Link href={`/maestro/grupos/${id}/excel`} className="font-medium text-brand underline">Súbalo</Link>.</p>
      <nav className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="Materia">
        {group.subjects.map((s) => (
          <Link key={s.id} href={q(s.id, period.id)} className={cx("min-h-10 shrink-0 content-center rounded-full px-4 text-sm", s.id === subject.id ? "bg-brand text-white" : "bg-card ring-1 ring-line")}>
            {s.name}
          </Link>
        ))}
      </nav>
      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Periodo">
        {(periods ?? []).map((p) => (
          <Link key={p.id} href={q(subject.id, p.id)} className={cx("min-h-10 shrink-0 content-center rounded-full px-4 text-sm", p.id === period.id ? "bg-brand-soft font-semibold text-brand" : "text-muted")}>
            {p.name}
          </Link>
        ))}
      </nav>
      <GradesForm
        key={`${subject.id}-${period.id}`}
        groupId={id}
        subjectId={subject.id}
        periodId={period.id}
        initial={initial}
        students={students.map((s) => ({ id: s.id, name: `${s.last_name} ${s.second_last_name ?? ""} ${s.first_name}`.replace(/\s+/g, " ") }))}
      />
    </>
  );
}
