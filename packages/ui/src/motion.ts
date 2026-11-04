/**
 * True when animations should be off: the OS "reduce motion" setting, or the
 * app's own Reduce motion setting (which sets data-reduce-motion on <html>).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.dataset.reduceMotion === "true" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
