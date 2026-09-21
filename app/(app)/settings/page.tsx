import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm, PasswordForm } from "@/components/settings/account-forms";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .single();

  const fullName =
    profile?.full_name ?? (user?.user_metadata?.full_name as string) ?? "You";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" subtitle="Manage your profile and security" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My profile</CardTitle>
            <CardDescription>How your name appears across the app</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm fullName={fullName} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your login details</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Used to sign in to {APP_NAME}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}