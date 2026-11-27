"use client";

import { useState, useTransition } from "react";
import { Button, Card, Notice } from "@/components/ui";
import { parseRoster, previewStats, type ParseResult } from "@/lib/import/roster";
import { commitImport, type ImportResult } from "./actions";

/** CSV sencillo con comillas (por si exportan de otro sistema). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const sep = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const endRow = () => {
    row.push(cell);
    rows.push(row);
    row = [];
    cell = "";
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else cell += c;
  }
  if (cell || row.length) endRow();
  return rows;
}

export function Importer() {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [readError, setReadError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [sendNow, setSendNow] = useState(true);
  const [pending, start] = useTransition();

  async function onFile(file: File | undefined) {
    setParsed(null);
    setResult(null);
    setReadError("");
    if (!file) return;
    setFileName(file.name);
    try {
      let sheet: unknown[][];
      if (/\.csv$/i.test(file.name)) {
        sheet = parseCsv(await file.text());
      } else {
        const { default: readXlsxFile } = await import("read-excel-file/browser");
        const sheets = await readXlsxFile(file);
        sheet = (sheets.find((s) => s.sheet.toLowerCase() === "alumnos") ?? sheets[0]).data;
      }
      setParsed(parseRoster(sheet));
    } catch {
      setReadError("No pudimos leer el archivo. Use la plantilla en Excel (.xlsx) o un CSV.");
    }
  }

  const stats = parsed ? previewStats(parsed.rows) : null;

  if (result?.ok)
    return (
      <Card>
        <h2 className="text-lg font-semibold">Importación lista</h2>
        <ul className="mt-2 space-y-1">
          <li>{result.students_created} alumnos nuevos</li>
          {!!result.students_moved && <li>{result.students_moved} alumnos cambiaron de grupo</li>}
          {!!result.students_unchanged && <li>{result.students_unchanged} alumnos ya estaban registrados (sin cambios)</li>}
          {!!result.groups_created && <li>{result.groups_created} grupos nuevos</li>}
          <li>{result.invitations_sent} familias invitadas por correo</li>
        </ul>
        {!!result.invitations_failed?.length && <Notice tone="care">No se pudo enviar a: {result.invitations_failed.join(", ")}. Puede reenviar desde Familias.</Notice>}
        <p className="mt-3 text-sm text-muted">Siguiente paso: asigne maestros a cada grupo en Escuela › Personal.</p>
      </Card>
    );

  return (
    <div className="space-y-4">
      <Card>
        <label className="block">
          <span className="font-semibold">1. Elija el archivo</span>
          <input
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="mt-2 block w-full rounded-xl border border-dashed border-line bg-white p-4 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-semibold file:text-brand"
          />
        </label>
        <a href="/plantilla-importacion.xlsx" className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-brand underline" download>
          Descargar la plantilla de Excel
        </a>
        {readError && <Notice tone="error">{readError}</Notice>}
      </Card>

      {parsed && stats && (
        <Card>
          <h2 className="font-semibold">2. Revise antes de guardar</h2>
          <p className="mt-2">
            <strong className="num">{stats.students}</strong> alumnos en {stats.groups.length} grupos ({stats.groups.map(([g, n]) => `${g}: ${n}`).join(", ")}) y{" "}
            <strong className="num">{stats.guardians}</strong> familiares con correo.
          </p>
          {parsed.errors.length > 0 && (
            <Notice tone="error">
              <p className="font-semibold">{parsed.errors.length} renglones con errores no se importarán:</p>
              <ul className="mt-1 max-h-48 list-disc overflow-auto pl-5 text-sm">
                {parsed.errors.map((e, i) => (
                  <li key={i}>
                    Renglón {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </Notice>
          )}
          {parsed.warnings.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-care">{parsed.warnings.length} avisos (se importan de todos modos)</summary>
              <ul className="mt-1 max-h-48 list-disc overflow-auto pl-5 text-sm text-muted">
                {parsed.warnings.map((w, i) => (
                  <li key={i}>
                    Renglón {w.row}: {w.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <label className="mt-4 flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} className="size-5" />
            Enviar ya las invitaciones por correo a las familias
          </label>
          <Button
            full
            className="mt-3"
            disabled={pending || stats.students === 0}
            onClick={() => start(async () => setResult(await commitImport(parsed.rows, fileName, sendNow)))}
          >
            {pending ? "Importando… no cierre esta página" : `Importar ${stats.students} alumnos`}
          </Button>
          {result?.error && <Notice tone="error">{result.error}</Notice>}
          <p className="mt-2 text-sm text-muted">Puede volver a subir el mismo archivo: no se duplica nada.</p>
        </Card>
      )}
    </div>
  );
}
