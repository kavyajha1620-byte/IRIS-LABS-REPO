export function FunnelChart({
  data,
  primaryColor = "#4f46e5",
}: {
  data: Array<{ stage: string; count: number }>;
  primaryColor?: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => {
        const pct = Math.round((d.count / max) * 100);
        return (
          <div key={d.stage}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{d.stage}</span>
              <span className="font-medium tabular-nums">{d.count}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: `linear-gradient(90deg, ${primaryColor}99, ${primaryColor})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}