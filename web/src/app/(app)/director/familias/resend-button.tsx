"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { resendInvitations } from "./actions";

export function ResendButton({ ids, label, variant = "secondary" }: { ids: string[]; label: string; variant?: "secondary" | "ghost" | "primary" }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState("");
  if (done) return <span className="text-sm text-good">{done}</span>;
  return (
    <Button
      variant={variant}
      disabled={pending || ids.length === 0}
      onClick={() =>
        start(async () => {
          const r = await resendInvitations(ids);
          setDone(r.failed.length ? `Enviadas: ${r.sent}. Fallaron: ${r.failed.length}` : `Enviada${r.sent === 1 ? "" : "s"} (${r.sent})`);
        })
      }
    >
      {pending ? "Enviando…" : label}
    </Button>
  );
}
