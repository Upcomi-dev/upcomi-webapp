"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserProfileForm } from "@/components/profile/user-profile-form";
import { ProfileView } from "@/components/social/profile-view";
import type { UserProfileFormValues } from "@/lib/profile";

/**
 * Mon profil : la vitrine, et l'éditeur en surimpression.
 *
 * `/profil` servait jusqu'ici l'éditeur directement. Il sert désormais la
 * vitrine, et « Modifier » ouvre l'éditeur — c'est le geste du prototype
 * (`UI.openOverlay('profileOverlay')`), et surtout la seule mise en page qui
 * laisse un profil ressembler à un profil plutôt qu'à un formulaire.
 *
 * L'éditeur lui-même n'est pas retouché : c'est le `UserProfileForm` existant,
 * dans la même modale que celle de la route interceptée qui a été retirée.
 * Pas de déconnexion ici, contrairement au prototype : elle vit déjà dans le
 * menu « Mon compte », et deux endroits pour se déconnecter valent moins
 * qu'un seul qu'on trouve.
 */
export function MyProfile({ initialValues }: { initialValues: UserProfileFormValues }) {
  const [editing, setEditing] = useState(false);

  const displayName =
    `${initialValues.firstName} ${initialValues.lastName}`.trim() ||
    initialValues.email ||
    "Mon profil";

  return (
    <>
      <ProfileView
        person={null}
        ownerName={displayName}
        ownerCity={initialValues.city}
        ownerPractice={initialValues.practiceTypes[0] ?? null}
        onEdit={() => setEditing(true)}
      />

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-1.5rem)] gap-0 rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,252,247,0.94),rgba(250,242,232,0.92)_52%,rgba(247,237,221,0.94))] p-0 shadow-[0_28px_90px_rgba(40,24,11,0.18)] backdrop-blur-2xl sm:max-w-4xl">
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
                  Mets à jour tes informations personnelles et ton type de pratique
                  quand tu veux.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="mt-6">
              <UserProfileForm initialValues={initialValues} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
