import { ActionForm } from "@/components/action-form";
import { Card, Empty, Input, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addGroup } from "../actions";
import { GroupTeachers } from "./group-teachers";

export const metadata = { title: "Grupos y maestros" };

export default async function GroupsPage() {
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const [{ data: groups }, { data: subjects }, { data: staff }, { data: ta }] = await Promise.all([
    supabase.from("groups").select("id, grade, name, school_years!inner(is_current), enrollments(count)").eq("school_id", membership.schoolId).eq("school_years.is_current", true).order("grade").order("name"),
    supabase.from("subjects").select("id, name").eq("school_id", membership.schoolId).order("name"),
    supabase.from("memberships").select("user_id, profiles(full_name)").eq("school_id", membership.schoolId).eq("role", "teacher"),
    supabase.from("teaching_assignments").select("group_id, subject_id, teacher_id, is_homeroom").eq("school_id", membership.schoolId),
  ]);
  const teachers = (staff ?? []).map((s) => ({ id: s.user_id, name: s.profiles?.full_name || "Sin nombre" })).sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <>
      <PageHeader title="Grupos y maestros" subtitle="Cada maestro solo ve a los alumnos de sus grupos." back="/director/escuela" />
      {!teachers.length && <Empty title="Primero dé de alta a los maestros">En Escuela › Personal.</Empty>}
      <div className="space-y-4">
        {(groups ?? []).map((g) => {
          const rows = (ta ?? []).filter((t) => t.group_id === g.id);
          return (
            <Card key={g.id}>
              <h2 className="mb-2 text-lg font-semibold">
                {g.grade}°{g.name} <span className="text-sm font-normal text-muted">· {g.enrollments?.[0]?.count ?? 0} alumnos</span>
              </h2>
              <GroupTeachers
                groupId={g.id}
                subjects={subjects ?? []}
                teachers={teachers}
                initial={Object.fromEntries(rows.map((r) => [r.subject_id, r.teacher_id]))}
                initialHomeroom={rows.find((r) => r.is_homeroom)?.teacher_id ?? ""}
              />
            </Card>
          );
        })}
        <Card>
          <h2 className="mb-2 font-semibold">Agregar grupo</h2>
          <ActionForm action={addGroup} submit="Agregar" variant="secondary" className="flex flex-wrap items-end gap-2">
            <Input name="grade" type="number" min={1} max={6} placeholder="Grado" className="w-28" aria-label="Grado" required />
            <Input name="name" placeholder="Grupo (A, B…)" className="w-36" aria-label="Grupo" required />
          </ActionForm>
          <p className="mt-2 text-sm text-muted">Los grupos también se crean solos al importar alumnos.</p>
        </Card>
      </div>
    </>
  );
}
