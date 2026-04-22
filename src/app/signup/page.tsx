"use client";

import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/layout/app-logo";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5efe6] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <AppLogo
            href="/"
            priority
            className="justify-center"
            imageClassName="h-10 w-auto"
          />
          <p className="mt-3 text-sm text-[#7C7C7C]">
            Crée ton compte pour sauvegarder tes événements favoris
          </p>
        </div>

        <div className="rounded-xl bg-white p-6" style={{ boxShadow: "var(--shadow-md)" }}>
          <SignupForm
            onSwitchToLogin={() => router.push("/login")}
          />
        </div>
      </div>
    </div>
  );
}
