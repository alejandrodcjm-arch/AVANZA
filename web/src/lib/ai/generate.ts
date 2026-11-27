import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { env } from "@/lib/env";
import { SYSTEM_PROMPT, assembleSummary, buildUserPrompt, type SummaryParts } from "./prompt";
import type { Snapshot } from "./snapshot";
import { validateSummary } from "./validate";

const partsSchema = z.object({
  como_va: z.string(),
  asistencia: z.string(),
  calificaciones: z.string(),
  logro: z.string(),
  a_mejorar: z.string(),
  pregunta: z.string(),
});

export type DraftResult = { text: string | null; errors: string[]; model: string };

/**
 * Redacta el borrador. Si no pasa el validador, se reintenta una vez diciéndole qué corregir.
 * Si vuelve a fallar, queda para que el maestro lo escriba (needs_manual).
 */
export async function generateDraft(snapshot: Snapshot): Promise<DraftResult> {
  const e = env();
  if (!e.ANTHROPIC_API_KEY) {
    return { text: null, errors: ["La IA no está configurada; redacte el resumen a mano."], model: "none" };
  }
  const client = new Anthropic({ apiKey: e.ANTHROPIC_API_KEY });
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: buildUserPrompt(snapshot) }];

  let last: DraftResult = { text: null, errors: ["Sin respuesta"], model: e.ANTHROPIC_MODEL };
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.messages.parse({
      model: e.ANTHROPIC_MODEL,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages,
      output_config: { format: zodOutputFormat(partsSchema) },
    });
    const parts = res.parsed_output as SummaryParts | null;
    if (!parts) {
      last = { text: null, errors: ["La IA no devolvió el formato esperado."], model: res.model };
      continue;
    }
    const text = assembleSummary(parts, snapshot);
    const errors = validateSummary(parts, text, snapshot);
    last = { text, errors, model: res.model };
    if (errors.length === 0) return last;
    messages.push(
      { role: "assistant", content: JSON.stringify(parts) },
      { role: "user", content: `Corrige estos puntos y devuelve las seis partes otra vez:\n- ${errors.join("\n- ")}` },
    );
  }
  return last;
}
