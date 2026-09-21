"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { ChartDatum } from "./calls-bar-chart";

export function LeadsAreaChart({
  data,
  xKey,
  yKey,
  color = "#4f46e5",
  height = 260,
}: {
  data: ChartDatum[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }} className="min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 13, borderRadius: 10 }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${color.replace("#", "")})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}