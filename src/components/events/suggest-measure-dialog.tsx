"use client";

import { useRef, useState, useTransition } from "react";
import { CirclePlus } from "lucide-react";
import { usePathname } from "next/navigation";
import { submitFeedback } from "@/app/feedback/actions";
import { useAuth } from "@/components/auth/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { FEEDBACK_FIELD_CLASS } from "@/lib/feedback";

/**
 * « Signaler une mesure qui a été mise en place » — la même popin que « idée,
 * bug ou feedback », en plus court.
 *
 * Le type de retour n'est pas demandé : on sait déjà de quoi il s'agit, et le
 * menu déroulant du dialogue générique n'aurait eu qu'une réponse possible. Il
 * ne reste qu'un champ libre — décrire la mesure en quelques mots — et l'email
 * quand on n'a pas de compte.
 *
 * La remontée part dans `feedback_entries` avec le type « idée », comme
 * n'importe quelle suggestion : elle atterrit dans `/admin`, où l'équipe la
 * rattache au catalogue si elle est retenue. Écrire directement dans
 * `event_inclusion_measures` reviendrait à laisser n'importe qui décorer un
 * évènement de mesures qu'il ne tient pas.
 */
export function SuggestMeasureDialog({ eventName }: { eventName: string }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAuthenticated = user !== null;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      trackAnalyticsEvent("Feedback Opened", { authenticated: isAuthenticated });
    } else {
      setError(null);
    }
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);

    startTransition(async () => {
      const result = await submitFeedback(formData);

      trackAnalyticsEvent("Feedback Submitted", {
        kind: "idea",
        authenticated: isAuthenticated,
        success: result.ok,
      });

      if (result.ok) {
        formRef.current?.reset();
        setOpen(false);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="mt-4 inline-flex items-start gap-1.5 text-left text-[14px] font-semibold hover:underline"
      >
        <CirclePlus className="mt-[3px] h-3.5 w-3.5 flex-none" strokeWidth={1.8} />
        Signaler une mesure qui a été mise en place
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="flex max-h-[calc(100dvh-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-[28px] border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,239,228,0.92))] p-0 text-foreground shadow-[var(--shadow-lg)] sm:max-w-xl"
          overlayClassName="bg-[rgba(36,23,15,0.24)]"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
            <DialogHeader className="gap-3 border-b border-foreground/8 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-light text-green">
                  <CirclePlus className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="font-serif text-[28px] leading-none text-foreground">
                    Signaler une mesure
                  </DialogTitle>
                  <DialogDescription className="mt-2 max-w-lg text-[14px] leading-6 text-foreground/58">
                    Tu peux indiquer une mesure mise en place par{" "}
                    <span className="font-semibold text-foreground/72">{eventName}</span>{" "}
                    et absente de la fiche.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form ref={formRef} action={handleSubmit} className="mt-5 space-y-4">
              {/* Le type et le sujet sont connus : c'est le bouton qui vient
                  d'être cliqué qui les dit. Les demander ferait répéter à la
                  personne ce qu'elle a déjà indiqué. */}
              <input type="hidden" name="kind" value="idea" />
              <input type="hidden" name="subject" value={`Mesure d'inclusion — ${eventName}`} />
              <input type="hidden" name="page_path" value={pathname} />

              <label className="block space-y-2">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/44">
                  La mesure, en quelques mots
                </span>
                <textarea
                  name="message"
                  required
                  rows={4}
                  maxLength={2000}
                  placeholder="Ex : un groupe débutantes accompagné par une référente sur tout le parcours."
                  className={`${FEEDBACK_FIELD_CLASS} min-h-[104px] resize-y`}
                />
              </label>

              {isAuthenticated ? (
                <div className="rounded-[18px] border border-foreground/8 bg-white/70 px-4 py-3 text-[13px] text-foreground/56">
                  Envoyé avec le compte{" "}
                  <span className="font-semibold text-foreground">{user.email}</span>.
                </div>
              ) : (
                <label className="block space-y-2">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/44">
                    Email
                  </span>
                  <input
                    name="contact_email"
                    type="email"
                    required
                    placeholder="Pour pouvoir te recontacter"
                    className={FEEDBACK_FIELD_CLASS}
                  />
                </label>
              )}

              {error ? (
                <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-tertiary btn-small"
                >
                  Annuler
                </button>
                <button type="submit" disabled={isPending} className="btn-primary btn-small">
                  {isPending ? "Envoi..." : "Envoyer"}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
