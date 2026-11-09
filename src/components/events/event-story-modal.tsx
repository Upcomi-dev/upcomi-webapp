"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { CircleCheck, PartyPopper } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { EventStoryForm } from "@/components/auth/event-story-form";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { fetchOwnEventStory } from "@/lib/events/stories";
import { saveEventStory } from "@/lib/profile-mutations";
import { getEventPath } from "@/lib/seo";
import { createClient } from "@/lib/supabase/client";
import { useEventStories, type StoryEvent } from "./event-stories-context";

/**
 * Le pas-à-pas du prototype (`review.js`) : l'accroche « Bravo ! », la saisie,
 * la confirmation. Il est monté une fois dans le layout et ouvert depuis ses
 * trois points d'entrée — le bandeau de relance, la fiche évènement et le
 * panneau « Mes participations » — via `useEventStories()`.
 *
 * L'accroche est sautée quand il s'agit de modifier un récit déjà écrit :
 * « Bravo pour cet évènement » ne s'adresse qu'à celle qui vient de le faire.
 */
type Step = "intro" | "form" | "done";

export function EventStoryModal() {
  const { activeEvent, closeStoryModal, hasOwnStory, markOwnStory } = useEventStories();

  return (
    <EventStoryDialog
      event={activeEvent}
      isEditing={activeEvent ? hasOwnStory(activeEvent.id) : false}
      onSaved={markOwnStory}
      onClose={closeStoryModal}
    />
  );
}

interface EventStoryDialogProps {
  event: StoryEvent | null;
  isEditing: boolean;
  onSaved: (eventId: number) => void;
  onClose: () => void;
}

function EventStoryDialog({ event, isEditing, onSaved, onClose }: EventStoryDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState<Step>("intro");
  const [storyUrl, setStoryUrl] = useState("");
  const [story, setStory] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventId = event?.id ?? null;
  const [openedEventId, setOpenedEventId] = useState<number | null>(null);
  // Figé à l'ouverture : écrire le récit fait basculer `isEditing`, et suivre
  // ce changement rouvrirait le formulaire au lieu d'afficher la confirmation.
  const [editing, setEditing] = useState(false);

  if (eventId !== openedEventId) {
    setOpenedEventId(eventId);
    setEditing(isEditing);
    // L'accroche « Bravo ! » ne s'adresse pas à quelqu'un qui vient corriger
    // un récit déjà écrit : dans ce cas on ouvre droit sur le formulaire.
    setStep(isEditing ? "form" : "intro");
    setStoryUrl("");
    setStory("");
    setError(null);
  }

  // Le récit déjà écrit est rechargé à l'ouverture plutôt que porté par le
  // point d'entrée : les trois appelants n'ont pas à le connaître, et une
  // modification faite ailleurs (autre onglet, autre appareil) est reprise.
  useEffect(() => {
    if (eventId == null || !user) return;

    let cancelled = false;

    (async () => {
      const existing = await fetchOwnEventStory(createClient(), user.id, eventId);
      if (cancelled || !existing) return;

      setStoryUrl(existing.storyUrl);
      setStory(existing.story);
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId, user]);

  const handleSubmit = useCallback(async () => {
    if (!event) return;

    setError(null);

    if (!user) {
      setError("Ta session a expiré. Reconnecte-toi pour partager ton récit.");
      return;
    }

    setPending(true);
    const { error: storyError, saved } = await saveEventStory(createClient(), user, {
      eventId: event.id,
      storyUrl,
      story,
    });
    setPending(false);

    if (storyError) {
      setError(storyError);
      return;
    }

    // Rien de saisi : la table refuse une ligne vide et le prototype traite le
    // champ laissé vide comme un « plus tard » — on ferme sans rien annoncer.
    if (!saved) {
      onClose();
      return;
    }

    trackAnalyticsEvent("Event Story Submitted", {
      event_id: event.id,
      has_link: Boolean(storyUrl.trim()),
      has_text: Boolean(story.trim()),
      editing,
    });

    onSaved(event.id);
    setStep("done");
    // Le bloc « Retours d'expérience » est rendu côté serveur : il faut le
    // refaire pour que le récit qu'on vient d'écrire y apparaisse.
    router.refresh();
  }, [editing, event, onClose, onSaved, router, story, storyUrl, user]);

  if (!event) return null;

  const eventName = event.nomEvent || "cet évènement";
  const eventPath = event.slug ? getEventPath(event.slug) : null;
  // Depuis la fiche elle-même, « Voir la page de l'évènement » ne mène nulle
  // part : `router.refresh()` a déjà remonté le récit dans le bloc.
  const showEventLink = eventPath != null && pathname !== eventPath;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="gap-0 p-0 sm:max-w-[440px]">
        <div className="px-6 pt-7 pb-6">
          {step === "intro" && (
            <div className="space-y-5 text-center">
              <PartyPopper className="mx-auto size-12 text-orange" strokeWidth={1.5} />
              <div className="space-y-2">
                <DialogTitle className="font-serif text-[22px] leading-tight text-foreground">
                  Bravo pour {eventName}&nbsp;!
                </DialogTitle>
                <DialogDescription className="text-[14px] leading-6 text-foreground/55">
                  On espère que tout s&apos;est bien passé pour toi. Si tu as un récit ou des
                  photos à partager, tu peux aider les personnes comme toi à se projeter.
                </DialogDescription>
              </div>
              <div className="flex items-center justify-center gap-2.5">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Plus tard
                </button>
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="btn-primary"
                >
                  J&apos;ajoute mon récit
                </button>
              </div>
            </div>
          )}

          {step === "form" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <DialogTitle className="font-serif text-[20px] leading-tight text-foreground">
                  {editing ? "Modifie ton récit" : "Ajoute ton récit d'aventure"}
                </DialogTitle>
                <DialogDescription className="text-[14px] leading-6 text-foreground/55">
                  Ajoute un lien vers Instagram, Strava ou ton blog, et quelques mots sur ce
                  que tu as vécu.
                </DialogDescription>
              </div>

              <EventStoryForm
                event={event}
                storyUrl={storyUrl}
                story={story}
                onStoryUrlChange={setStoryUrl}
                onStoryChange={setStory}
                disabled={pending}
              />

              {error && <p className="text-[13px] text-coral">{error}</p>}

              {/* Un seul bouton, comme dans le prototype : « Ajouter » valide
                  même les champs vides, le récit est facultatif de bout en
                  bout et rien n'est écrit s'il n'y a rien à écrire. */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={pending}
                className="btn-primary w-full"
              >
                {pending ? "Enregistrement..." : editing ? "Enregistrer →" : "Ajouter →"}
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-5 text-center">
              <CircleCheck className="mx-auto size-12 text-foreground/72" strokeWidth={1.5} />
              <div className="space-y-2">
                <DialogTitle className="font-serif text-[22px] leading-tight text-foreground">
                  {editing ? "Ton récit est à jour !" : "Ton récit est ajouté !"}
                </DialogTitle>
                <DialogDescription className="text-[14px] leading-6 text-foreground/55">
                  Merci d&apos;avoir partagé ton expérience sur {eventName}. Retrouve-la dans la
                  section « Retours d&apos;expérience » de la page de l&apos;évènement.
                </DialogDescription>
              </div>
              <div className="flex items-center justify-center gap-2.5">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Fermer
                </button>
                {showEventLink && (
                  <Link href={eventPath} onClick={onClose} className="btn-primary">
                    Voir la page de l&apos;évènement →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
