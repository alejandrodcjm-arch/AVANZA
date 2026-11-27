"use client";

import { useState, useTransition } from "react";
import { convertAlert, dismissAlert } from "@/app/(app)/alumnos/actions";
import { Button, Input, Notice } from "./ui";

export function AlertActions({ alertId, studentFirstName }: { alertId: string; studentFirstName: string }) {
  const [mode, setMode] = useState<"idle" | "dismiss" | "case">("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError("");
      const res = mode === "dismiss" ? await dismissAlert(alertId, text) : await convertAlert(alertId, text);
      if (res?.error) setError(res.error);
    });

  if (mode === "idle")
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setMode("case")}>
          Dar seguimiento
        </Button>
        <Button variant="ghost" onClick={() => setMode("dismiss")}>
          Descartar
        </Button>
      </div>
    );

  return (
    <div className="mt-3 space-y-2">
      <Input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={mode === "dismiss" ? "¿Por qué no requiere seguimiento? (ej. faltas justificadas por enfermedad)" : `¿Qué se sabe de ${studentFirstName}? (opcional)`}
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={pending || (mode === "dismiss" && text.trim().length < 3)}>
          {mode === "dismiss" ? "Descartar alerta" : "Abrir caso"}
        </Button>
        <Button variant="ghost" onClick={() => setMode("idle")}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
