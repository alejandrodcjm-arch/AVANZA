"use client";

import { useActionState, useState } from "react";
import { Button, Field, Notice, Textarea } from "@/components/ui";
import { addObservation, addSensitiveNote } from "../actions";

type Kind = "observation" | "sensitive";

export function StaffNotes({ studentId, firstName }: { studentId: string; firstName: string }) {
  const [kind, setKind] = useState<Kind | null>(null);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button variant={kind === "observation" ? "primary" : "secondary"} onClick={() => setKind("observation")}>
          Observación
        </Button>
        <Button variant={kind === "sensitive" ? "primary" : "secondary"} onClick={() => setKind("sensitive")}>
          Nota confidencial
        </Button>
      </div>
      <div className="mt-4">
        {kind === "observation" && <ObservationForm key="o" studentId={studentId} firstName={firstName} />}
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
