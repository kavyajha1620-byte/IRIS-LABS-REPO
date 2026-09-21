"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { initials, formatDate } from "@/lib/utils";
import { setUserRole, type TeamMember } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = ["owner", "admin", "salesperson"] as const;

const ROLE_STYLES: Record<string, string> = {
  owner: "border-violet-200 bg-violet-50 text-violet-700",
  admin: "border-blue-200 bg-blue-50 text-blue-700",
  salesperson: "border-border bg-muted/60 text-muted-foreground",
};

export function UsersManager({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  async function onRoleChange(userId: string, role: string) {
    if (pendingRole) return;
    setPendingRole(userId);
    try {
      const res = await setUserRole(userId, role);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Role updated");
      router.refresh();
    } finally {
      setPendingRole(null);
    }
  }

  return (
    <div className="divide-y divide-border">
      <div className="hidden items-center gap-3 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[1fr_1fr_180px_100px_140px]">
        <span>User</span>
        <span>Joined</span>
        <span>Role</span>
        <span className="text-right">Leads</span>
        <span />
      </div>

      {members.length === 0 && (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          No team members yet. Ask people to sign up at /signup to add them.
        </p>
      )}

      {members.map((m) => {
        const isYou = m.user_id === currentUserId;
        return (
          <div
            key={m.user_id}
            className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-[1fr_1fr_180px_100px_140px] md:items-center"
          >
            <div className="col-span-2 flex items-center gap-3 md:col-span-1">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(m.full_name || m.email || "U")}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{m.full_name || "Unnamed"}</span>
                  {isYou && <Badge>You</Badge>}
                </span>
                <span className="truncate text-xs text-muted-foreground">{m.email ?? "—"}</span>
              </span>
            </div>

            <div className="col-span-2 text-xs text-muted-foreground md:col-span-1">
              {formatDate(m.created_at)}
            </div>

            <Select
              value={m.role}
              disabled={pendingRole === m.user_id || isYou}
              onChange={(e) => onRoleChange(m.user_id, e.target.value)}
              className={cn("h-9 w-full text-xs font-medium md:w-[150px]", ROLE_STYLES[m.role])}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r} className="text-foreground">
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </Select>

            <div className="text-right text-sm font-semibold tabular-nums">{m.lead_count}</div>

            <div className="hidden md:block" />
          </div>
        );
      })}
    </div>
  );
}