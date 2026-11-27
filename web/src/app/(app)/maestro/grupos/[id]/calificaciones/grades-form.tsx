"use client";

import { useState, useTransition } from "react";
import { Button, Notice, cx } from "@/components/ui";
import { saveGrades } from "./actions";

type Student = { id: string; name: string };

function parse(v: string): number | null | "invalid" {
  const t = v.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 5 || n > 10) return "invalid";
  return Math.round(n * 10) / 10;
}

export function GradesForm({ groupId, subjectId, periodId, students, initial }: { groupId: string; subjectId: string; periodId: string; students: Student[]; initial: Record<string, number> }) {
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, String(v)])));
  const [msg, setMsg] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const invalid = students.filter((s) => parse(values[s.id] ?? "") === "invalid");
  const changed = students.filter((s) => {
    const p = parse(values[s.id] ?? "");
    return p !== "invalid" && p !== (initial[s.id] ?? null);
  });
  const filled = students.filter((s) => typeof parse(values[s.id] ?? "") === "number").length;

  const save = () =>
    start(async () => {
      setMsg(null);
      const scores = Object.fromEntries(changed.map((s) => [s.id, parse(values[s.id] ?? "") as number | null]));
      const res = await saveGrades(groupId, { subjectId, periodId, scores });
      setMsg(res.ok ? { tone: "good", text: `Guardado (${changed.length} ${changed.length === 1 ? "cambio" : "cambios"}).` } : { tone: "error", text: res.error });
    });

  return (
    <div>
      <ul className="divide-y divide-line rounded-card bg-card ring-1 ring-line">
        {students.map((s, i) => {
          const bad = parse(values[s.id] ?? "") === "invalid";
          return (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2">
              <span className="num w-6 text-right text-sm text-muted">{i + 1}</span>
              <label htmlFor={`g-${s.id}`} className="flex-1">
                {s.name}
              </label>
              <input
                id={`g-${s.id}`}
                inputMode="decimal"
                enterKeyHint="next"
                value={values[s.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [s.id]: e.target.value }))}
                aria-invalid={bad}
                className={cx("num h-12 w-20 rounded-lg border text-center text-lg", bad ? "border-danger bg-[#f8e6e2]" : "border-line bg-white")}
                placeholder="—"
              />
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-20 mt-4 space-y-2 bg-paper/95 py-3 backdrop-blur md:bottom-0">
        <p className="num text-center text-muted">
          {filled} de {students.length} capturadas{changed.length ? ` · ${changed.length} sin guardar` : ""}
        </p>
        {invalid.length > 0 && <Notice tone="error">Las calificaciones van de 5 a 10 (ej. 8.5). Revise {invalid.length === 1 ? "la marcada" : `las ${invalid.length} marcadas`}.</Notice>}
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Button full onClick={save} disabled={pending || invalid.length > 0 || changed.length === 0}>
          {pending ? "Guardando…" : "Guardar calificaciones"}
        </Button>
      </div>
    </div>
  );
}
