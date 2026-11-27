"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Card, Notice, cx, inputClass } from "@/components/ui";
import { WEEKDAYS } from "@/lib/calendar/kinds";
import { parseSchedule } from "@/lib/import/schedule";
import { saveSchedule } from "./actions";

type Opt = { id: string; name: string };
type Row = { key: number; weekday: number; starts_at: string; ends_at: string; subject_id: string; label: string; room: string };
export type InitialBlock = { weekday: number; starts_at: string; ends_at: string; subject_id: string | null; label: string | null; room: string | null };

let seq = 1;
const toRow = (b: InitialBlock): Row => ({ key: seq++, weekday: b.weekday, starts_at: b.starts_at.slice(0, 5), ends_at: b.ends_at.slice(0, 5), subject_id: b.subject_id ?? "", label: b.label ?? "", room: b.room ?? "" });
const sortRows = (r: Row[]) => [...r].sort((a, b) => a.weekday - b.weekday || a.starts_at.localeCompare(b.starts_at));

export function ScheduleEditor({ groupId, groupLabel, subjects, initial }: { groupId: string; groupLabel: string; subjects: Opt[]; initial: InitialBlock[] }) {
  const [rows, setRows] = useState<Row[]>(() => sortRows(initial.map(toRow)));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fileNote, setFileNote] = useState("");
  const [pending, start] = useTransition();
  const days = useMemo(() => {
    const used = new Set(rows.map((r) => r.weekday));
    return [1, 2, 3, 4, 5, ...(used.has(6) ? [6] : [])];
  }, [rows]);

  const set = (key: number, patch: Partial<Row>) => {
    setMsg(null);
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };
  const add = (weekday: number) => {
    const last = rows.filter((r) => r.weekday === weekday).at(-1);
    const startAt = last?.ends_at ?? "08:00";
    const [h, m] = startAt.split(":").map(Number);
    const end = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    setRows((rs) => [...rs, { key: seq++, weekday, starts_at: startAt, ends_at: end, subject_id: "", label: "", room: "" }]);
  };
  const copyMonday = () => {
    const mon = rows.filter((r) => r.weekday === 1);
    setRows(sortRows([...mon, ...[2, 3, 4, 5].flatMap((d) => mon.map((r) => ({ ...r, key: seq++, weekday: d })))]));
  };

  async function onFile(file?: File) {
    setFileNote("");
    setMsg(null);
    if (!file) return;
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const sheets = (await readXlsxFile(file)) as { sheet: string; data: unknown[][] }[];
      // Si hay una hoja por grupo, se usa la que lleva el nombre del grupo (3A, 3°A, "3 A").
      const key = groupLabel.replace(/[^0-9a-z]/gi, "").toLowerCase();
      const byName = sheets.find((s) => s.sheet.replace(/[^0-9a-z]/gi, "").toLowerCase().includes(key));
      const candidates = byName ? [byName, ...sheets] : sheets;
      const parsed = candidates.map((s) => ({ s, p: parseSchedule(s.data, subjects) })).find((x) => x.p.blocks.length);
      if (!parsed) {
        setFileNote(parseSchedule(sheets[0]?.data ?? [], subjects).error ?? "No encontramos un horario en el archivo.");
        return;
      }
      setRows(sortRows(parsed.p.blocks.map((b) => toRow({ ...b, room: null }))));
      const notes = [`Leímos ${parsed.p.blocks.length} clases de la hoja «${parsed.s.sheet}». Revise y guarde.`];
      if (parsed.p.asText.length) notes.push(`Quedan como texto (no son materias del sistema): ${parsed.p.asText.join(", ")}.`);
      if (parsed.p.skipped.length) notes.push(`Renglones sin hora de fin: ${parsed.p.skipped.join(", ")}.`);
      setFileNote(notes.join(" "));
    } catch {
      setFileNote("No pudimos leer el archivo. Debe ser Excel (.xlsx).");
    }
  }

  function save() {
    start(async () => {
      const res = await saveSchedule(
        groupId,
        rows.map((r) => ({ weekday: r.weekday, starts_at: r.starts_at, ends_at: r.ends_at, subject_id: r.subject_id || null, label: r.subject_id ? null : r.label.trim() || null, room: r.room.trim() || null })),
      );
      setMsg({ ok: res.ok, text: res.ok ? "Horario guardado. Familias y maestros ya lo ven." : res.error });
    });
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <label className="block">
          <span className="mb-1.5 block font-medium">Cargar desde Excel</span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="block w-full rounded-xl border border-dashed border-line bg-white p-4 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-semibold file:text-brand"
          />
          <span className="mt-1 block text-sm text-muted">El horario que ya tienen: días como columnas (Lunes, Martes…) y las horas en la primera columna. Si el archivo trae una hoja por grupo, usamos la de {groupLabel}.</span>
        </label>
        {fileNote && <Notice>{fileNote}</Notice>}
      </Card>

      {days.map((d) => (
        <Card key={d} className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{WEEKDAYS[d]}</h2>
            {d === 1 && rows.some((r) => r.weekday === 1) && (
              <button type="button" onClick={copyMonday} className="min-h-10 text-sm text-brand underline">
                Copiar el lunes a toda la semana
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {rows
              .filter((r) => r.weekday === d)
              .map((r) => (
                <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 border-b border-line pb-2 last:border-0 sm:grid-cols-[9.5rem_9.5rem_minmax(0,1fr)_auto] sm:border-0 sm:pb-0">
                  <input aria-label="Inicio" type="time" value={r.starts_at} onChange={(e) => set(r.key, { starts_at: e.target.value })} className={inputClass} />
                  <input aria-label="Fin" type="time" value={r.ends_at} onChange={(e) => set(r.key, { ends_at: e.target.value })} className={inputClass} />
                  <div className="col-span-3 flex min-w-0 gap-2 sm:col-span-1 max-sm:order-last">
                    <select aria-label="Materia" value={r.subject_id} onChange={(e) => set(r.key, { subject_id: e.target.value })} className={cx(inputClass, "min-w-0 flex-1")}>
                      <option value="">Otro (escribir)…</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {!r.subject_id && (
                      <input aria-label="Texto" placeholder="Recreo, Inglés…" value={r.label} onChange={(e) => set(r.key, { label: e.target.value })} className={cx(inputClass, "min-w-0 flex-1")} maxLength={60} />
                    )}
                  </div>
                  <button type="button" aria-label="Quitar" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="min-h-11 min-w-11 rounded-lg text-muted hover:bg-[#efeae1]">
                    ✕
                  </button>
                </li>
              ))}
          </ul>
          <button type="button" onClick={() => add(d)} className="min-h-10 text-sm font-medium text-brand">
            + Agregar clase
          </button>
        </Card>
      ))}

      {msg && <Notice tone={msg.ok ? "good" : "error"}>{msg.text}</Notice>}
      <Button onClick={save} disabled={pending} full>
        {pending ? "Guardando…" : `Guardar horario de ${groupLabel}`}
      </Button>
    </div>
  );
}
