import type { Enums, Json } from "@/lib/database.types";

export const INDICATOR_LABEL: Record<Enums<"alert_indicator">, string> = {
  attendance: "Faltas",
  behavior: "Conducta",
  grades: "Calificaciones",
  assignments: "Tareas",
};

type Detail = {
  absences?: number;
  days?: number;
  pct?: number;
  window_days?: number;
  reports?: number;
  missed?: number;
  subjects?: { subject: string; score: number; previous: number | null }[];
};

/** Explica con números exactos por qué se levantó la señal (para el personal, nunca para papás). */
export function describeAlert(indicator: Enums<"alert_indicator">, detail: Json): string {
  const d = (detail ?? {}) as Detail;
  switch (indicator) {
    case "attendance":
      return `${d.absences} faltas de ${d.days} días registrados (${d.pct}%) en los últimos ${d.window_days} días.`;
    case "behavior":
      return `${d.reports} reportes de conducta en los últimos ${d.window_days} días.`;
    case "assignments":
      return `${d.missed} tareas sin entregar en los últimos ${d.window_days} días.`;
    case "grades":
      return (d.subjects ?? [])
        .map((s) => (s.previous !== null && s.previous !== undefined ? `${s.subject}: bajó de ${s.previous} a ${s.score}` : `${s.subject}: ${s.score}`))
        .join(" · ");
  }
}

export const ACTION_LABEL: Record<string, string> = {
  cita_papas: "Cita con la familia",
  tutoria: "Tutoría",
  platica_alumno: "Plática con el alumno",
  canalizacion: "Canalización (psicología, USAER, etc.)",
  otra: "Otra acción",
};
