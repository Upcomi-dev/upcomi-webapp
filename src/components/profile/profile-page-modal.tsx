"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserProfileForm } from "@/components/profile/user-profile-form";
import type { UserProfileFormValues } from "@/lib/profile";

interface ProfilePageModalProps {
  initialValues: UserProfileFormValues;
}

export function ProfilePageModal({ initialValues }: ProfilePageModalProps) {
  const router = useRouter();

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,252,247,0.94),rgba(250,242,232,0.92)_52%,rgba(247,237,221,0.94))] p-0 shadow-[0_28px_90px_rgba(40,24,11,0.18)] backdrop-blur-2xl sm:max-w-4xl">
        <div className="relative overflow-y-auto px-6 pt-6 pb-7 sm:px-8 sm:pt-8 sm:pb-8">
          <DialogHeader className="gap-3 border-b border-foreground/8 pb-6">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
                Mon profil
              </p>
              <DialogTitle className="font-serif text-[32px] leading-none tracking-tight text-foreground">
                Mes informations
              </DialogTitle>
              <DialogDescription className="max-w-[48ch] text-[14px] leading-6 text-foreground/62">
                Mets à jour tes informations personnelles et ton type de pratique quand tu veux.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="mt-6">
            <UserProfileForm mode="profile" initialValues={initialValues} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
