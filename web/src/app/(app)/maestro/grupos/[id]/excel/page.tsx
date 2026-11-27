import { Empty } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { groupStudents, teacherGroups } from "@/lib/teacher";
import { todayLocal } from "@/lib/time";
import { GradebookUploader } from "./uploader";

export const metadata = { title: "Subir mi Excel" };

export default async function ExcelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await requireRole("teacher");
  const supabase = await createClient();
  const group = (await teacherGroups(supabase, session.userId)).find((g) => g.id === id);
  if (!group) return <Empty title="No da clase a este grupo" />;
  const [students, { data: periods }] = await Promise.all([
    groupStudents(supabase, id),
    supabase.from("periods").select("id, name, starts_on, school_years!inner(is_current)").eq("school_years.is_current", true).order("sort"),
  ]);
  const today = todayLocal();
  const current = (periods ?? []).filter((p) => p.starts_on <= today).at(-1)?.id ?? periods?.[0]?.id ?? "";
  return (
    <>
      <h2 className="mb-1 text-lg font-semibold">Subir mi registro de Excel</h2>
      <p className="mb-4 text-muted">La app reconoce a sus alumnos por nombre, toma cada columna como una actividad y, si tiene, la columna de promedio como calificación. Usted revisa antes de guardar.</p>
      <GradebookUploader groupId={id} subjects={group.subjects} periods={(periods ?? []).map((p) => ({ id: p.id, name: p.name }))} currentPeriod={current} roster={students} />
    </>
  );
}
