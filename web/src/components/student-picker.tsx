"use client";

import { useMemo, useState } from "react";
import { cx } from "./ui";

export type PickStudent = { id: string; name: string; short: string };

/** Selección rápida de uno o varios alumnos (botones grandes, búsqueda por nombre). */
export function StudentPicker({ students, value, onChange, tone = "brand", disabled = [] }: { students: PickStudent[]; value: string[]; onChange: (v: string[]) => void; tone?: "brand" | "care"; disabled?: string[] }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = q.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return n ? students.filter((s) => s.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(n)) : students;
  }, [q, students]);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div>
      {students.length > 12 && (
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alumno" aria-label="Buscar alumno" className="mb-2 block min-h-11 w-full rounded-xl border border-line bg-white px-4" />
      )}
      <div className="flex flex-wrap gap-1.5">
        {list.map((s) => {
          const on = value.includes(s.id);
          const off = disabled.includes(s.id);
          return (
            <button
              type="button"
              key={s.id}
              disabled={off}
              aria-pressed={on}
              onClick={() => toggle(s.id)}
              title={s.name}
              className={cx(
                "min-h-11 rounded-full px-3 text-sm ring-1 transition disabled:opacity-30",
                on ? (tone === "care" ? "bg-care text-white ring-care" : "bg-brand text-white ring-brand") : "bg-white text-ink ring-line",
              )}
            >
              {on ? "✓ " : ""}
              {s.short}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-sm text-muted">{value.length ? `${value.length} seleccionado${value.length === 1 ? "" : "s"}` : "Toque para seleccionar"}</p>
    </div>
  );
}
