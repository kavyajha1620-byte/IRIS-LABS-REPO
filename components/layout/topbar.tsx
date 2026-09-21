"use client";

import { useState } from "react";
import { Bot, ChevronDown, LogOut } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { NotificationsBell } from "./notifications-popover";
import { CopilotDrawer } from "@/components/copilot/copilot-drawer";
import { logoutUser } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/constants";
import type { AppNotification } from "@/lib/types";

export function Topbar({
  userName,
  userEmail,
  notifications,
}: {
  userName: string;
  userEmail: string;
  notifications: AppNotification[];
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const initials =
    userName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logoutUser();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
          I
        </div>
        <span className="text-sm font-semibold">{APP_NAME}</span>
      </div>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setCopilotOpen(true)}
          className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          title="Ask the AI copilot"
        >
          <Bot className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Copilot</span>
        </button>
        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-full p-1.5 pr-2 transition-colors hover:bg-muted">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                {initials}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </button>
          }
        >
          {(close) => (
            <div className="w-56">
              <div className="border-b border-border px-3 py-2.5">
                <p className="truncate text-sm font-semibold">{userName || "User"}</p>
                <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <div className="p-1 pt-1.5">
                <DropdownItem
                  onClick={() => {
                    close();
                    onLogout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? "Signing out…" : "Sign out"}
                </DropdownItem>
              </div>
            </div>
          )}
        </Dropdown>
        <NotificationsBell notifications={notifications} />
      </div>
      <CopilotDrawer open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </header>
  );
}