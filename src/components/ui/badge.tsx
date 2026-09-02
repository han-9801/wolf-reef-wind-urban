import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase",
  {
    variants: {
      variant: {
        default: "bg-accent text-muted-foreground",
        thought: "bg-accent text-thought",
        action: "bg-primary/10 text-primary",
        observe: "bg-observe/15 text-observe",
        final: "bg-primary text-primary-foreground",
        error: "bg-destructive/15 text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
