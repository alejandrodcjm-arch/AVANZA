"use client";

import { useState, useTransition } from "react";
import { Button, Card, Notice, cx } from "@/components/ui";
import { WEEKDAYS } from "@/lib/calendar/kinds";
import { parseSchedule } from "@/lib/import/schedule";
import { saveSchedule } from "./actions";

type Opt = { id: string; name: string };
export type InitialBlock = { weekday: number; starts_at: string; ends_at: string; subject_id: string | null; label: string | null; room: string | null };
type Cell = { subject_id: string; label: string; text?: boolean };
type Row = { key: number; start: string; end: string; band: string | null; cells: Record<number, Cell> };

let seq = 1;
const EMPTY: Cell = { subject_id: "", label: "" };
const hm = (t: string) => t.slice(0, 5);

/** Bloques → renglones de la tabla (una fila por horario; recreo/honores como banda de toda la semana). */
function toRows(blocks: InitialBlock[]): Row[] {
  const map = new Map<string, Row>();
  for (const b of blocks) {
    const k = `${hm(b.starts_at)}-${hm(b.ends_at)}`;
    const row = map.get(k) ?? { key: seq++, start: hm(b.starts_at), end: hm(b.ends_at), band: null, cells: {} };
    row.cells[b.weekday] = { subject_id: b.subject_id ?? "", label: b.label ?? "" };
    map.set(k, row);
  }
  const rows = [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
  for (const r of rows) {
    const cs = [1, 2, 3, 4, 5].map((d) => r.cells[d]);
    if (cs.every((c) => c && !c.subject_id && c.label && c.label === cs[0]!.label)) r.band = cs[0]!.label;
  }
  return rows;
}

function addMinutes(t: string, m: number) {
  const [h, mm] = t.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + mm + m);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const sel = "block w-full min-h-10 rounded-lg border border-line bg-white px-2 text-sm text-ink focus:border-brand focus:outline-none";

export function ScheduleEditor({ groupId, groupLabel, subjects, initial }: { groupId: string; groupLabel: string; subjects: Opt[]; initial: InitialBlock[] }) {
  const [rows, setRows] = useState<Row[]>(() => (initial.length ? toRows(initial) : [{ key: seq++, start: "08:00", end: "09:00", band: null, cells: {} }]));
  const [saturday, setSaturday] = useState(initial.some((b) => b.weekday === 6));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fileNote, setFileNote] = useState("");
  const [pending, start] = useTransition();
  const days = saturday ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];

  const update = (key: number, fn: (r: Row) => Row) => {
    setMsg(null);
    setRows((rs) => rs.map((r) => (r.key === key ? fn(r) : r)));
  };
  const setCell = (key: number, d: number, patch: Partial<Cell>) => update(key, (r) => ({ ...r, cells: { ...r.cells, [d]: { ...(r.cells[d] ?? EMPTY), ...patch } } }));
  const addRow = () =>
    setRows((rs) => {
      const last = rs.at(-1);
      const s = last?.end ?? "08:00";
      const len = last ? Math.max(30, (Number(last.end.slice(0, 2)) * 60 + Number(last.end.slice(3))) - (Number(last.start.slice(0, 2)) * 60 + Number(last.start.slice(3)))) : 60;
      return [...rs, { key: seq++, start: s, end: addMinutes(s, len), band: null, cells: {} }];
    });

  async function onFile(file?: File) {
    setFileNote("");
    setMsg(null);
    if (!file) return;
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const sheets = (await readXlsxFile(file)) as { sheet: string; data: unknown[][] }[];
      const key = groupLabel.replace(/[^0-9a-z]/gi, "").toLowerCase();
      const byName = sheets.find((s) => s.sheet.replace(/[^0-9a-z]/gi, "").toLowerCase().includes(key));
      const parsed = (byName ? [byName, ...sheets] : sheets).map((s) => ({ s, p: parseSchedule(s.data, subjects) })).find((x) => x.p.blocks.length);
      if (!parsed) {
        setFileNote(parseSchedule(sheets[0]?.data ?? [], subjects).error ?? "No encontramos un horario en el archivo.");
        return;
      }
      setRows(toRows(parsed.p.blocks.map((b) => ({ ...b, room: null }))));
      setSaturday(parsed.p.blocks.some((b) => b.weekday === 6));
      const notes = [`Leímos ${parsed.p.blocks.length} clases de la hoja «${parsed.s.sheet}». Revise la tabla y guarde.`];
      if (parsed.p.asText.length) notes.push(`Quedan como texto (no son materias del sistema): ${parsed.p.asText.join(", ")}.`);
      setFileNote(notes.join(" "));
    } catch {
      setFileNote("No pudimos leer el archivo. Debe ser Excel (.xlsx).");
    }
  }

  function save() {
    const blocks = rows.flatMap((r) =>
      days.flatMap((d) => {
        const c = r.band !== null ? { subject_id: "", label: r.band } : r.cells[d];
        if (!c || (!c.subject_id && !c.label.trim())) return [];
        return [{ weekday: d, starts_at: r.start, ends_at: r.end, subject_id: c.subject_id || null, label: c.subject_id ? null : c.label.trim(), room: null }];
      }),
    );
    start(async () => {
      const res = await saveSchedule(groupId, blocks);
      setMsg({ ok: res.ok, text: res.ok ? `Horario de ${groupLabel} guardado. Familias y maestros ya lo ven.` : res.error });
    });
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <label className="min-w-64 flex-1">
          <span className="mb-1 block font-medium">Cargar desde Excel</span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="block w-full rounded-xl border border-dashed border-line bg-white p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-semibold file:text-brand"
          />
        </label>
        <p className="max-w-md text-sm text-muted">El horario que ya tienen: días como columnas y horas en la primera columna. Si trae una hoja por grupo, usamos la de {groupLabel}.</p>
        {fileNote && (
          <div className="w-full">
            <Notice>{fileNote}</Notice>
          </div>
        )}
      </Card>

      <Card className="p-3 sm:p-4">
        <div className="-mx-3 overflow-x-auto px-3 sm:-mx-4 sm:px-4">
          <table className="w-full min-w-[880px] border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th scope="col" className="w-36 text-left text-xs font-medium text-muted">
                  Horario
                </th>
                {days.map((d) => (
                  <th key={d} scope="col" className="rounded-lg bg-[#efeae1] px-2 py-2 font-semibold">
                    {WEEKDAYS[d]}
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="align-top">
                    <div className="flex items-center gap-1">
                      <input aria-label="Inicio" type="time" value={r.start} onChange={(e) => update(r.key, (x) => ({ ...x, start: e.target.value }))} className={cx(sel, "px-1")} />
                      <input aria-label="Fin" type="time" value={r.end} onChange={(e) => update(r.key, (x) => ({ ...x, end: e.target.value }))} className={cx(sel, "px-1")} />
                    </div>
                    <label className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <input type="checkbox" checked={r.band !== null} onChange={(e) => update(r.key, (x) => ({ ...x, band: e.target.checked ? "Recreo" : null }))} className="accent-brand" />
                      Igual toda la semana
                    </label>
                  </td>
                  {r.band !== null ? (
                    <td colSpan={days.length} className="align-top">
                      <input aria-label="Texto de toda la semana" value={r.band} onChange={(e) => update(r.key, (x) => ({ ...x, band: e.target.value }))} className={cx(sel, "bg-[#f4f1ec] text-center")} maxLength={60} />
                    </td>
                  ) : (
                    days.map((d) => {
                      const c = r.cells[d] ?? EMPTY;
                      return (
                        <td key={d} className="align-top">
                          <select aria-label={`${WEEKDAYS[d]} ${r.start}`} value={c.subject_id || (c.text || c.label ? "__texto" : "")} onChange={(e) => setCell(r.key, d, e.target.value === "__texto" ? { subject_id: "", label: c.label || "", text: true } : { subject_id: e.target.value, label: "", text: false })} className={cx(sel, !c.subject_id && !c.label && "text-muted")}>
                            <option value="">—</option>
                            {subjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                            <option value="__texto">Otro (escribir)…</option>
                          </select>
                          {!c.subject_id && (c.text || c.label) && (
                            <input aria-label="Texto" placeholder="Inglés, Artes…" value={c.label} onChange={(e) => setCell(r.key, d, { label: e.target.value })} className={cx(sel, "mt-1")} maxLength={60} />
                          )}
                        </td>
                      );
                    })
                  )}
                  <td className="align-top">
                    <button type="button" aria-label="Quitar renglón" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="min-h-10 min-w-10 rounded-lg text-muted hover:bg-[#efeae1]">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <button type="button" onClick={addRow} className="min-h-10 text-sm font-medium text-brand">
            + Agregar horario
          </button>
          <label className="flex min-h-10 items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={saturday} onChange={(e) => setSaturday(e.target.checked)} className="accent-brand" /> Hay clases en sábado
          </label>
        </div>
      </Card>

      {msg && (
        <Notice tone={msg.ok ? "good" : "error"}>
          {msg.text}{" "}
          {msg.ok && (
            <a href={`/director/horarios?grupo=${groupId}`} className="underline">
              Ver la semana
            </a>
          )}
        </Notice>
      )}
      <Button onClick={save} disabled={pending}>
        {pending ? "Guardando…" : `Guardar horario de ${groupLabel}`}
      </Button>
    </div>
  );
}
