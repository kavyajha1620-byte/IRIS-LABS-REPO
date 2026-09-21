"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export function StatusDonutChart({
  data,
  height = 240,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex w-full flex-col items-center gap-4" style={{ minHeight: height }}>
      <div style={{ width: "100%", height }} className="min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="86%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 13, borderRadius: 10 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="-mt-[170px] text-center">
          <p className="text-2xl font-semibold tabular-nums">{total}</p>
          <p className="text-xs text-muted-foreground">total leads</p>
        </div>
      </div>
      <div className="grid w-full grid-cols-1 gap-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name}
            </span>
            <span className="font-medium tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}