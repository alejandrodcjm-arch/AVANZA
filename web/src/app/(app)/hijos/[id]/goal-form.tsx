"use client";

import { useActionState, useState } from "react";
import { Button, Input, Notice } from "@/components/ui";
import { saveGoal } from "./actions";

// Metas de proceso, pequeñas y medibles (Kalil et al.: las metas funcionan mejor que los recordatorios).
const IDEAS = ["Leer 15 minutos cada día", "Entregar todas las tareas", "Llegar a tiempo todos los días", "Preparar la mochila la noche anterior", "Repasar 10 minutos antes de dormir"];

export function GoalForm({ studentId, firstName }: { studentId: string; firstName: string }) {
  const [goal, setGoal] = useState("");
  const [state, action, pending] = useActionState(saveGoal.bind(null, studentId), { error: "" });
  return (
    <form action={action} className="space-y-3">
      <p className="text-muted">Elíjanla juntos: {firstName} se compromete más con una meta que ayudó a escoger.</p>
      <div className="flex flex-wrap gap-2">
        {IDEAS.map((i) => (
          <button key={i} type="button" onClick={() => setGoal(i)} className="min-h-10 rounded-full bg-brand-soft px-3 text-sm text-brand">
            {i}
          </button>
        ))}
      </div>
      <Input name="goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="O escriban la suya" maxLength={300} required minLength={3} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button full disabled={pending || goal.trim().length < 3}>
        Guardar meta del mes
      </Button>
    </form>
  );
}
