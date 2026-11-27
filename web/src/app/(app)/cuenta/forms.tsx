"use client";

import { useActionState } from "react";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { requestArco, updateName } from "./actions";

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateName, { ok: false, error: "" });
  return (
    <form action={action} className="space-y-3">
      <Field label="Su nombre" hint="Así le verá la escuela.">
        <Input name="full_name" defaultValue={name} required minLength={3} maxLength={120} autoComplete="name" />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="good">Guardado.</Notice>}
      <Button variant="secondary" disabled={pending}>
        Guardar
      </Button>
    </form>
  );
}

export function ArcoForm() {
  const [state, action, pending] = useActionState(requestArco, { ok: false, error: "" });
  if (state.ok)
    return <Notice tone="good">Recibimos su solicitud. La escuela debe responderle en los plazos de la ley; le avisaremos aquí.</Notice>;
  return (
    <form action={action} className="space-y-3">
      <Field label="¿Qué necesita?">
        <Select name="kind" defaultValue="rectification">
          <option value="access">Saber qué datos tienen (acceso)</option>
          <option value="rectification">Corregir un dato (rectificación)</option>
          <option value="cancellation">Que borren mis datos (cancelación)</option>
          <option value="opposition">Que dejen de usar mis datos para algo (oposición)</option>
        </Select>
      </Field>
      <Field label="Explíquenos">
        <Textarea name="details" required minLength={10} maxLength={2000} placeholder="Por ejemplo: el segundo apellido de mi hija está mal escrito." />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button variant="secondary" disabled={pending}>
        Enviar solicitud
      </Button>
    </form>
  );
}
