"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        className: "rounded-xl border border-border shadow-lg",
      }}
      theme="light"
    />
  );
}