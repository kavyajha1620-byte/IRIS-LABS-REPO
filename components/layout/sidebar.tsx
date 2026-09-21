"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  PhoneCall,
  CalendarClock,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { APP_NAME, NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { logoutUser } from "@/lib/actions/auth";
import { useState } from "react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  KanbanSquare,
  PhoneCall,
  CalendarClock,
  CheckSquare,
  BarChart3,
  Settings,
};

export function Sidebar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logoutUser();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-slate-300 lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-base font-bold text-white">
          I
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">{APP_NAME}</p>
          <p className="text-[11px] text-slate-400">Cold Calling & Lead Management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/30 text-sm font-semibold text-white">
            {userName
              ?.split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("") || "U"}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-white">{userName || "User"}</p>
            <p className="truncate text-[11px] text-slate-400">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}