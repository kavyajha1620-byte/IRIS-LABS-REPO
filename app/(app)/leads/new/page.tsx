import { createClient } from "@/lib/supabase/server";
import { LeadForm } from "@/components/leads/lead-form";

export const metadata = { title: "New lead" };

export default async function NewLeadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return (
    <div>
      <LeadForm userId={user.id} asPage />
    </div>
  );
}