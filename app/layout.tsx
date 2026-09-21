import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: `${APP_NAME} — Cold Calling & Lead Management`,
    template: `%s | ${APP_NAME}`,
  },
  description: "Cold calling & lead management CRM for salespeople.",
};

function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold">Quick setup required</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Before the app can talk to your database you need Supabase credentials.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Create a free project at{" "}
            <a className="font-medium text-primary" href="https://supabase.com" target="_blank" rel="noreferrer">
              supabase.com
            </a>
          </li>
          <li>
            Copy <code className="rounded bg-muted px-1.5 py-0.5">.env.example</code> to{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">.env.local</code> and fill in the values.
          </li>
          <li>
            Run the SQL in <code className="rounded bg-muted px-1.5 py-0.5">supabase/migrations</code> in the
            Supabase SQL editor.
          </li>
          <li>Restart the dev server.</li>
        </ol>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured;
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {configured ? children : <ConfigError />}
        <Toaster />
      </body>
    </html>
  );
}