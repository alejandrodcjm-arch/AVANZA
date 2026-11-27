"use client";

import { useActionState } from "react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { inviteAction, type InviteState } from "./actions";

export function InviteForm({ token, maskedEmail, signedInAs }: { token: string; maskedEmail: string; signedInAs?: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteAction.bind(null, token), { step: "start" });

  if (signedInAs) {
    return (
      <form action={action} className="space-y-4">
        <p>Entró como <strong>{signedInAs}</strong>.</p>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <Button name="intent" value="accept-signed-in" full disabled={pending}>
          Aceptar invitación
        </Button>
      </form>
    );
  }

  if (state.step === "start") {
    return (
      <form action={action} className="space-y-4">
        <p>Le enviaremos un código de 6 dígitos a <strong>{maskedEmail}</strong>. No necesita contraseña.</p>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <Button name="intent" value="send" full disabled={pending}>
          {pending ? "Enviando…" : "Enviarme el código"}
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Código" hint="Revise también spam o correo no deseado.">
        <Input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} className="num text-center text-2xl tracking-[0.4em]" autoFocus required />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button name="intent" value="verify" full disabled={pending}>
        {pending ? "Revisando…" : "Entrar"}
      </Button>
      <Button name="intent" value="send" variant="ghost" full formNoValidate disabled={pending}>
        Enviar otro código
      </Button>
    </form>
  );
}
