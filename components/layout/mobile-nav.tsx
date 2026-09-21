"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  PhoneCall,
  MoreHorizontal,
  CalendarClock,
  CheckSquare,
  BarChart3,
  Settings,
  Bot,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const primary = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/calls", label: "Calls", icon: PhoneCall },
];

const more = [
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/research", label: "AI Research", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminItems = [{ href: "/admin", label: "Admin", icon: ShieldCheck }];

export function MobileNav({ role }: { role?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = role === "owner" || role === "admin";
  const moreItems = isAdmin ? [...more, ...adminItems] : more;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border bg-white shadow-[0_-4px_12px_rgba(15,23,42,0.04)] lg:hidden">
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              isActive(item.href) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-[20px] w-[20px]" />
            {item.label}
          </Link>
        ))}
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
            moreItems.some((m) => isActive(m.href)) ? "text-primary" : "text-muted-foreground"
          )}
        >
          <MoreHorizontal className="h-[20px] w-[20px]" />
          More
        </button>
      </nav>

      <Modal open={open} onClose={() => setOpen(false)} title="More" size="sm">
        <div className="flex flex-col gap-1">
          {moreItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          ))}
        </div>
      </Modal>
    </>
  );
}