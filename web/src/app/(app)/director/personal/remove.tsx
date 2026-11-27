"use client";

import { useState, useTransition } from "react";
import { removeStaff } from "../escuela/actions";

export function RemoveStaff({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <span>
      <button
        type="button"
        disabled={pending}
        className="min-h-10 px-2 text-sm text-muted underline"
        onClick={() => {
          if (confirm(`¿Quitar el acceso de ${name}? Sus capturas se conservan.`)) start(async () => setError((await removeStaff(id)).error));
        }}
      >
        Quitar acceso
      </button>
      {error && <span className="block text-sm text-danger">{error}</span>}
    </span>
  );
}
