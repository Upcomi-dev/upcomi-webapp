"use client";

import { AppLogo } from "@/components/layout/app-logo";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
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
            Entre ton email pour réinitialiser ton mot de passe
          </p>
        </div>

        <div className="rounded-xl bg-white p-6" style={{ boxShadow: "var(--shadow-md)" }}>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
