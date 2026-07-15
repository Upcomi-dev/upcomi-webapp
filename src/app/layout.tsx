import type { Metadata } from "next";
import { Work_Sans, Averia_Serif_Libre } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
import { DEFAULT_SEO_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  applicationName: SITE_NAME,
  description: DEFAULT_SEO_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: SITE_NAME,
    description: DEFAULT_SEO_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DEFAULT_SEO_DESCRIPTION,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
};

export default async function RootLayout({
  children,
  profile,
}: Readonly<{
  children: React.ReactNode;
  profile: React.ReactNode;
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
              {profile}
              {showOnboardingModal && initialOnboardingValues ? (
                <OnboardingModal initialValues={initialOnboardingValues} />
              ) : null}
              <AuthModal />
              </FlyingHeartProvider>
            </FavoritesProvider>
          </AuthModalProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
