import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-11 w-full resize-none rounded-md bg-secondary px-3 py-2.5 text-sm text-foreground shadow-[var(--shadow-border)] placeholder:text-muted-foreground/70 outline-none transition-[box-shadow] duration-150 focus-visible:shadow-[0_0_0_1px_var(--color-ring)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
