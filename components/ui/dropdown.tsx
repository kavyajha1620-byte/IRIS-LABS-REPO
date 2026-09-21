"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Dropdown({
  trigger,
  children,
  align = "right",
  className,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute z-40 mt-1 min-w-[180px] rounded-xl border border-border bg-white p-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  destructive,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors",
        destructive && "text-red-600 hover:bg-red-50",
        className
      )}
    >
      {children}
    </button>
  );
}