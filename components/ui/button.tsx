import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "outline" | "success";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none select-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary/90 shadow-sm",
  secondary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
  outline: "border border-border bg-card hover:bg-muted text-foreground",
  ghost: "hover:bg-muted text-foreground",
  destructive: "bg-red-600 text-white hover:bg-red-500 shadow-sm",
  success: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-lg",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-11 px-5 text-sm rounded-xl",
  icon: "h-9 w-9 rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";