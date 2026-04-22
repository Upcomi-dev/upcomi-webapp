import type { Metadata } from "next";
import { Work_Sans, Averia_Serif_Libre } from "next/font/google";
import "./globals.css";
import { AmbientOrbs } from "@/components/layout/ambient-orbs";
import { AuthModalProvider } from "@/components/auth/auth-modal-context";
import { AuthModal } from "@/components/auth/auth-modal";
import { AuthProvider } from "@/components/auth/auth-context";
import { FavoritesProvider } from "@/components/favorites/favorites-context";
import { FlyingHeartProvider } from "@/components/favorites/flying-heart";
import { OnboardingModal } from "@/components/profile/onboarding-modal";
import {
  buildInitialUserProfile,
  hasCompletedOnboarding,
  type UserProfileRow,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
});

const averiaSerifLibre = Averia_Serif_Libre({
  variable: "--font-averia-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Upcomi — Trouve ton prochain événement vélo",
  description:
    "Découvre les courses, aventures, brevets et social rides vélo en France et à l'étranger.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user: initialUser },
  } = await supabase.auth.getUser();
  const [initialAdminResult, initialProfileResult] = initialUser
    ? await Promise.all([
        supabase
          .from("admin_users")
          .select("id")
          .eq("user_id", initialUser.id)
          .maybeSingle(),
        supabase
          .from("users")
          .select("email, name, surname, ville, pref1, pref2")
          .eq("uid", initialUser.id)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const initialAdminRecord = initialAdminResult.data;
  const initialProfile = initialProfileResult.data as UserProfileRow | null;
  const showOnboardingModal =
    initialUser != null && !hasCompletedOnboarding(initialUser, initialProfile);
  const initialOnboardingValues =
    initialUser != null
      ? buildInitialUserProfile(initialUser, initialProfile)
      : null;

  return (
    <html lang="fr" className={`${workSans.variable} ${averiaSerifLibre.variable} h-full antialiased`}>
      <body className="min-h-screen overflow-x-hidden font-sans">
        <AuthProvider
          initialUser={initialUser}
          initialIsAdmin={Boolean(initialAdminRecord)}
        >
          <AuthModalProvider>
            <FavoritesProvider>
              <FlyingHeartProvider>
              <AmbientOrbs />
              <div className="relative z-10 flex h-[100dvh] flex-col md:h-auto md:min-h-screen">
                {children}
              </div>
              {showOnboardingModal && initialOnboardingValues ? (
                <OnboardingModal initialValues={initialOnboardingValues} />
              ) : null}
              <AuthModal />
              </FlyingHeartProvider>
            </FavoritesProvider>
          </AuthModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
