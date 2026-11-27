"use client";

import { useState } from "react";
import { WEEKDAYS } from "@/lib/calendar/kinds";
import { cx } from "./ui";

export type ViewBlock = { id: string; weekday: number; starts_at: string; ends_at: string; title: string; sub?: string | null; isSubject: boolean };

const hm = (t: string) => t.slice(0, 5);

/** Horario por día (celular: un día a la vez, empezando por hoy) y semana completa en pantallas grandes. */
export function ScheduleView({ blocks, todayWeekday }: { blocks: ViewBlock[]; todayWeekday: number }) {
  const days = [...new Set(blocks.map((b) => b.weekday))].sort();
  const start = days.includes(todayWeekday) ? todayWeekday : (days.find((d) => d > todayWeekday) ?? days[0]);
  const [day, setDay] = useState(start);
  const of = (d: number) => blocks.filter((b) => b.weekday === d).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  if (!blocks.length) return null;

  return (
    <>
      <div className="md:hidden">
        <div role="tablist" aria-label="Día" className="mb-3 flex gap-1 rounded-xl bg-[#efeae1] p-1">
          {days.map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={d === day}
              onClick={() => setDay(d)}
              className={cx("min-h-10 flex-1 rounded-lg text-sm font-medium", d === day ? "bg-card text-brand shadow-sm" : "text-muted")}
            >
              {WEEKDAYS[d].slice(0, 3)}
              {d === todayWeekday && <span className="sr-only"> (hoy)</span>}
            </button>
          ))}
        </div>
        <p className="mb-2 text-sm text-muted">{day === todayWeekday ? "Hoy" : day === (todayWeekday % 7) + 1 ? "Mañana" : WEEKDAYS[day]}</p>
        <ol className="divide-y divide-line">
          {of(day).map((b) => (
            <li key={b.id} className="flex gap-3 py-2.5">
              <span className="num w-24 shrink-0 text-sm text-muted">
                {hm(b.starts_at)}–{hm(b.ends_at)}
              </span>
              <span className={cx(!b.isSubject && "text-muted")}>
                <span className={cx(b.isSubject && "font-medium")}>{b.title}</span>
                {b.sub && <span className="block text-sm text-muted">{b.sub}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="hidden md:block">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d) => (
            <section key={d} aria-label={WEEKDAYS[d]} className={cx("rounded-xl p-2", d === todayWeekday ? "bg-brand-soft" : "bg-[#f6f3ee]")}>
              <h3 className="mb-2 text-center text-sm font-semibold">
                {WEEKDAYS[d]}
                {d === todayWeekday && <span className="font-normal text-muted"> · hoy</span>}
              </h3>
              <ol className="space-y-1.5">
                {of(d).map((b) => (
                  <li key={b.id} className={cx("rounded-lg px-2 py-1.5 text-sm", b.isSubject ? "bg-card" : "text-muted")}>
                    <span className="num block text-xs text-muted">
                      {hm(b.starts_at)}–{hm(b.ends_at)}
                    </span>
                    <span className={cx(b.isSubject && "font-medium")}>{b.title}</span>
                    {b.sub && <span className="block text-xs text-muted">{b.sub}</span>}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
