import { cn } from "@/lib/utils";

export function CircuitMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("text-primary", className)}
      fill="none"
      aria-hidden
    >
      <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="5.5" r="2.15" fill="currentColor" />
      <circle cx="25.2" cy="21.25" r="2.15" fill="currentColor" />
      <circle cx="6.8" cy="21.25" r="2.15" fill="currentColor" />
    </svg>
  );
}
