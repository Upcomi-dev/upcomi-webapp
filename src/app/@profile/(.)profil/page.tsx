import { redirect } from "next/navigation";
import { ProfilePageModal } from "@/components/profile/profile-page-modal";
import { buildInitialUserProfile, type UserProfileRow } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function InterceptedProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=%2Fprofil");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("email, name, surname, ville, pref1, pref2")
    .eq("uid", user.id)
    .maybeSingle();

  const initialValues = buildInitialUserProfile(user, profile as UserProfileRow | null);

  return <ProfilePageModal initialValues={initialValues} />;
}
