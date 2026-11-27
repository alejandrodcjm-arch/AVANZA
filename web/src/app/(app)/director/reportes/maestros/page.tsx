import { RangePicker } from "@/components/report-nav";
import { Card, Empty, cx } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { schoolCalendar } from "@/lib/director-context";
import { formatShortDate } from "@/lib/format";
import { pickRange, ranges } from "@/lib/report-range";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";

export const metadata = { title: "Reporte de maestros" };

type Row = {
  teacher: string;
  teacher_id: string;
  groups: string | null;
  attendance_days: number;
  expected_days: number;
  weekly_cuts: number;
  incidents: number;
  recognitions: number;
  summaries_approved: number;
  observations: number;
  last_activity: string | null;
};

export default async function StaffReport({ searchParams }: { searchParams: Promise<{ rango?: string }> }) {
  const { rango } = await searchParams;
  const { membership } = await requireRole("director");
  const supabase = await createClient();
  const today = todayLocal();
  const { year, period } = await schoolCalendar(supabase, membership.schoolId, today);
  const all = ranges(today, period, year);
  const range = pickRange(all, rango);
  const { data } = await supabase.rpc("report_staff", { p_school: membership.schoolId, p_from: range.from, p_to: range.to });
  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div className="space-y-4">
      <RangePicker ranges={all} current={range.key} />
      <p className="text-muted">Lo que cada maestro registró en la app. Sirve para acompañar, no para vigilar: quien va atrasado suele necesitar apoyo o capacitación.</p>
      {!rows.length ? (
        <Empty title="Sin maestros registrados" />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="num w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="px-3 py-2 font-medium">Maestro</th>
                  <th className="px-3 py-2 font-medium">Lista</th>
                  <th className="px-3 py-2 font-medium">Cortes semanales</th>
                  <th className="px-3 py-2 font-medium">Reconoc. / incid.</th>
                  <th className="px-3 py-2 font-medium">Resúmenes</th>
                  <th className="px-3 py-2 font-medium">Observaciones</th>
                  <th className="px-3 py-2 font-medium">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pct = r.expected_days ? Math.round((100 * r.attendance_days) / r.expected_days) : null;
                  return (
                    <tr key={r.teacher_id} className="border-t border-line">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold">{r.teacher}</p>
                        <p className="text-xs text-muted">{r.groups ?? "sin grupos"}</p>
                      </td>
                      <td className={cx("px-3 py-2.5", pct !== null && pct < 90 && "font-semibold text-[#7a4f0f]")}>
                        {pct === null ? "no es titular" : `${pct}%`}
                        {pct !== null && <span className="block text-xs text-muted">{r.attendance_days} de {r.expected_days} días</span>}
                      </td>
                      <td className="px-3 py-2.5">{r.weekly_cuts}</td>
                      <td className="px-3 py-2.5">
                        {r.recognitions} / {r.incidents}
                      </td>
                      <td className="px-3 py-2.5">{r.summaries_approved}</td>
                      <td className="px-3 py-2.5">{r.observations}</td>
                      <td className="px-3 py-2.5">{r.last_activity ? formatShortDate(r.last_activity) : "nunca"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
