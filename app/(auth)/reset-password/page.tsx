import { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <AuthForm mode="reset" />
    </Suspense>
  );
}