import {
  UserPlus,
  PhoneCall,
  RefreshCw,
  CalendarClock,
  StickyNote,
  Mail,
  FileDown,
  CheckSquare,
  CalendarCheck,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { Activity } from "@/lib/types";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  lead_created: UserPlus,
  imported: FileDown,
  call: PhoneCall,
  status: RefreshCw,
  followup: CalendarClock,
  note: StickyNote,
  email: Mail,
  task: CheckSquare,
  meeting: CalendarCheck,
};

const colorMap: Record<string, string> = {
  lead_created: "#4f46e5",
  imported: "#06b6d4",
  call: "#0ea5e9",
  status: "#8b5cf6",
  followup: "#f59e0b",
  note: "#64748b",
  email: "#10b981",
  task: "#f97316",
  meeting: "#22c55e",
};

export function Timeline({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No activity yet. Log a call, add a note or change status to start the timeline.
      </p>
    );
  }

  return (
    <ol className="relative flex flex-col">
      {activities.map((a, i) => {
        const Icon = iconMap[a.type];
        const color = colorMap[a.type] ?? "#64748b";
        const isLast = i === activities.length - 1;
        return (
          <li key={a.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span className="absolute left-[15px] top-9 bottom-0 w-px bg-border" />
            )}
            <div
              className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}1a`, color }}
            >
              {Icon && <Icon className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium">{a.title}</p>
              {a.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground/80">{timeAgo(a.created_at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}