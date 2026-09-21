import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, color }: { status: string; color?: string }) {
  return (
    <Badge
      className="border"
      style={{
        color: color ?? "#334155",
        backgroundColor: `${color ?? "#64748b"}1a`,
        borderColor: `${color ?? "#64748b"}33`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color ?? "#64748b" }}
      />
      {status}
    </Badge>
  );
}

export function PriorityBadge({ priority, color }: { priority: string; color?: string }) {
  const c = color ?? (priority === "High" ? "#ef4444" : priority === "Medium" ? "#f59e0b" : "#64748b");
  return (
    <Badge
      className="border"
      style={{ color: c, backgroundColor: `${c}1a`, borderColor: `${c}33` }}
    >
      {priority}
    </Badge>
  );
}