"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { cn, timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";

const typeLabels: Record<string, string> = {
  followup_due: "Follow-up due",
  followup_overdue: "Overdue follow-up",
  meeting: "Meeting",
  task_due: "Task due",
};

export function NotificationsBell({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  const unread = notifications.filter((n) => !n.read).length;

  async function markAll() {
    await markAllNotificationsRead();
  }

  async function openOne(n: AppNotification) {
    if (!n.read) await markNotificationRead(n.id);
  }

  return (
    <Dropdown
      trigger={
        <button className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </button>
      }
      className="w-80 sm:w-96"
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button
                onClick={() => {
                  void markAll();
                  close();
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                You&apos;re all caught up.
              </p>
            ) : (
              notifications.map((n) => (
                <div key={n.id}>
                  {n.lead_id ? (
                    <Link
                      href={`/leads/${n.lead_id}`}
                      onClick={() => {
                        void openOne(n);
                        close();
                      }}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted",
                        !n.read && "bg-primary/[0.04]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                          {typeLabels[n.type] ?? n.type}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                      </div>
                      <span className="text-sm font-medium">{n.title}</span>
                      {n.message && (
                        <span className="text-xs text-muted-foreground">{n.message}</span>
                      )}
                    </Link>
                  ) : (
                    <div
                      className={cn(
                        "flex flex-col gap-0.5 rounded-lg px-3 py-2.5",
                        !n.read && "bg-primary/[0.04]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                          {typeLabels[n.type] ?? n.type}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                      </div>
                      <span className="text-sm font-medium">{n.title}</span>
                      {n.message && (
                        <span className="text-xs text-muted-foreground">{n.message}</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Dropdown>
  );
}