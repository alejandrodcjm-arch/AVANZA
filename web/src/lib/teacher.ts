import "server-only";
import type { ServerClient } from "@/lib/supabase/server";

export type TeacherGroup = {
  id: string;
  label: string;
  grade: number;
  name: string;
  isHomeroom: boolean;
  subjects: { id: string; name: string }[];
};

/** Grupos y materias que da el maestro en el ciclo actual. */
export async function teacherGroups(supabase: ServerClient, userId: string): Promise<TeacherGroup[]> {
  const { data } = await supabase
    .from("teaching_assignments")
    .select("is_homeroom, groups!inner(id, grade, name, school_years!inner(is_current)), subjects(id, name)")
    .eq("teacher_id", userId)
    .eq("groups.school_years.is_current", true);
  const map = new Map<string, TeacherGroup>();
  for (const row of data ?? []) {
    const g = row.groups;
    if (!g) continue;
    const cur = map.get(g.id) ?? { id: g.id, label: `${g.grade}°${g.name}`, grade: g.grade, name: g.name, isHomeroom: false, subjects: [] };
    cur.isHomeroom ||= row.is_homeroom;
    if (row.subjects && !cur.subjects.some((s) => s.id === row.subjects!.id)) cur.subjects.push(row.subjects);
    map.set(g.id, cur);
  }
  return [...map.values()].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
}

/** Alumnos inscritos en el grupo (ciclo actual), ordenados por apellido como la lista oficial. */
export async function groupStudents(supabase: ServerClient, groupId: string) {
  const { data } = await supabase
    .from("enrollments")
    .select("students!inner(id, first_name, last_name, second_last_name), school_years!inner(is_current)")
    .eq("group_id", groupId)
    .eq("school_years.is_current", true);
  return (data ?? [])
    .map((e) => e.students!)
    .sort((a, b) =>
      `${a.last_name} ${a.second_last_name ?? ""} ${a.first_name}`.localeCompare(`${b.last_name} ${b.second_last_name ?? ""} ${b.first_name}`, "es"),
    );
}
