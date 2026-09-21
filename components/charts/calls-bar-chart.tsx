"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface ChartDatum {
  [key: string]: string | number;
}

export function CallsBarChart({
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
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{ fontSize: 13, borderRadius: 10 }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}