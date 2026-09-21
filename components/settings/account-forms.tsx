"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, updatePassword } from "@/lib/actions/profile";

export function ProfileForm({ fullName }: { fullName: string }) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await updateProfile(new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    toast.success("Profile updated");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" defaultValue={fullName} required />
      </div>
      <div>
        <Button type="submit" loading={pending}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setPending(true);
    const res = await updatePassword(new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    setDone(true);
    toast.success("Password updated");
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {done && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Password updated.</p>}
      <div>
        <Label htmlFor="new_password">New password</Label>
        <Input id="new_password" name="new_password" type="password" autoComplete="new-password" required />
      </div>
      <div>
        <Label htmlFor="confirm_password">Confirm password</Label>
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
      </div>
      <div>
        <Button type="submit" loading={pending}>
          Change password
        </Button>
      </div>
    </form>
  );
}