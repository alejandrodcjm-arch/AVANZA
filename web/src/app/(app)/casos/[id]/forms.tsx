"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { ACTION_LABEL } from "@/lib/alerts";
import { addAction, closeCase, completeAction } from "../actions";

export function AddActionForm({ caseId }: { caseId: string }) {
  const [state, action, pending] = useActionState(addAction.bind(null, caseId), { error: "", n: 0 });
  return (
    <form action={action} className="space-y-3" key={state.n ?? 0}>
      <Field label="Siguiente acción">
        <Select name="action_type" defaultValue="cita_papas">
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Detalle">
        <Input name="description" required minLength={3} placeholder="Ej. Llamar a la mamá para agendar cita" />
      </Field>
      <Field label="Para cuándo (opcional)">
        <Input type="date" name="due_on" />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button variant="secondary" disabled={pending}>
        Agregar acción
      </Button>
    </form>
  );
}

export function CompleteActionForm({ caseId, actionId }: { caseId: string; actionId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(completeAction.bind(null, caseId, actionId), { error: "" });
  if (!open)
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Marcar hecha
      </Button>
    );
  return (
    <form action={action} className="mt-2 space-y-2">
      <Input name="result" required minLength={3} placeholder="¿Qué resultó?" autoFocus />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button disabled={pending}>Guardar</Button>
    </form>
  );
}

export function CloseCaseForm({ caseId }: { caseId: string }) {
  const [state, action, pending] = useActionState(closeCase.bind(null, caseId), { error: "" });
  return (
    <form action={action} className="space-y-3">
      <Field label="¿Cómo terminó?" hint="Queda en el historial del alumno para el siguiente ciclo.">
        <Textarea name="outcome" required minLength={3} />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button variant="secondary" disabled={pending}>
        Cerrar caso
      </Button>
    </form>
  );
}
