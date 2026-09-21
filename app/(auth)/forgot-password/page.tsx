import { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <AuthForm mode="forgot" />
    </Suspense>
  );
}