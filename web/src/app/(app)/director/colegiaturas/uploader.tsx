"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Card, Field, Input, Notice } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import type { RosterStudent } from "@/lib/import/gradebook";
import { parseTuition } from "@/lib/import/tuition";
import { importTuition } from "./actions";

export function TuitionUploader({ roster, startYear }: { roster: RosterStudent[]; startYear: number }) {
  const [sheets, setSheets] = useState<{ sheet: string; data: unknown[][] }[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [monthly, setMonthly] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [readError, setReadError] = useState("");
  const [result, setResult] = useState<{ ok: boolean; error: string; created: number; updated: number } | null>(null);
  const [pending, start] = useTransition();

  const parsed = useMemo(
    () => (sheets[sheetIdx] ? parseTuition(sheets[sheetIdx].data, roster, { startYear, monthlyAmount: Number(monthly) || undefined, dueDay: Number(dueDay) || 10 }) : null),
    [sheets, sheetIdx, roster, startYear, monthly, dueDay],
  );
  const totals = useMemo(() => {
    const r = parsed?.rows ?? [];
    return { charges: r.length, paid: r.filter((x) => x.paid >= x.amount).length, owed: r.reduce((t, x) => t + x.amount - x.paid, 0) };
  }, [parsed]);

  async function onFile(file?: File) {
    setResult(null);
    setReadError("");
    setSheets([]);
    if (!file) return;
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const all = (await readXlsxFile(file)) as { sheet: string; data: unknown[][] }[];
      setSheets(all);
      const best = all.map((s, i) => ({ i, n: parseTuition(s.data, roster, { startYear, monthlyAmount: 1 }).matched })).sort((a, b) => b.n - a.n)[0];
      setSheetIdx(best?.i ?? 0);
    } catch {
      setReadError("No pudimos leer el archivo. Debe ser Excel (.xlsx).");
    }
  }

  if (result?.ok)
    return (
      <Notice tone="good">
        Listo: {result.created} cargos nuevos y {result.updated} actualizados. Cada familia ya ve su estado de cuenta. Suba el archivo cada vez que lo actualice: no se duplica nada.
      </Notice>
    );

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block font-medium">Control de pagos en Excel</span>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="block w-full rounded-xl border border-dashed border-line bg-white p-4 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-semibold file:text-brand"
        />
        <span className="mt-1 block text-sm text-muted">
          Sirve el reporte de su sistema de caja (Alumno, Concepto, Importe, Vencimiento, Pagado) o su tabla de siempre con una columna por mes (✓, «pagado», el monto o la fecha de pago).
        </span>
      </label>
      {readError && <Notice tone="error">{readError}</Notice>}
      {sheets.length > 1 && (
        <Field label="Hoja">
          <select value={sheetIdx} onChange={(e) => setSheetIdx(Number(e.target.value))} className="min-h-11 w-full rounded-xl border border-line bg-white px-3">
            {sheets.map((s, i) => (
              <option key={s.sheet} value={i}>
                {s.sheet}
              </option>
            ))}
          </select>
        </Field>
      )}
      {parsed?.layout === "meses" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Colegiatura mensual" hint={parsed.needsAmount ? "Su tabla no trae el monto; escríbalo." : "Si la tabla trae el monto por alumno, se usa ese."}>
            <Input inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="3500" />
          </Field>
          <Field label="Día de vencimiento de cada mes">
            <Input inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          </Field>
        </div>
      )}
      {parsed?.error && <Notice tone="error">{parsed.error}</Notice>}
      {parsed && !parsed.error && (
        <Card className="space-y-2 bg-[#f6f3ee]">
          <p>
            Reconocimos a <strong className="num">{parsed.matched}</strong> alumnos · <strong className="num">{totals.charges}</strong> cargos ({totals.paid} pagados) · pendiente total{" "}
            <strong className="num">{formatMoney(totals.owed)}</strong>.
          </p>
          {parsed.unmatched.length > 0 && (
            <p className="text-sm text-[#7a4f0f]">
              No reconocimos ({parsed.unmatched.length}): {parsed.unmatched.slice(0, 12).map((u) => `${u.text} (renglón ${u.row})`).join(", ")}
              {parsed.unmatched.length > 12 && "…"}. Revise que estén dados de alta en Avanza con el mismo nombre.
            </p>
          )}
          {result?.error && <Notice tone="error">{result.error}</Notice>}
          <Button disabled={pending || !parsed.rows.length} onClick={() => start(async () => setResult(await importTuition(parsed.rows)))}>
            {pending ? "Guardando…" : "Guardar estado de cuenta"}
          </Button>
        </Card>
      )}
    </div>
  );
}
