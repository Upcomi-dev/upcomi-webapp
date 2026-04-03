import { cn } from "@/lib/utils";

const variants = {
  default: "glass rounded-[var(--radius)]",
  nav: "glass-nav",
  dark: "glass-dark rounded-[var(--radius)]",
} as const;

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variants;
}

export function GlassCard({
  variant = "default",
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div className={cn(variants[variant], className)} {...props}>
      {children}
    </div>
  );
}
