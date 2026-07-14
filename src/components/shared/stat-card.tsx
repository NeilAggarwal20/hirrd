export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-grid p-4">
      <span className="index-figure block text-3xl text-ink">{value}</span>
      <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">{label}</span>
    </div>
  );
}
