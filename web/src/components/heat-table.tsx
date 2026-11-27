import { cx } from "./ui";

// Rampa secuencial de un solo tono (más oscuro = mejor promedio). Bajo 6 se marca con texto, no solo color.
const RAMP = ["#f2f7f8", "#d5eaee", "#a9d3dc", "#6fb5c3", "#2f8fa3", "#0b6b7d"];
const step = (v: number) => (v < 6 ? 0 : v < 7 ? 1 : v < 8 ? 2 : v < 8.5 ? 3 : v < 9 ? 4 : 5);

export type HeatCell = { row: string; col: string; value: number | null; note?: string };

/** Tabla de calor: grupos × materias con el promedio en cada celda. */
export function HeatTable({ cells, rowLabel = "Grupo" }: { cells: HeatCell[]; rowLabel?: string }) {
  const rows = [...new Set(cells.map((c) => c.row))].sort();
  const cols = [...new Set(cells.map((c) => c.col))].sort();
  if (!rows.length) return <p className="text-muted">Aún no hay calificaciones capturadas en este periodo.</p>;
  const get = (r: string, c: string) => cells.find((x) => x.row === r && x.col === c);
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th scope="col" className="text-left text-xs font-medium text-muted">
              {rowLabel}
            </th>
            {cols.map((c) => (
              <th key={c} scope="col" className="min-w-16 px-1 pb-1 text-center align-bottom text-[11px] leading-tight font-medium text-muted">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <th scope="row" className="pr-2 text-left font-medium whitespace-nowrap">
                {r}
              </th>
              {cols.map((c) => {
                const cell = get(r, c);
                const v = cell?.value ?? null;
                const k = v === null ? -1 : step(v);
                return (
                  <td key={c} title={`${r} · ${c}: ${v ?? "sin captura"}${cell?.note ? ` · ${cell.note}` : ""}`} className={cx("num h-11 min-w-14 rounded-md text-center font-semibold", k >= 4 ? "text-white" : "text-ink", v === null && "text-muted")} style={{ background: k < 0 ? "#f6f3ee" : RAMP[k] }}>
                    {v === null ? "—" : v.toFixed(1)}
                    {cell?.note && (
                      <span className={cx("mt-0.5 flex items-center justify-center gap-1 text-[11px] leading-none font-medium", k >= 4 ? "text-white" : "text-[#7a4f0f]")}>
                        <span className="size-1.5 rounded-full bg-[#c27c1a]" aria-hidden />
                        {cell.note}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted" aria-hidden>
        <span>Menor</span>
        {RAMP.map((c) => (
          <span key={c} className="h-2.5 w-5 rounded-sm" style={{ background: c }} />
        ))}
        <span>Mayor promedio</span>
        <span className="ml-3 flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-[#c27c1a]" /> alumnos con menos de 6
        </span>
      </div>
    </div>
  );
}
