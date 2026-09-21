import { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}