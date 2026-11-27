"use client";

import { useState, useTransition } from "react";
import { StudentPicker, type PickStudent } from "@/components/student-picker";
import { Button, Field, Input, Notice, Select, Textarea, cx } from "@/components/ui";
import { ACTION_LABEL, CATEGORY_LABEL, LOCATION_LABEL, RECOGNITION, SEVERITY_HELP, SEVERITY_LABEL, familyTemplate } from "@/lib/convivencia";
import type { Enums } from "@/lib/database.types";
import { saveIncident, saveRecognition } from "./actions";

export function ConductPanel({ groupId, students, today, nowTime }: { groupId: string; students: PickStudent[]; today: string; nowTime: string }) {
  const [tab, setTab] = useState<"rec" | "inc">("rec");
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-[#efeae1] p-1" role="tablist">
        {(
          [
            ["rec", "⭐ Reconocer"],
            ["inc", "Reportar incidencia"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx("min-h-11 rounded-lg text-sm font-semibold", tab === k ? "bg-card text-brand shadow-sm" : "text-muted")}>
            {l}
          </button>
        ))}
      </div>
      {tab === "rec" ? <RecognitionForm groupId={groupId} students={students} /> : <IncidentForm groupId={groupId} students={students} today={today} nowTime={nowTime} />}
    </div>
  );
}

function RecognitionForm({ groupId, students }: { groupId: string; students: PickStudent[] }) {
  const [sel, setSel] = useState<string[]>([]);
  const [cat, setCat] = useState<Enums<"recognition_category"> | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <p className="text-muted">Reconozca conductas concretas: cuenta más que un reporte. La familia lo ve en el resumen del viernes. Sin puntos ni rankings.</p>
      <StudentPicker students={students} value={sel} onChange={setSel} />
      <div className="grid grid-cols-3 gap-2">
        {RECOGNITION.map((r) => (
          <button key={r.key} type="button" aria-pressed={cat === r.key} onClick={() => setCat(r.key)} className={cx("flex min-h-16 flex-col items-center justify-center rounded-xl text-sm ring-1", cat === r.key ? "bg-brand text-white ring-brand" : "bg-white ring-line")}>
            <span aria-hidden className="text-lg">
              {r.icon}
            </span>
            {r.label}
          </button>
        ))}
      </div>
      <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="¿Qué hizo? (opcional) Ej. Ayudó a un compañero con las fracciones" aria-label="Qué hizo" />
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Button
        full
        disabled={pending || !sel.length || !cat}
        onClick={() =>
          start(async () => {
            const r = await saveRecognition(groupId, sel, cat!, note);
            setMsg(r.ok ? { tone: "good", text: `Reconocimiento guardado para ${sel.length} alumno${sel.length === 1 ? "" : "s"}.` } : { tone: "error", text: r.error });
            if (r.ok) {
              setSel([]);
              setNote("");
            }
          })
        }
      >
        {pending ? "Guardando…" : "Reconocer"}
      </Button>
    </div>
  );
}

