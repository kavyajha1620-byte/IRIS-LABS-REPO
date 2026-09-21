import { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}