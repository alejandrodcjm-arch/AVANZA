"use client";

import { useId, useRef, useState } from "react";

// Una serie = un color (validado: contraste ≥3:1, croma ≥0.10). El ámbar marca "requiere atención"
// y siempre va con etiqueta; el texto nunca usa el color de la serie.
export const SERIES = "#00869c";
export const ATTENTION = "#c27c1a";
const GRID = "#ece7de";
const INK = "#1f2a2c";
const INK2 = "#5d6b6e";

type Item = { label: string; value: number; hint?: string; attention?: boolean };

/** Barras horizontales: categoría → cantidad. Valor en la punta; la propia lista es la tabla. */
export function BarList({ items, unit = "", max, empty = "Sin datos en este periodo." }: { items: Item[]; unit?: string; max?: number; empty?: string }) {
  if (!items.length) return <p className="text-muted">{empty}</p>;
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.label} title={it.hint ?? `${it.label}: ${it.value}${unit}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{it.label}</span>
            <span className="num shrink-0 font-semibold text-ink">
              {it.value}
              {unit}
              {it.attention && <span className="ml-1 font-normal text-[#7a4f0f]">· atención</span>}
            </span>
          </div>
          <div className="mt-1 h-3 rounded-r bg-[#f3efe8]" aria-hidden>
            <div
              className="h-3 rounded-r-[4px]"
              style={{ width: `${Math.max(it.value > 0 ? 2 : 0, (100 * it.value) / top)}%`, background: it.attention ? ATTENTION : SERIES }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Columnas verticales con valor en el tope y tooltip al pasar el dedo o el cursor. */
export function Columns({ items, unit = "", height = 160, label }: { items: Item[]; unit?: string; height?: number; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!items.length) return <p className="text-muted">Sin datos en este periodo.</p>;
  const top = Math.max(...items.map((i) => i.value), 1);
  const w = 100 / items.length;
  return (
    <figure aria-label={label} className="relative">
      <div className="flex items-end gap-[2px] border-b border-[#ddd6ca]" style={{ height }}>
        {items.map((it, i) => (
          <button
            type="button"
            key={it.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`${it.label}: ${it.value}${unit}`}
            className="flex h-full flex-col items-center justify-end"
            style={{ width: `${w}%` }}
          >
            <span className="num mb-1 text-xs font-semibold text-ink">{it.value > 0 ? `${it.value}${unit}` : ""}</span>
            <span
              className="w-full max-w-6 rounded-t-[4px]"
              style={{ height: `${(Math.max(0, it.value) / top) * (height - 22)}px`, background: it.attention ? ATTENTION : SERIES, opacity: hover === null || hover === i ? 1 : 0.55 }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {items.map((it) => (
          <span key={it.label} className="truncate text-center text-[11px] text-muted" style={{ width: `${w}%` }}>
            {it.label}
          </span>
        ))}
      </div>
      {hover !== null && items[hover].hint && (
        <figcaption className="pointer-events-none absolute top-0 right-0 rounded-lg bg-card px-3 py-2 text-sm shadow ring-1 ring-line">
          <strong className="num">
            {items[hover].value}
            {unit}
          </strong>{" "}
          <span className="text-muted">{items[hover].hint}</span>
        </figcaption>
      )}
    </figure>
  );
}

/** Línea en el tiempo (ej. % de asistencia diaria) con cruz y lectura al pasar el cursor o el dedo. */
export function LineChart({ points, unit = "", min, max, label, target }: { points: { x: string; label: string; y: number }[]; unit?: string; min?: number; max?: number; label: string; target?: { y: number; label: string } }) {
  const id = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <p className="text-muted">Se necesitan al menos dos días con datos.</p>;
  const W = 640;
  const H = 200;
  const pad = { l: 34, r: 44, t: 12, b: 22 };
  const ys = points.map((p) => p.y);
  const lo = min ?? Math.floor(Math.min(...ys) - 2);
  const hi = max ?? Math.ceil(Math.max(...ys) + 1);
  const X = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (points.length - 1);
  const Y = (v: number) => pad.t + ((hi - v) * (H - pad.t - pad.b)) / (hi - lo || 1);
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const area = `${d} L${X(points.length - 1)},${H - pad.b} L${X(0)},${H - pad.b} Z`;
  const ticks = [lo, (lo + hi) / 2, hi].map((t) => Math.round(t));
  const last = points[points.length - 1];

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((x - pad.l) / (W - pad.l - pad.r)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  return (
    <figure aria-label={label} className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-labelledby={`${id}-t`}>
        <title id={`${id}-t`}>{`${label}. Último: ${last.y}${unit} (${last.label}).`}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 6} y={Y(t) + 4} textAnchor="end" fontSize={11} fill={INK2}>
              {t}
            </text>
          </g>
        ))}
        {target && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={Y(target.y)} y2={Y(target.y)} stroke={INK2} strokeWidth={1} strokeOpacity={0.5} />
            <text x={W - pad.r + 4} y={Y(target.y) + 4} fontSize={10} fill={INK2}>
              {target.label}
            </text>
          </g>
        )}
        <path d={area} fill={SERIES} fillOpacity={0.1} />
        <path d={d} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={X(points.length - 1)} cy={Y(last.y)} r={4.5} fill={SERIES} stroke="#fff" strokeWidth={2} />
        <text x={X(points.length - 1) + 8} y={Y(last.y) + 4} fontSize={12} fontWeight={600} fill={INK}>
          {last.y}
          {unit}
        </text>
        <text x={pad.l} y={H - 4} fontSize={11} fill={INK2}>
          {points[0].label}
        </text>
        <text x={W - pad.r} y={H - 4} fontSize={11} fill={INK2} textAnchor="end">
          {last.label}
        </text>
        {hover !== null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={pad.t} y2={H - pad.b} stroke={INK2} strokeWidth={1} />
            <circle cx={X(hover)} cy={Y(points[hover].y)} r={5} fill={SERIES} stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && (
        <figcaption className="pointer-events-none absolute top-0 left-10 rounded-lg bg-card px-3 py-1.5 text-sm shadow ring-1 ring-line">
          <strong className="num">
            {points[hover].y}
            {unit}
          </strong>{" "}
          <span className="text-muted">{points[hover].label}</span>
        </figcaption>
      )}
    </figure>
  );
}

/** Mini línea de calificaciones de un alumno por periodo (contra sí mismo, nunca contra otros). */
export function Sparkline({ values, labels }: { values: number[]; labels: string[] }) {
  if (values.length < 2) return null;
  const W = 72;
  const H = 24;
  const lo = 5;
  const hi = 10;
  const X = (i: number) => 3 + (i * (W - 6)) / (values.length - 1);
  const Y = (v: number) => 3 + ((hi - v) * (H - 6)) / (hi - lo);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={labels.map((l, i) => `${l}: ${values[i]}`).join(", ")}>
      <path d={values.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`).join(" ")} fill="none" stroke={SERIES} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={X(values.length - 1)} cy={Y(values[values.length - 1])} r={3} fill={SERIES} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}
