"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Card, Field, Notice, Select, cx } from "@/components/ui";
import { parseGradebook, type MarkMeaning, type RosterStudent } from "@/lib/import/gradebook";
import { commitGradebook } from "./actions";

type Opt = { id: string; name: string };

export function GradebookUploader({ groupId, subjects, periods, currentPeriod, roster }: { groupId: string; subjects: Opt[]; periods: Opt[]; currentPeriod: string; roster: RosterStudent[] }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [periodId, setPeriodId] = useState(currentPeriod);
  const [sheet, setSheet] = useState<unknown[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [allSheets, setAllSheets] = useState<{ sheet: string; data: unknown[][] }[]>([]);
  const [x, setX] = useState<MarkMeaning>("x_missing");
  const [blankIsMissing, setBlankIsMissing] = useState(false);
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [useGrades, setUseGrades] = useState(true);
  const [readError, setReadError] = useState("");
  const [result, setResult] = useState<{ ok: boolean; error: string; activities?: number; missing?: number; grades?: number } | null>(null);
  const [pending, start] = useTransition();

  const parsed = useMemo(() => (sheet ? parseGradebook(sheet, roster, { x, blankIsMissing }) : null), [sheet, roster, x, blankIsMissing]);
  const nameOf = useMemo(() => new Map(roster.map((s) => [s.id, `${s.first_name} ${s.last_name}`])), [roster]);
  const hasX = useMemo(() => Boolean(sheet?.some((r) => r?.some((v) => String(v ?? "").trim().toLowerCase() === "x"))), [sheet]);

  async function onFile(file?: File) {
    setResult(null);
    setReadError("");
    setSheet(null);
    setSkip(new Set());
    if (!file) return;
    setFileName(file.name);
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const sheets = (await readXlsxFile(file)) as { sheet: string; data: unknown[][] }[];
      setAllSheets(sheets);
      setSheetNames(sheets.map((s) => s.sheet));
      // La hoja con más nombres reconocidos gana.
      const best = sheets.map((s) => ({ s, n: parseGradebook(s.data, roster).matched.length })).sort((a, b) => b.n - a.n)[0];
      setSheet(best.s.data);
    } catch {
      setReadError("No pudimos leer el archivo. Debe ser Excel (.xlsx). Si lo tiene en .xls, ábralo y guárdelo como .xlsx.");
    }
  }

  if (result?.ok)
    return (
      <Notice tone="good">
        Listo: {result.activities} actividades ({result.missing} trabajos sin entregar){result.grades ? ` y ${result.grades} calificaciones` : ""}. Puede volver a subir el archivo cuando lo actualice: no se duplica nada.
      </Notice>
    );

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <Field label="Materia">
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <label className="block">
          <span className="mb-1.5 block font-medium">Su registro en Excel</span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="block w-full rounded-xl border border-dashed border-line bg-white p-4 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-semibold file:text-brand"
          />
          <span className="mt-1 block text-sm text-muted">El que ya usa: con los nombres de sus alumnos y una columna por actividad. No necesita plantilla.</span>
        </label>
        {sheetNames.length > 1 && (
          <Field label="Hoja">
            <Select onChange={(e) => setSheet(allSheets.find((s) => s.sheet === e.target.value)?.data ?? null)} defaultValue="">
              <option value="" disabled>
                Usamos la hoja con más alumnos reconocidos; cambie si no es
              </option>
              {sheetNames.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
          </Field>
        )}
        {readError && <Notice tone="error">{readError}</Notice>}
      </Card>

      {parsed &&
        (parsed.error && !parsed.matched.length ? (
          <Notice tone="error">{parsed.error}</Notice>
        ) : (
          <Card className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Revise antes de guardar</h2>
              <p className="text-muted">
                Reconocimos a <strong className="num text-ink">{parsed.matched.length}</strong> de {roster.length} alumnos.
              </p>
              {parsed.notInFile.length > 0 && (
                <p className="mt-1 text-sm text-[#7a4f0f]">No vienen en el archivo: {parsed.notInFile.map((i) => nameOf.get(i)).join(", ")}. Para ellos no se cambia nada.</p>
              )}
              {parsed.unmatched.length > 0 && (
                <p className="mt-1 text-sm text-[#7a4f0f]">No reconocimos (renglón): {parsed.unmatched.map((u) => `${u.text} (${u.row})`).join(", ")}.</p>
              )}
            </div>

            {hasX && (
              <fieldset>
                <legend className="font-medium">En su registro, la «X» significa…</legend>
                <div className="mt-1 flex gap-2">
                  {(["x_missing", "x_delivered"] as const).map((v) => (
                    <button key={v} type="button" onClick={() => setX(v)} className={cx("min-h-11 rounded-full px-4 text-sm ring-1", x === v ? "bg-brand text-white ring-brand" : "bg-white ring-line")}>
                      {v === "x_missing" ? "No entregó" : "Sí entregó"}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {parsed.activities.some((a) => a.blank > 0) && (
              <fieldset>
                <legend className="font-medium">Las celdas vacías significan…</legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {[false, true].map((v) => (
                    <button key={String(v)} type="button" onClick={() => setBlankIsMissing(v)} className={cx("min-h-11 rounded-full px-4 text-sm ring-1", blankIsMissing === v ? "bg-brand text-white ring-brand" : "bg-white ring-line")}>
                      {v ? "No entregó" : "Aún no lo reviso"}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {parsed.activities.length > 0 && (
              <div>
                <p className="mb-2 font-medium">Actividades ({parsed.activities.length - skip.size} se guardarán)</p>
                <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
                  {parsed.activities.map((a) => (
                    <li key={a.col} className="flex items-start gap-3 px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="mt-1 size-5"
                        checked={!skip.has(a.col)}
                        onChange={() =>
                          setSkip((s) => {
                            const n = new Set(s);
                            if (n.has(a.col)) n.delete(a.col);
                            else n.add(a.col);
                            return n;
                          })
                        }
                        aria-label={`Guardar ${a.title}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{a.title}</p>
                        <p className="text-sm text-muted">
                          {a.delivered} entregaron · {a.missing.length} no entregaron{a.blank && !blankIsMissing ? ` · ${a.blank} en blanco (no se cuentan)` : ""}
                        </p>
                        {a.missing.length > 0 && a.missing.length <= 8 && <p className="text-sm text-[#7a4f0f]">{a.missing.map((i) => nameOf.get(i)).join(", ")}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsed.gradeColumn && (
              <div className="rounded-xl bg-brand-soft p-3">
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 size-5" checked={useGrades} onChange={(e) => setUseGrades(e.target.checked)} />
                  <span>
                    Guardar la columna <strong>«{parsed.gradeColumn.title}»</strong> como calificación ({Object.keys(parsed.gradeColumn.scores).length} alumnos, escala 5 a 10)
                  </span>
                </label>
                {useGrades && (
                  <Select className="mt-2" value={periodId} onChange={(e) => setPeriodId(e.target.value)} aria-label="Periodo">
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            )}

            {result?.error && <Notice tone="error">{result.error}</Notice>}
            <Button
              full
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const acts = parsed.activities
                    .filter((a) => !skip.has(a.col))
                    .map((a) => ({ title: a.title, due_on: a.dueOn, missing: a.missing }));
                  setResult(
                    await commitGradebook(groupId, {
                      subjectId,
                      fileName,
                      activities: acts,
                      grades: parsed.gradeColumn && useGrades ? { periodId, scores: parsed.gradeColumn.scores } : null,
                    }),
                  );
                })
              }
            >
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </Card>
        ))}
    </div>
  );
}
