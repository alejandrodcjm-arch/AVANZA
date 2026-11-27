"use client";

import { useActionState, type ReactNode } from "react";
import { Button, Notice } from "./ui";

type Res = { ok: boolean; error: string };

/** Formulario genérico para acciones de servidor que regresan {ok, error}. */
export function ActionForm({
  action,
  children,
  submit = "Guardar",
  success = "Guardado.",
  variant = "primary",
  className,
}: {
  action: (p: Res, f: FormData) => Promise<Res>;
  children?: ReactNode;
  submit?: string;
  success?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false, error: "" });
  return (
    <form action={formAction} className={className ?? "space-y-3"}>
      {children}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="good">{success}</Notice>}
      <Button variant={variant} disabled={pending}>
        {pending ? "Guardando…" : submit}
      </Button>
    </form>
  );
}