function IncidentForm({ groupId, students, today, nowTime }: { groupId: string; students: PickStudent[]; today: string; nowTime: string }) {
  const [involved, setInvolved] = useState<string[]>([]);
  const [affected, setAffected] = useState<string[]>([]);
  const [showAffected, setShowAffected] = useState(false);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(nowTime);
  const [location, setLocation] = useState<Enums<"incident_location">>("salon");
  const [category, setCategory] = useState<Enums<"incident_category">>("interrupcion");
  const [severity, setSeverity] = useState<Enums<"behavior_severity">>("minor");
  const [action, setAction] = useState<Enums<"incident_action">>("platica");
  const [description, setDescription] = useState("");
  const [familyNote, setFamilyNote] = useState("");
  const [touchedNote, setTouchedNote] = useState(false);
  const [msg, setMsg] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const note = touchedNote ? familyNote : familyTemplate(category, action, false);
  const mentionsOthers = students.some((s) => s.name.split(" ")[0].length > 2 && new RegExp(`\\b${s.name.split(" ")[0]}\\b`, "i").test(note));

  const reset = () => {
    setInvolved([]);
    setAffected([]);
    setDescription("");
    setTouchedNote(false);
    setFamilyNote("");
  };

  return (
    <div className="space-y-4">
      <Field label="¿Quién participó?">
        <StudentPicker students={students} value={involved} onChange={setInvolved} tone="care" disabled={affected} />
      </Field>
      {showAffected ? (
        <Field label="¿Alguien resultó afectado? (no cuenta como reporte para él o ella)">
          <StudentPicker students={students} value={affected} onChange={setAffected} disabled={involved} />
        </Field>
      ) : (
        <button type="button" className="min-h-10 text-sm font-medium text-brand underline" onClick={() => setShowAffected(true)}>
          + Agregar alumno afectado
        </button>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Hora">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="¿Dónde?">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(LOCATION_LABEL) as Enums<"incident_location">[]).map((k) => (
            <button key={k} type="button" aria-pressed={location === k} onClick={() => setLocation(k)} className={cx("min-h-10 rounded-full px-3 text-sm ring-1", location === k ? "bg-brand text-white ring-brand" : "bg-white ring-line")}>
              {LOCATION_LABEL[k]}
            </button>
          ))}
        </div>
      </Field>
      <Field label="¿Qué pasó?">
        <Select value={category} onChange={(e) => setCategory(e.target.value as Enums<"incident_category">)}>
          {(Object.keys(CATEGORY_LABEL) as Enums<"incident_category">[]).map((k) => (
            <option key={k} value={k}>
              {CATEGORY_LABEL[k]}
            </option>
          ))}
        </Select>
      </Field>
      {category === "acoso" && <Notice tone="care">Se abrirá un caso con dirección para seguir el protocolo de acoso escolar (atención, aviso a familias, seguimiento).</Notice>}
      <Field label="Gravedad" hint={SEVERITY_HELP[severity]}>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#efeae1] p-1">
          {(["minor", "moderate", "serious"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={severity === k} onClick={() => setSeverity(k)} className={cx("min-h-11 rounded-lg text-sm font-semibold", severity === k ? (k === "minor" ? "bg-card text-brand" : "bg-care text-white") : "text-muted")}>
              {SEVERITY_LABEL[k]}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Acción que se tomó">
        <Select value={action} onChange={(e) => setAction(e.target.value as Enums<"incident_action">)}>
          {(Object.keys(ACTION_LABEL) as Enums<"incident_action">[]).map((k) => (
            <option key={k} value={k}>
              {ACTION_LABEL[k]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Descripción interna" hint="Solo la ve el personal. Describa la conducta, no a la persona: «empujó en la fila», no «es agresivo».">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={3000} />
      </Field>
      <Field label="Lo que verá cada familia" hint="Se envía igual a la familia de cada alumno, sin nombres de otros niños. Edítelo si quiere.">
        <Textarea
          value={note}
          onChange={(e) => {
            setTouchedNote(true);
            setFamilyNote(e.target.value);
          }}
          maxLength={1000}
        />
      </Field>
      {mentionsOthers && <Notice tone="care">El texto para la familia parece mencionar el nombre de un alumno. Quítelo: cada familia solo debe saber de su hijo.</Notice>}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Button
        full
        variant={severity === "minor" ? "primary" : "care"}
        disabled={pending || (!involved.length && !affected.length) || description.trim().length < 3}
        onClick={() =>
          start(async () => {
            const r = await saveIncident(groupId, { involved, affected, date, time: time || null, location, category, severity, action, description, familyNote: note });
            setMsg(r.ok ? { tone: "good", text: severity === "minor" ? "Guardado. La familia lo verá en el resumen del viernes." : "Guardado y la familia ya fue avisada." } : { tone: "error", text: r.error });
            if (r.ok) reset();
          })
        }
      >
        {pending ? "Guardando…" : "Guardar incidencia"}
      </Button>
    </div>
  );
}
