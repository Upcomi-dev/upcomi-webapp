import type { Metadata } from "next";
import { Work_Sans, Averia_Serif_Libre } from "next/font/google";
import "./globals.css";
import { AmbientOrbs } from "@/components/layout/ambient-orbs";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AuthModalProvider } from "@/components/auth/auth-modal-context";
import { AuthModal } from "@/components/auth/auth-modal";
import { FavoritesProvider } from "@/components/favorites/favorites-context";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${workSans.variable} ${averiaSerifLibre.variable} h-full antialiased`}>
      <body className="min-h-screen overflow-x-hidden font-sans">
        <AuthModalProvider>
          <FavoritesProvider>
            <AmbientOrbs />
            <div className="relative z-10 flex min-h-screen flex-col pb-16 md:pb-0">
              {children}
            </div>
            <BottomNav />
            <AuthModal />
          </FavoritesProvider>
        </AuthModalProvider>
      </body>
    </html>
  );
}
