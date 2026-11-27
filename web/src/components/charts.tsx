"use client";

import { useEffect, useId, useRef, useState } from "react";

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

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function useWidth(min = 260) {
  const ref = useRef<HTMLElement>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(min, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, w] as const;
}

/**
 * Columnas con eje en cero, rejilla suave, línea de referencia opcional y lectura al pasar el cursor o el dedo.
 * Una sola serie en un color; ámbar solo para "requiere atención" (y se dice en la lectura).
 */
export function Columns({ items, unit = "", height = 200, label, target, max }: { items: Item[]; unit?: string; height?: number; label: string; target?: { y: number; label: string }; max?: number }) {
  const id = useId();
  const [box, W] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  if (!items.length) return <p className="text-muted">Sin datos en este periodo.</p>;
  const H = height;
  const pad = { l: 36, r: 12, t: 16, b: 26 };
  const top = max ?? niceMax(Math.max(...items.map((i) => i.value), target?.y ?? 0));
  const Y = (v: number) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const slot = (W - pad.l - pad.r) / items.length;
  const bw = Math.max(4, Math.min(36, slot * 0.68));
  const X = (i: number) => pad.l + slot * i + slot / 2;
  const ticks = [0, top / 2, top];
  const every = Math.ceil(items.length / Math.max(1, Math.floor((W - pad.l) / 46)));
  const fmt = (v: number) => (Number.isInteger(v) ? v : v.toFixed(1)) + unit;
  const h = hover !== null ? items[hover] : null;

  return (
    <figure ref={box} aria-label={label} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full touch-none" role="img" aria-labelledby={`${id}-t`} onPointerLeave={() => setHover(null)}>
        <title id={`${id}-t`}>{`${label}: ${items.map((i) => `${i.label} ${fmt(i.value)}`).join(", ")}`}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 6} y={Y(t) + 4} textAnchor="end" fontSize={11} fill={INK2}>
              {fmt(t)}
            </text>
          </g>
        ))}
        {items.map((it, i) => {
          const y = Y(Math.max(0, it.value));
          const hgt = H - pad.b - y;
          return (
            <g key={it.label + i} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <rect x={X(i) - slot / 2} y={pad.t} width={slot} height={H - pad.t - pad.b} fill="transparent" />
              {hgt > 0 && (
                <path
                  d={`M${X(i) - bw / 2},${H - pad.b} V${y + Math.min(4, hgt)} q0,-4 4,-4 H${X(i) + bw / 2 - 4} q4,0 4,4 V${H - pad.b} Z`}
                  fill={it.attention ? ATTENTION : SERIES}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              {i % every === 0 && (
                <text x={X(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={INK2}>
                  {it.label}
                </text>
              )}
            </g>
          );
        })}
        {target && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={Y(target.y)} y2={Y(target.y)} stroke={INK} strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.55} />
            <text x={W - pad.r} y={Y(target.y) - 5} textAnchor="end" fontSize={11} fill={INK2}>
              {target.label}
            </text>
          </g>
        )}
        {h && hover !== null && <line x1={X(hover)} x2={X(hover)} y1={pad.t} y2={H - pad.b} stroke={INK2} strokeOpacity={0.25} />}
      </svg>
      {h && (
        <figcaption className="pointer-events-none absolute top-0 left-10 rounded-lg bg-card px-3 py-1.5 text-sm shadow ring-1 ring-line">
          <strong className="num">{fmt(h.value)}</strong> <span className="text-muted">{h.hint ?? h.label}</span>
          {h.attention && <span className="text-[#7a4f0f]"> · atención</span>}
        </figcaption>
      )}
    </figure>
  );
}

/** Avance hacia una meta (cobranza, captura, familias activas). */
export function Meter({ value, max = 100, label, detail, goal }: { value: number; max?: number; label: string; detail?: string; goal?: number }) {
  const pct = Math.max(0, Math.min(100, (100 * value) / (max || 1)));
  const low = goal !== undefined && pct < goal;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-ink">{label}</span>
        <span className="num font-semibold text-ink">{Math.round(pct)}%</span>
      </div>
      <div className="relative mt-1 h-2.5 rounded-full bg-[#efeae1]" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, background: low ? ATTENTION : SERIES }} />
        {goal !== undefined && <span className="absolute -top-0.5 h-3.5 w-0.5 bg-ink/50" style={{ left: `${goal}%` }} aria-hidden />}
      </div>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </div>
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
