"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button, Input, Notice, cx } from "@/components/ui";
import { saveAttendance } from "./actions";

type Status = "absent" | "late" | "excused";
type Student = { id: string; name: string };

const OPTIONS: { value: Status; short: string; label: string }[] = [
  { value: "absent", short: "Falta", label: "Falta" },
  { value: "late", short: "Retardo", label: "Retardo" },
  { value: "excused", short: "Justif.", label: "Falta justificada" },
];

/** Todos presentes por defecto: la maestra solo toca las excepciones (menos de 1 minuto por grupo). */
export function AttendanceForm({ groupId, date, today, students, initial }: { groupId: string; date: string; today: string; students: Student[]; initial: Record<string, Status> }) {
  const router = useRouter();
  const [marks, setMarks] = useState<Record<string, Status>>(initial);
  const [msg, setMsg] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const existing = Object.keys(initial).length > 0;

  const totals = useMemo(() => {
    const v = Object.values(marks);
    return { absent: v.filter((s) => s === "absent" || s === "excused").length, late: v.filter((s) => s === "late").length };
  }, [marks]);

  const toggle = (id: string, s: Status) =>
    setMarks((m) => {
      const n = { ...m };
      if (n[id] === s) delete n[id];
      else n[id] = s;
      return n;
    });

  const save = () =>
    start(async () => {
      setMsg(null);
      const res = await saveAttendance(groupId, { date, exceptions: marks });
      setMsg(res.ok ? { tone: "good", text: "Lista guardada." } : { tone: "error", text: res.error });
      if (res.ok) router.refresh();
    });

  return (
    <div>
      <div className="mb-4 flex items-end gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-sm text-muted">Fecha</span>
          <Input type="date" value={date} max={today} onChange={(e) => router.push(`?fecha=${e.target.value}`)} />
        </label>
        <Button variant="secondary" onClick={() => setMarks({})} disabled={pending}>
          Todos presentes
        </Button>
      </div>
      <ul className="divide-y divide-line rounded-card bg-card ring-1 ring-line">
        {students.map((s, i) => (
          <li key={s.id} className={cx("flex flex-wrap items-center gap-2 px-3 py-2", marks[s.id] && "bg-care-soft/60")}>
            <span className="num w-6 text-right text-sm text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 basis-40">{s.name}</span>
            <div className="flex gap-1" role="group" aria-label={`Asistencia de ${s.name}`}>
              {OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={marks[s.id] === o.value}
                  aria-label={o.label}
                  onClick={() => toggle(s.id, o.value)}
                  className={cx(
                    "min-h-11 min-w-16 rounded-lg px-2 text-sm font-medium ring-1",
                    marks[s.id] === o.value ? "bg-care text-white ring-care" : "bg-white text-muted ring-line",
                  )}
                >
                  {o.short}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-20 mt-4 space-y-2 rounded-card bg-paper/95 py-3 backdrop-blur md:bottom-0">
        <p className="num text-center text-muted">
          {students.length - totals.absent} presentes · {totals.absent} {totals.absent === 1 ? "falta" : "faltas"} · {totals.late}{" "}
          {totals.late === 1 ? "retardo" : "retardos"}
        </p>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Button full onClick={save} disabled={pending}>
          {pending ? "Guardando…" : existing ? "Guardar cambios" : "Guardar lista"}
        </Button>
      </div>
    </div>
  );
}
