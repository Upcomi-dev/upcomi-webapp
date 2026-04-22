"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserProfileForm } from "@/components/profile/user-profile-form";
import type { UserProfileFormValues } from "@/lib/profile";

interface OnboardingModalProps {
  initialValues: UserProfileFormValues;
}

export function OnboardingModal({ initialValues }: OnboardingModalProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    if (!pathname) {
      return "/";
    }

    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[rgba(244,235,223,0.12)] supports-backdrop-filter:backdrop-blur-md"
        className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,252,247,0.88),rgba(250,242,232,0.84)_52%,rgba(247,237,221,0.86))] p-0 shadow-[0_28px_90px_rgba(40,24,11,0.18)] backdrop-blur-2xl sm:max-w-[860px]"
      >
        <div className="relative overflow-hidden rounded-[32px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(235,95,59,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(213,143,56,0.13),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(235,95,59,0.08),transparent_24%)]" />

          <div className="relative px-6 pt-6 pb-7 sm:px-8 sm:pt-8 sm:pb-8">
            <DialogHeader className="gap-3 border-b border-foreground/8 pb-6">
              <div className="inline-flex w-fit items-center rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-dark shadow-[var(--shadow-sm)]">
                Première connexion
              </div>
              <div className="space-y-2">
                <DialogTitle className="font-serif text-[30px] leading-none tracking-tight text-foreground sm:text-[36px]">
                  Dis-nous comment tu roules
                </DialogTitle>
                <DialogDescription className="max-w-[48ch] text-[14px] leading-6 text-foreground/62">
                  Complète ton profil pour continuer dans l&apos;app. Tu pourras modifier ces informations plus tard depuis ta page profil.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="mt-6">
              <UserProfileForm
                mode="onboarding"
                initialValues={initialValues}
                redirectTo={currentPath}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
