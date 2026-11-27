import { cx } from "./ui";

type Day = { date: string; status: "present" | "absent" | "late" | "excused" | null };

const LETTER = ["L", "M", "M", "J", "V"];
const STATE = {
  present: { icon: "✓", label: "asistió", cls: "bg-good-soft text-good" },
  late: { icon: "R", label: "llegó tarde", cls: "bg-brand-soft text-brand" },
  excused: { icon: "J", label: "falta justificada", cls: "bg-[#efebe4] text-muted" },
  absent: { icon: "F", label: "faltó", cls: "bg-care-soft text-[#7a4f0f]" },
} as const;

/** Lunes a viernes con ícono + letra (el color nunca es la única señal). */
export function WeekStrip({ days, today }: { days: Day[]; today: string }) {
  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Asistencia de esta semana">
      {days.map((d, i) => {
        const s = d.status ? STATE[d.status] : null;
        const future = d.date > today;
        return (
          <li key={d.date} className="text-center">
            <div className="text-xs text-muted">{LETTER[i]}</div>
            <div
              className={cx("mx-auto mt-1 flex size-10 items-center justify-center rounded-full font-semibold", s ? s.cls : "bg-[#f3efe8] text-muted/60", d.date === today && "ring-2 ring-brand")}
              aria-label={`${d.date}: ${s ? s.label : future ? "aún no" : "sin registro"}`}
            >
              {s ? s.icon : "·"}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
