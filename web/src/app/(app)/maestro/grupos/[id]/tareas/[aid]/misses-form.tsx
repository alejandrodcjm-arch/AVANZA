"use client";

import { useState, useTransition } from "react";
import { Button, Notice, cx } from "@/components/ui";
import { saveMisses } from "../actions";

export function MissesForm({ groupId, assignmentId, students, initial }: { groupId: string; assignmentId: string; students: { id: string; name: string }[]; initial: string[] }) {
  const [missed, setMissed] = useState(new Set(initial));
  const [msg, setMsg] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const toggle = (id: string) =>
    setMissed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return (
    <div>
      <ul className="divide-y divide-line rounded-card bg-card ring-1 ring-line">
        {students.map((s) => (
          <li key={s.id}>
            <label className={cx("flex min-h-14 cursor-pointer items-center gap-3 px-4", missed.has(s.id) && "bg-care-soft/60")}>
              <input type="checkbox" checked={missed.has(s.id)} onChange={() => toggle(s.id)} className="size-6 accent-[#b7791f]" />
              <span className="flex-1">{s.name}</span>
              {missed.has(s.id) && <span className="text-sm font-medium text-care">No entregó</span>}
            </label>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-20 mt-4 space-y-2 bg-paper/95 py-3 backdrop-blur md:bottom-0">
        <p className="num text-center text-muted">
          {students.length - missed.size} entregaron · {missed.size} no entregaron
        </p>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Button
          full
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveMisses(groupId, assignmentId, [...missed]);
              setMsg(r.ok ? { tone: "good", text: "Guardado." } : { tone: "error", text: r.error });
            })
          }
        >
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
