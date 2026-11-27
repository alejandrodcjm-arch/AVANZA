import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const btn = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "bg-card text-brand ring-1 ring-line hover:bg-brand-soft",
  ghost: "text-brand hover:bg-brand-soft",
  care: "bg-care text-white hover:brightness-95",
};

type BtnProps = { variant?: keyof typeof btn; full?: boolean };

export function Button({ variant = "primary", full, className, ...p }: ComponentProps<"button"> & BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold transition disabled:opacity-50",
        btn[variant],
        full && "w-full",
        className,
      )}
    />
  );
}

export function ButtonLink({ variant = "primary", full, className, ...p }: ComponentProps<typeof Link> & BtnProps) {
  return (
    <Link
      {...p}
      className={cx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold transition",
        btn[variant],
        full && "w-full",
        className,
      )}
    />
  );
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div {...p} className={cx("rounded-card bg-card p-5 shadow-[0_1px_0_#e4ded3] ring-1 ring-line", className)} />;
}

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: ReactNode; back?: string; action?: ReactNode }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-1 inline-flex min-h-10 items-center text-sm font-medium text-brand">
            ← Regresar
          </Link>
        )}
        <h1 className="text-2xl leading-tight font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-medium">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-sm text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-sm font-medium text-danger">{error}</span>}
    </label>
  );
}

export const inputClass =
  "block w-full min-h-12 rounded-xl border border-line bg-white px-4 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none";

export function Input(p: ComponentProps<"input">) {
  return <input {...p} className={cx(inputClass, p.className)} />;
}

export function Textarea(p: ComponentProps<"textarea">) {
  return <textarea {...p} className={cx(inputClass, "min-h-28 py-3 leading-relaxed", p.className)} />;
}

export function Select(p: ComponentProps<"select">) {
  return <select {...p} className={cx(inputClass, "appearance-auto", p.className)} />;
}

const tones = {
  neutral: "bg-brand-soft text-brand",
  care: "bg-care-soft text-[#7a4f0f]",
  good: "bg-good-soft text-good",
  muted: "bg-[#efebe4] text-muted",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium", tones[tone])}>{children}</span>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line px-5 py-8 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-muted">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "neutral", children }: { tone?: "neutral" | "care" | "good" | "error"; children: ReactNode }) {
  const t = {
    neutral: "bg-brand-soft text-brand-dark",
    care: "bg-care-soft text-[#6b450d]",
    good: "bg-good-soft text-[#2b5a40]",
    error: "bg-[#f8e6e2] text-danger",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-xl px-4 py-3", t)}>
      {children}
    </div>
  );
}

/** Número grande con su etiqueta (asistencia, calificaciones). */
export function Stat({ value, label, tone }: { value: ReactNode; label: string; tone?: "care" | "good" }) {
  return (
    <div>
      <div className={cx("num text-3xl font-bold", tone === "care" && "text-care", tone === "good" && "text-good")}>{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

/** Flecha de tendencia contra el periodo anterior del mismo alumno (nunca contra el grupo). */
export function Trend({ delta }: { delta: number | null | undefined }) {
  if (delta === null || delta === undefined) return <span className="text-sm text-muted">primer periodo</span>;
  if (Math.abs(delta) < 0.05) return <span className="text-sm text-muted">igual que el periodo anterior</span>;
  const up = delta > 0;
  return (
    <span className={cx("text-sm font-medium", up ? "text-good" : "text-care")}>
      {up ? "▲ subió" : "▼ bajó"} {Math.abs(delta).toFixed(1)}
    </span>
  );
}
