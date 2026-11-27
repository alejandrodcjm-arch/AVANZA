import Link from "next/link";
import { Badge, Card, Empty, PageHeader, cx } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";

export const metadata = { title: "Casos" };
const STATUS = { open: "Abierto", escalated: "Con dirección", closed: "Cerrado" } as const;

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const closed = ver === "cerrados";
  let q = supabase
    .from("cases")
    .select("id, status, summary, opened_at, students(first_name, last_name), owner:owner_id(full_name), case_actions(status, due_on)")
    .eq("school_id", membership.schoolId)
    .order("opened_at", { ascending: false });
  q = closed ? q.eq("status", "closed") : q.neq("status", "closed");
  const { data } = await q;
  const today = todayLocal();

  return (
    <>
      <PageHeader title="Casos" subtitle="Cada caso tiene responsable, acciones con fecha y un cierre." />
      <nav className="mb-4 flex gap-2">
        {[
          ["", "Abiertos"],
          ["cerrados", "Cerrados"],
        ].map(([v, l]) => (
          <Link key={v} href={v ? `?ver=${v}` : "?"} className={cx("min-h-10 content-center rounded-full px-4 text-sm", (v === "cerrados") === closed ? "bg-brand text-white" : "bg-card ring-1 ring-line")}>
            {l}
          </Link>
        ))}
      </nav>
      {!data?.length ? (
        <Empty title={closed ? "Sin casos cerrados" : "Sin casos abiertos"}>Los casos se abren desde una alerta con «Dar seguimiento».</Empty>
      ) : (
        <ul className="space-y-2">
          {data.map((c) => {
            const overdue = (c.case_actions ?? []).filter((a) => a.status === "pending" && a.due_on && a.due_on < today).length;
            const pending = (c.case_actions ?? []).filter((a) => a.status === "pending").length;
            return (
              <li key={c.id}>
                <Link href={`/casos/${c.id}`}>
                  <Card className="hover:ring-brand">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {c.students?.first_name} {c.students?.last_name}
                      </span>
                      <Badge tone={c.status === "escalated" ? "care" : c.status === "closed" ? "muted" : "neutral"}>{STATUS[c.status]}</Badge>
                    </div>
                    <p className="mt-1 truncate text-muted">{c.summary || "Seguimiento"}</p>
                    <p className="mt-1 text-sm text-muted">
                      {c.owner?.full_name} · desde {formatShortDate(c.opened_at.slice(0, 10))} · {pending} pendientes
                      {overdue > 0 && <span className="text-care"> · {overdue} vencidas</span>}
                    </p>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
