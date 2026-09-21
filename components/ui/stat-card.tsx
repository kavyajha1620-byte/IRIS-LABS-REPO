import * as React from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendGood,
  hint,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  trend?: string;
  trendGood?: boolean;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs", trendGood === false ? "text-red-600" : "text-emerald-600")}>
              {trend}
            </p>
          )}
          {!trend && hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: `${accent ?? "#4f46e5"}1a`,
              color: accent ?? "#4f46e5",
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}