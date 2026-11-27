/** Forma del JSON de public.student_overview. */
export type Overview = {
  student: { id: string; first_name: string; last_name: string; second_last_name: string | null };
  group: { id: string; label: string } | null;
  period: { id: string; name: string; starts_on: string; ends_on: string } | null;
  attendance: { absences: number; lates: number; excused: number; days: number; last_absence: string | null } | null;
  week: {
    start: string;
    days: { date: string; status: "present" | "absent" | "late" | "excused" | null }[];
    pending: { subject: string; count: number; note: string | null }[];
  };
  grades: { subject: string; period: string; score: number; previous: number | null; delta: number | null }[];
  grade_history: { subject: string; points: { period: string; score: number }[] }[];
  pending_work: { subject: string; title: string; due_on: string }[];
  pending_30d: number | null;
  goal: { id: string; goal: string; achieved: boolean | null; month: string } | null;
  summaries: { id: string; month: string }[];
  behavior: { id: string; date: string; severity: "minor" | "moderate" | "serious"; involvement: "involucrado" | "afectado"; text: string }[];
  behavior_month: number;
  recognitions: { category: string; label: string; note: string | null; date: string }[];
};
