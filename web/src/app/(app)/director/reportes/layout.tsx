import { ReportNav } from "@/components/report-nav";
import { PageHeader } from "@/components/ui";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Reportes" subtitle="Datos al día, sin pedir nada a los maestros." />
      <ReportNav />
      {children}
    </>
  );
}
