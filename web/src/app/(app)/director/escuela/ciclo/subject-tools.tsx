"use client";

import { useState, useTransition } from "react";
import { Button, Notice } from "@/components/ui";
import { CLASSIC_SUBJECTS, NEM_SUBJECTS } from "@/lib/school-templates";
import { addSubjects, deleteSubject } from "../actions";

export function SubjectTemplates() {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" disabled={pending} onClick={() => start(async () => void (await addSubjects(NEM_SUBJECTS)))}>
        Agregar campos formativos (NEM)
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => start(async () => void (await addSubjects(CLASSIC_SUBJECTS)))}>
        Agregar asignaturas tradicionales
      </Button>
    </div>
  );
}

export function DeleteSubject({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        disabled={pending}
        className="min-h-10 px-2 text-sm text-muted underline"
        onClick={() => start(async () => setError((await deleteSubject(id)).error))}
      >
        Quitar
      </button>
      {error && <Notice tone="error">{error}</Notice>}
    </>
  );
}
