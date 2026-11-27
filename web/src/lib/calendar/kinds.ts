import type { Enums } from "@/lib/database.types";

export type EventKind = Enums<"event_kind">;

export const KIND_LABEL: Record<EventKind, string> = {
  sin_clases: "Sin clases",
  vacaciones: "Vacaciones",
  cte: "Consejo Técnico",
  examen: "Examen",
  boletas: "Calificaciones",
  junta: "Junta",
  evento: "Evento",
  pago: "Pago",
  otro: "Aviso",
};

/** Lo que interrumpe la rutina de la familia (no hay clases) se marca distinto; nada usa rojo. */
export const NO_CLASS: EventKind[] = ["sin_clases", "vacaciones", "cte"];

/** Tipos que un maestro puede agendar para su grupo. */
export const TEACHER_KINDS: EventKind[] = ["examen", "junta", "evento", "otro"];
export const DIRECTOR_KINDS: EventKind[] = ["sin_clases", "vacaciones", "cte", "examen", "boletas", "junta", "evento", "pago", "otro"];

export const WEEKDAYS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
