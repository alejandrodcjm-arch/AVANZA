import { WEEKDAYS } from "@/lib/calendar/kinds";
import { cx } from "./ui";

export type WeekBlock = { id: string; weekday: number; starts_at: string; ends_at: string; title: string; sub?: string | null; isSubject: boolean; colorKey?: string | null };

// Una franja de color por materia (paleta categórica validada, orden fijo) sobre un fondo muy suave;
// el nombre siempre va escrito, el color solo ayuda a ubicar la materia de un vistazo.
const STRIPES = ["#257de0", "#f47230", "#00b894", "#f2a600", "#ee7fac", "#008a17", "#6a4ce2", "#ec4647"];
const TINTS = STRIPES.map((c) => ({ bg: `${c}1f`, bar: c }));

const hm = (t: string) => t.slice(0, 5);

/** Horario de la semana en una sola tabla: horas en renglones, días en columnas. */
export function WeekTable({ blocks, todayWeekday, caption, compact }: { blocks: WeekBlock[]; todayWeekday?: number; caption?: string; compact?: boolean }) {
  if (!blocks.length) return null;
  const days = [1, 2, 3, 4, 5, ...(blocks.some((b) => b.weekday === 6) ? [6] : [])];
  const slots = [...new Map(blocks.map((b) => [`${b.starts_at}-${b.ends_at}`, { s: b.starts_at, e: b.ends_at }])).values()].sort((a, b) => a.s.localeCompare(b.s) || a.e.localeCompare(b.e));
  const keys = [...new Set(blocks.filter((b) => b.isSubject).map((b) => b.colorKey ?? b.title))].sort();
  const tint = (b: WeekBlock) => TINTS[keys.indexOf(b.colorKey ?? b.title) % TINTS.length];
  const at = (d: number, s: { s: string; e: string }) => blocks.filter((b) => b.weekday === d && b.starts_at === s.s && b.ends_at === s.e);

  return (
    <div className="-mx-4 overflow-x-auto px-4 print:mx-0 print:overflow-visible print:px-0">
      <p className="mb-1 text-xs text-muted sm:hidden print:hidden">Deslice para ver toda la semana →</p>
      <table className={cx("w-full min-w-[600px] border-separate border-spacing-1 text-left", compact ? "text-xs" : "text-xs sm:text-sm")}>
        {caption && <caption className="mb-2 text-left text-base font-semibold">{caption}</caption>}
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 w-20 bg-card px-1 text-xs font-medium text-muted">
              Hora
            </th>
            {days.map((d) => (
              <th key={d} scope="col" className={cx("rounded-lg px-2 py-2 text-center font-semibold", d === todayWeekday ? "bg-brand text-white" : "bg-[#efeae1] text-ink")}>
                {WEEKDAYS[d]}
                {d === todayWeekday && <span className="sr-only"> (hoy)</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            const cells = days.map((d) => at(d, slot));
            const first = cells[0][0];
            const sameBand = first && !first.isSubject && cells.every((c) => c.length === 1 && !c[0].isSubject && c[0].title === first.title);
            return (
              <tr key={`${slot.s}-${slot.e}`}>
                <th scope="row" className="num sticky left-0 z-10 bg-card px-1 align-top text-xs font-normal whitespace-nowrap text-muted">
                  {hm(slot.s)}
                  <br />
                  {hm(slot.e)}
                </th>
                {sameBand ? (
                  <td colSpan={days.length} className="rounded-lg bg-[#f4f1ec] px-3 py-1.5 text-left text-muted sm:text-center">
                    {first.title}
                  </td>
                ) : (
                  cells.map((list, i) => (
                    <td key={days[i]} className={cx("align-top", days[i] === todayWeekday && "bg-brand-soft/40")}>
                      {list.map((b) =>
                        b.isSubject ? (
                          <div key={b.id} className="h-full rounded-lg border-l-4 px-2 py-1.5" style={{ background: tint(b).bg, borderColor: tint(b).bar }}>
                            <span className="block leading-tight font-medium text-ink">{b.title}</span>
                            {b.sub && <span className="block text-xs leading-tight text-muted">{b.sub}</span>}
                          </div>
                        ) : (
                          <div key={b.id} className="rounded-lg bg-[#f4f1ec] px-2 py-1.5 text-muted">
                            {b.title}
                          </div>
                        ),
                      )}
                    </td>
                  ))
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
