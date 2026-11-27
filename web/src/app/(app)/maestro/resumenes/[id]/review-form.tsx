"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { countWords, MAX_WORDS, validateText } from "@/lib/ai/validate";
import type { Snapshot } from "@/lib/ai/snapshot";
import { Button, Notice, Textarea } from "@/components/ui";
import { approve, regenerate } from "./actions";

export function ReviewForm({ summaryId, nextId, initialText, snapshot, approved, aiErrors }: { summaryId: string; nextId: string | null; initialText: string; snapshot: Snapshot; approved: boolean; aiErrors: string[] }) {
  const [text, setText] = useState(initialText);
  const [state, action, pending] = useActionState(approve.bind(null, summaryId, nextId), { error: "" });
  const [regenPending, startRegen] = useTransition();
  const warnings = useMemo(() => (text.trim() ? validateText(text, snapshot) : []), [text, snapshot]);
  const words = countWords(text);

  if (approved)
    return (
      <div className="space-y-3 text-lg leading-relaxed">
        {initialText.split(/\n{2,}/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    );

  return (
    <form action={action} className="space-y-3">
      {aiErrors.length > 0 && !initialText && (
        <Notice tone="care">La IA no logró un borrador que cumpla las reglas. Escríbalo usted con los datos de arriba (5 o 6 frases bastan).</Notice>
      )}
      <Textarea name="text" value={text} onChange={(e) => setText(e.target.value)} rows={14} className="text-base" placeholder={`Cómo le fue a ${snapshot.student_first_name}, asistencia, calificaciones, un logro, un punto a mejorar con una acción y una pregunta para platicar en casa.`} />
      <p className={words > MAX_WORDS ? "text-sm font-medium text-care" : "text-sm text-muted"}>
        {words} de {MAX_WORDS} palabras
      </p>
      {warnings.length > 0 && (
        <Notice tone="care">
          <p className="font-semibold">Revise antes de enviar:</p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Notice>
      )}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button full disabled={pending || text.trim().length < 40}>
        {pending ? "Enviando…" : "Aprobar y enviar a la familia"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        full
        disabled={regenPending}
        onClick={() =>
          startRegen(async () => {
            await regenerate(summaryId);
          })
        }
      >
        {regenPending ? "Redactando de nuevo…" : "Pedir otro borrador a la IA"}
      </Button>
    </form>
  );
}
