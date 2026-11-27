import writeXlsxFile from "write-excel-file/node";
import type { Row, Sheet } from "write-excel-file/node";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Concentrado de calificaciones ("sábana"): una hoja por grupo, alumnos × materias, promedio y faltas. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.active || session.active.role !== "director") return NextResponse.json({ error: "sin permiso" }, { status: 403 });
  const periodId = req.nextUrl.searchParams.get("periodo");
  if (!periodId) return NextResponse.json({ error: "falta el periodo" }, { status: 400 });
  const supabase = await createClient();
  const schoolId = session.active.schoolId;

  const [{ data: period }, { data: groups }, { data: subjects }, { data: grades }] = await Promise.all([
    supabase.from("periods").select("name, starts_on, ends_on").eq("id", periodId).eq("school_id", schoolId).maybeSingle(),
    supabase
      .from("groups")
      .select("id, grade, name, school_years!inner(is_current), enrollments(students(id, first_name, last_name, second_last_name))")
      .eq("school_id", schoolId)
      .eq("school_years.is_current", true)
      .order("grade")
      .order("name"),
    supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("grades").select("student_id, subject_id, score").eq("school_id", schoolId).eq("period_id", periodId),
  ]);
  if (!period) return NextResponse.json({ error: "periodo no encontrado" }, { status: 404 });

  const { data: absences } = await supabase
    .from("attendance")
    .select("student_id")
    .eq("school_id", schoolId)
    .eq("status", "absent")
    .gte("date", period.starts_on)
    .lte("date", period.ends_on);
  const absMap = new Map<string, number>();
  for (const a of absences ?? []) absMap.set(a.student_id, (absMap.get(a.student_id) ?? 0) + 1);
  const score = new Map((grades ?? []).map((g) => [`${g.student_id}:${g.subject_id}`, Number(g.score)]));
  const subs = subjects ?? [];
  const bold = (value: string) => ({ value, fontWeight: "bold" as const, backgroundColor: "#E3EEEE" });

  const sheets: Sheet<never>[] = (groups ?? []).map((g) => {
    const students = (g.enrollments ?? [])
      .map((e) => e.students!)
      .filter(Boolean)
      .sort((a, b) => `${a.last_name} ${a.second_last_name ?? ""} ${a.first_name}`.localeCompare(`${b.last_name} ${b.second_last_name ?? ""} ${b.first_name}`, "es"));
    const rows: Row[] = [
      [{ value: `${session.active!.schoolName} · ${g.grade}°${g.name} · ${period.name}`, fontWeight: "bold" }],
      [],
      [bold("No."), bold("Alumno"), ...subs.map((s) => bold(s.name)), bold("Promedio"), bold("Faltas")],
    ];
    students.forEach((st, i) => {
      const vals = subs.map((s) => score.get(`${st.id}:${s.id}`));
      const got = vals.filter((v): v is number => typeof v === "number");
      const avg = got.length ? Math.round((got.reduce((a, b) => a + b, 0) / got.length) * 10) / 10 : null;
      rows.push([
        { value: i + 1, type: Number },
        { value: `${st.last_name} ${st.second_last_name ?? ""} ${st.first_name}`.replace(/\s+/g, " ") },
        ...vals.map((v) => (v === undefined ? null : { value: v, type: Number, format: "0.0", ...(v < 6 ? { color: "#A1402F", fontWeight: "bold" as const } : {}) })),
        avg === null ? null : { value: avg, type: Number, format: "0.0", fontWeight: "bold" as const },
        { value: absMap.get(st.id) ?? 0, type: Number },
      ]);
    });
    return {
      sheet: `${g.grade}${g.name}`.slice(0, 31),
      data: rows,
      columns: [{ width: 5 }, { width: 34 }, ...subs.map(() => ({ width: 14 })), { width: 10 }, { width: 8 }],
      stickyRowsCount: 3,
    };
  });

  if (!sheets.length) return NextResponse.json({ error: "no hay grupos" }, { status: 404 });
  const buffer = await writeXlsxFile(sheets).toBuffer();
  const file = `concentrado-${period.name.replace(/\s+/g, "-").toLowerCase()}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
