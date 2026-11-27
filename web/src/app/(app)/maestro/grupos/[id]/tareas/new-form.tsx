"use client";

import { useActionState } from "react";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import { createAssignment } from "./actions";

export function NewAssignment({ groupId, subjects, today }: { groupId: string; subjects: { id: string; name: string }[]; today: string }) {
  const [state, action, pending] = useActionState(createAssignment.bind(null, groupId), { error: "" });
  return (
    <form action={action} className="space-y-3">
      <Field label="Tarea">
        <Input name="title" required minLength={3} maxLength={200} placeholder="Ej. Ejercicios de fracciones p. 45" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Materia">
          <Select name="subject_id" required>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Se entregaba">
          <Input type="date" name="due_on" defaultValue={today} required />
        </Field>
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button disabled={pending}>Crear y marcar quién no entregó</Button>
    </form>
  );
}
