"use client";

import { useState, useTransition } from "react";
import { announce } from "./actions";

/** Mandar el aviso a las familias de un evento ya guardado (una sola vez). */
export function AnnounceButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            if (!confirm("¿Avisar a las familias? Les llegará una notificación con la fecha.")) return;
            setErr(await announce(id));
          })
        }
        className="min-h-8 text-sm text-brand underline"
      >
        {pending ? "Avisando…" : "Avisar a familias"}
      </button>
      {err && <span className="text-sm text-danger">{err}</span>}
    </span>
  );
}
