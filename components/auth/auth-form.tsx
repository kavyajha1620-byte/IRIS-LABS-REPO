"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser, signupUser, sendPasswordReset, resetPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import Link from "next/link";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";

type Mode = "login" | "signup" | "forgot" | "reset";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result =
        mode === "login"
          ? await loginUser(formData)
          : mode === "signup"
            ? await signupUser(formData)
            : mode === "forgot"
              ? await sendPasswordReset(formData)
              : await resetPassword(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.message) {
        setInfo(result.message);
        if (mode === "signup") return;
        if (mode === "reset") {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("code");
          router.replace(`/login?reset=1`);
          router.refresh();
          return;
        }
      }
      if (mode === "login") {
        const dest = searchParams.get("redirectedFrom") || "/";
        router.replace(dest);
        router.refresh();
      }
      if (mode === "forgot") return;
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full">
      <div className="text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white">
          I
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{APP_SUBTITLE}</p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        {mode === "signup" && (
          <Field label="Full name" htmlFor="full_name">
            <Input id="full_name" name="full_name" placeholder="Jane Doe" autoComplete="name" />
          </Field>
        )}
        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password" htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
        </Field>
        {mode === "reset" && (
          <Field label="Confirm password" htmlFor="password_confirm" required>
            <Input
              id="password_confirm"
              name="password_confirm"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </Field>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
            {info}
          </p>
        )}

        <Button type="submit" className="w-full" loading={pending}>
          {mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Set new password"}
        </Button>
      </form>

      <div className="mt-5 text-center text-sm text-muted-foreground">
        {mode === "login" && (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create one
            </Link>
            <span className="mx-2">·</span>
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              Forgot password
            </Link>
          </>
        )}
        {mode === "signup" && (
          <>
            Already registered?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </>
        )}
        {mode === "forgot" && (
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        )}
        {mode === "reset" && (
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}