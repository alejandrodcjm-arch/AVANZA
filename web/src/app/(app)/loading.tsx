export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-line" />
      <div className="h-28 animate-pulse rounded-card bg-card ring-1 ring-line" />
      <div className="h-28 animate-pulse rounded-card bg-card ring-1 ring-line" />
    </div>
  );
}
