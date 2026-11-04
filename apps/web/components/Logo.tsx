/**
 * Draft logo (PLAN.md → "Logo"): a 3×3 rounded grid with one filled dot and a
 * curved rotation arrow round a corner. Single colour via currentColor, so it
 * works on light and dark backgrounds.
 */
export function Logo({ className = "size-8" }: { className?: string }) {
  const cells = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => ({ r, c })));
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" aria-hidden>
      {cells.map(({ r, c }) => (
        <rect key={`${r}${c}`} x={3 + c * 8} y={3 + r * 8} width="6" height="6" rx="1.8" strokeWidth="1.4" />
      ))}
      <circle cx="14" cy="14" r="2.2" fill="currentColor" stroke="none" />
      <path d="M24 2.5a6 6 0 0 1 5.5 5.5" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M29.8 5.2 29.5 8l-2.6-.9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
