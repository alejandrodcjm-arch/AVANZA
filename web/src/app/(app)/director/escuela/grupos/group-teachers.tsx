"use client";

import { useState, useTransition } from "react";
import { Button, Notice, Select } from "@/components/ui";
import { saveGroupTeachers } from "../actions";

type Opt = { id: string; name: string };

export function GroupTeachers({ groupId, subjects, teachers, initial, initialHomeroom }: { groupId: string; subjects: Opt[]; teachers: Opt[]; initial: Record<string, string>; initialHomeroom: string }) {
  const [map, setMap] = useState<Record<string, string>>(initial);
  const [homeroom, setHomeroom] = useState(initialHomeroom);
  const [msg, setMsg] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const assigned = [...new Set(Object.values(map).filter(Boolean))];

  const setAll = (t: string) => {
    setMap(Object.fromEntries(subjects.map((s) => [s.id, t])));
    setHomeroom(t);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Una sola maestra para todo el grupo:</span>
        <Select className="w-auto" value="" onChange={(e) => e.target.value && setAll(e.target.value)} aria-label="Asignar todas las materias">
          <option value="">Elegir…</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      <ul className="divide-y divide-line">
        {subjects.map((s) => (
          <li key={s.id} className="grid grid-cols-[1fr_minmax(0,14rem)] items-center gap-2 py-2">
            <span>{s.name}</span>
            <Select value={map[s.id] ?? ""} onChange={(e) => setMap((m) => ({ ...m, [s.id]: e.target.value }))} aria-label={`Quién da ${s.name}`}>
              <option value="">Sin asignar</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </li>
        ))}
      </ul>
      <label className="flex flex-wrap items-center gap-2">
        <span>Titular (revisa los resúmenes del mes):</span>
        <Select className="w-auto" value={homeroom} onChange={(e) => setHomeroom(e.target.value)}>
          <option value="">Elegir…</option>
          {teachers
            .filter((t) => assigned.includes(t.id))
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </Select>
      </label>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await saveGroupTeachers(groupId, map, homeroom);
            setMsg(r.ok ? { tone: "good", text: "Guardado." } : { tone: "error", text: r.error });
          })
        }
      >
        Guardar
      </Button>
    </div>
  );
}
