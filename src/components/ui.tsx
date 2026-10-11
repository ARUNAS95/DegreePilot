import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("rounded-2xl border border-border bg-surface", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "primary" | "secondary" | "success" | "warning" | "danger";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-surface-muted text-muted",
    primary: "bg-primary-soft text-primary-ink",
    secondary: "bg-secondary-soft text-secondary-ink",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" }) {
  const variants = {
    primary: "bg-primary text-white shadow-sm shadow-primary/20 hover:bg-primary-hover disabled:opacity-60",
    secondary: "border border-border bg-surface text-foreground hover:bg-surface-muted",
    ghost: "text-muted hover:bg-surface-muted hover:text-foreground",
  };
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Label({ children, hint, htmlFor }: { children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
        {children}
      </label>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/15";

export function Rating({ value, label }: { value: number; label?: string }) {
  const tone = value >= 4.3 ? "text-success" : value >= 3.6 ? "text-warning" : "text-danger";
  return (
    <span className={clsx("font-semibold tabular-nums", tone)} title={label}>
      {value.toFixed(1)}
    </span>
  );
}
