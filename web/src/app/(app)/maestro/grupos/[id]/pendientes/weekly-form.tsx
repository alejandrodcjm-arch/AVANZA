"use client";

import { useState, useTransition } from "react";
import { Button, Notice, cx } from "@/components/ui";
import { saveWeekly } from "./actions";

type Row = { id: string; name: string; last: number | null };

/** Corte semanal: todos al corriente por defecto; la maestra solo sube el número de quien debe algo. */
export function WeeklyForm({ groupId, subjectId, week, rows, initial, saved }: { groupId: string; subjectId: string; week: string; rows: Row[]; initial: Record<string, number>; saved: boolean }) {
  const [counts, setCounts] = useState<Record<string, number>>(initial);
  const [msg, setMsg] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (id: string, n: number) => setCounts((c) => ({ ...c, [id]: Math.max(0, Math.min(30, n)) }));
  const owing = rows.filter((r) => (counts[r.id] ?? 0) > 0);
  const total = owing.reduce((t, r) => t + (counts[r.id] ?? 0), 0);

  return (
    <div>
      <ul className="divide-y divide-line rounded-card bg-card ring-1 ring-line">
        {rows.map((r) => {
          const n = counts[r.id] ?? 0;
          return (
            <li key={r.id} className={cx("flex items-center gap-3 px-3 py-2", n > 0 && "bg-care-soft/60")}>
              <div className="min-w-0 flex-1">
                <p className="truncate">{r.name}</p>
                {r.last !== null && r.last > 0 && <p className="text-xs text-muted">la semana pasada debía {r.last}</p>}
              </div>
              <div className="flex items-center gap-1" role="group" aria-label={`Pendientes de ${r.name}`}>
                <button type="button" onClick={() => set(r.id, n - 1)} disabled={n === 0} className="size-11 rounded-lg bg-white text-xl ring-1 ring-line disabled:opacity-30" aria-label="Uno menos">
                  −
                </button>
                <span className={cx("num w-9 text-center text-lg font-semibold", n > 0 ? "text-[#7a4f0f]" : "text-muted")} aria-live="polite">
                  {n}
                </span>
                <button type="button" onClick={() => set(r.id, n + 1)} className="size-11 rounded-lg bg-white text-xl ring-1 ring-line" aria-label="Uno más">
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-20 mt-4 space-y-2 bg-paper/95 py-3 backdrop-blur md:bottom-0">
        <p className="num text-center text-muted">
          {rows.length - owing.length} al corriente · {owing.length} deben ({total} trabajos)
        </p>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCounts({})} disabled={pending}>
            Todos al corriente
          </Button>
          <Button
            full
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await saveWeekly(groupId, subjectId, week, counts);
                setMsg(r.ok ? { tone: "good", text: "Corte guardado. Las familias lo verán en el resumen del viernes." } : { tone: "error", text: r.error });
              })
            }
          >
            {pending ? "Guardando…" : saved ? "Actualizar corte" : "Guardar corte de la semana"}
          </Button>
        </div>
      </div>
    </div>
  );
}
