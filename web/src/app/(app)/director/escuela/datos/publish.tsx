"use client";

import { useState, useTransition } from "react";
import { Button, Notice } from "@/components/ui";

export function PublishNotice({ action }: { action: () => Promise<{ ok: boolean; error: string }> }) {
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  if (msg) return <Notice tone="good">{msg}</Notice>;
  return confirm ? (
    <div className="mt-3 flex gap-2">
      <Button variant="care" disabled={pending} onClick={() => start(async () => setMsg((await action()).ok ? "Publicada. Se pedirá aceptación de nuevo." : "No se pudo publicar."))}>
        Sí, publicar
      </Button>
      <Button variant="ghost" onClick={() => setConfirm(false)}>
        Cancelar
      </Button>
    </div>
  ) : (
    <Button variant="secondary" className="mt-3" onClick={() => setConfirm(true)}>
      Publicar nueva versión
    </Button>
  );
}
