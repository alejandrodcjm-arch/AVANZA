"use client";

import { useActionState } from "react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: "email", email: "" });

  if (state.step === "email") {
    return (
      <form action={action} className="space-y-4">
        <Field label="Su correo" hint="El mismo que registró la escuela.">
          <Input name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state.email} autoFocus />
        </Field>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <Button name="intent" value="send" full disabled={pending}>
          {pending ? "Enviando…" : "Enviarme un código"}
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <p>
        Si <strong>{state.email}</strong> está registrado, le llegó un código de 6 dígitos. Escríbalo aquí.
      </p>
      <Field label="Código" hint="Si no lo ve en 2 minutos, revise su carpeta de spam o correo no deseado.">
        <Input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          className="num text-center text-2xl tracking-[0.4em]"
          autoFocus
          required
        />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.info && <Notice tone="good">{state.info}</Notice>}
      <Button name="intent" value="verify" full disabled={pending}>
        {pending ? "Revisando…" : "Entrar"}
      </Button>
      <div className="flex justify-between gap-2">
        <Button type="submit" name="intent" value="resend" variant="ghost" formNoValidate disabled={pending}>
          Enviar otro código
        </Button>
        <Button type="submit" name="intent" value="change" variant="ghost" formNoValidate disabled={pending}>
          Cambiar correo
        </Button>
      </div>
    </form>
  );
}
