"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { addBehavior, addObservation, addSensitiveNote } from "../actions";

type Kind = "observation" | "behavior" | "sensitive";

export function StaffNotes({ studentId, firstName, today }: { studentId: string; firstName: string; today: string }) {
  const [kind, setKind] = useState<Kind | null>(null);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button variant={kind === "observation" ? "primary" : "secondary"} onClick={() => setKind("observation")}>
          Observación
        </Button>
        <Button variant={kind === "behavior" ? "primary" : "secondary"} onClick={() => setKind("behavior")}>
          Reporte de conducta
        </Button>
        <Button variant={kind === "sensitive" ? "primary" : "secondary"} onClick={() => setKind("sensitive")}>
          Nota confidencial
        </Button>
      </div>
      <div className="mt-4">
        {kind === "observation" && <ObservationForm key="o" studentId={studentId} firstName={firstName} />}
        {kind === "behavior" && <BehaviorForm key="b" studentId={studentId} today={today} />}
        {kind === "sensitive" && <SensitiveForm key="s" studentId={studentId} />}
      </div>
    </div>
  );
}

function ObservationForm({ studentId, firstName }: { studentId: string; firstName: string }) {
  const [state, action, pending] = useActionState(addObservation.bind(null, studentId), { error: "" });
  if (state.ok) return <Notice tone="good">Guardada. Se tomará en cuenta en el resumen del mes.</Notice>;
  return (
    <form action={action} className="space-y-3">
      <Field label="Observación" hint={`Algo concreto que hizo ${firstName}: un avance, un esfuerzo, algo que practicar. Puede aparecer en el resumen para la familia.`}>
        <Textarea name="body" required minLength={5} maxLength={1000} placeholder="Ej. Ya resuelve sumas de fracciones con el mismo denominador." />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button disabled={pending}>Guardar observación</Button>
    </form>
  );
}

function BehaviorForm({ studentId, today }: { studentId: string; today: string }) {
  const [state, action, pending] = useActionState(addBehavior.bind(null, studentId), { error: "" });
  if (state.ok) return <Notice tone="good">Reporte guardado.</Notice>;
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <Input type="date" name="occurred_on" defaultValue={today} max={today} required />
        </Field>
        <Field label="Gravedad">
          <Select name="severity" defaultValue="minor">
            <option value="minor">Leve</option>
            <option value="moderate">Moderada</option>
            <option value="serious">Grave</option>
          </Select>
        </Field>
      </div>
      <Field label="Qué pasó" hint="Describa la conducta, no a la persona. Ej. «interrumpió la clase 3 veces», no «es grosero».">
        <Textarea name="description" required minLength={5} maxLength={1000} />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button disabled={pending}>Guardar reporte</Button>
    </form>
  );
}

function SensitiveForm({ studentId }: { studentId: string }) {
  const [state, action, pending] = useActionState(addSensitiveNote.bind(null, studentId), { error: "" });
  if (state.ok) return <Notice tone="good">Nota confidencial guardada.</Notice>;
  return (
    <form action={action} className="space-y-3">
      <Notice tone="care">
        Solo la ve el personal del alumno. Nunca llega a la familia ni a la inteligencia artificial. Úsela para salud, situación familiar u otros datos sensibles.
      </Notice>
      <Field label="Nota confidencial">
        <Textarea name="body" required minLength={5} maxLength={2000} />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button disabled={pending}>Guardar nota</Button>
    </form>
  );
}
