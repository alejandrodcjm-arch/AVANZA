"use client";

/** Imprimir o guardar como PDF (la hoja sale horizontal y sin menús). */
export function PrintButton({ label = "Imprimir o guardar PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-card px-4 font-semibold ring-1 ring-line hover:ring-brand print:hidden">
      {label}
    </button>
  );
}
