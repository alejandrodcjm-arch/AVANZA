import { Button, Empty, PageHeader, cx } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { markAllRead, openNotification } from "./actions";

export const metadata = { title: "Avisos" };

export default async function NotificationsPage() {
  const session = (await getSession())!;
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("notifications")
    .select("id, title, body, url, created_at, read_at, kind")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(60);
  const unread = (items ?? []).filter((n) => !n.read_at).length;

  return (
    <>
      <PageHeader
        title="Avisos"
        subtitle={session.active?.role === "guardian" ? "Le escribimos poco y solo lo importante: máximo 3 avisos por semana por hijo." : undefined}
        action={
          unread > 0 ? (
            <form action={markAllRead}>
              <Button variant="ghost">Marcar leídos</Button>
            </form>
          ) : undefined
        }
      />
      {!items?.length ? (
        <Empty title="Sin avisos por ahora">Aquí aparecerán el resumen semanal, el resumen del mes y lo que requiera su atención.</Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <form action={openNotification.bind(null, n.id, n.url)}>
                <button className={cx("w-full rounded-card p-4 text-left ring-1 ring-line", n.read_at ? "bg-card" : "bg-brand-soft")}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cx("font-semibold", !n.read_at && "text-brand-dark")}>{n.title}</span>
                    <span className="shrink-0 text-xs text-muted">{formatDateTime(n.created_at)}</span>
                  </div>
                  <p className="mt-1 text-ink/85">{n.body}</p>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
