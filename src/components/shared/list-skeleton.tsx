export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul aria-hidden="true" className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="border-b border-grid py-5">
          <div className="h-4 w-2/3 bg-paper-dim" />
          <div className="mt-2 h-3 w-1/3 bg-paper-dim" />
        </li>
      ))}
    </ul>
  );
}
