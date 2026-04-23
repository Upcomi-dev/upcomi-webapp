"use client";

import { useRef, useState, useTransition } from "react";
import { Bug, Lightbulb, MessageSquarePlus } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { submitFeedback } from "@/app/feedback/actions";
import { useAuth } from "@/components/auth/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FEEDBACK_KIND_OPTIONS } from "@/lib/feedback";
import type { FeedbackKind } from "@/lib/types/database";

const fieldClassName =
  "w-full rounded-[18px] border border-foreground/10 bg-white/85 px-4 py-3 text-[14px] text-foreground placeholder:text-foreground/35 focus:border-coral/35 focus:outline-none";

const kindIcons = {
  idea: Lightbulb,
  bug: Bug,
  feedback: MessageSquarePlus,
} as const;

export function FeedbackDialog() {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedKind, setSelectedKind] = useState<FeedbackKind>("feedback");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAuthenticated = user !== null;
  const activeKind = FEEDBACK_KIND_OPTIONS.find((option) => option.value === selectedKind) ?? FEEDBACK_KIND_OPTIONS[2];
  const ActiveKindIcon = kindIcons[selectedKind];
  const search = searchParams.toString();
  const currentPath = search ? `${pathname}?${search}` : pathname;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setError(null);
    }
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);

    startTransition(async () => {
      try {
        await submitFeedback(formData);
        formRef.current?.reset();
        setSelectedKind("feedback");
        setOpen(false);
      } catch (submissionError) {
        const nextError =
          submissionError instanceof Error
            ? submissionError.message
            : "Impossible d'envoyer le retour pour le moment.";
        setError(nextError);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="soft-ring flex h-9 w-9 items-center justify-center rounded-full border border-white/38 bg-white/42 text-foreground/54 transition-all hover:border-coral/22 hover:bg-white/58 hover:text-foreground/72 md:hidden"
        aria-label="Remonter une idée, un bug ou un feedback"
      >
        <MessageSquarePlus className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/38 bg-white/42 text-foreground/58 transition-all hover:border-coral/22 hover:bg-white/58 hover:text-foreground md:inline-flex"
        aria-label="Remonter une idée, un bug ou un feedback"
      >
        <MessageSquarePlus className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-[calc(100%-1.5rem)] rounded-[28px] border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,239,228,0.92))] p-0 text-foreground shadow-[var(--shadow-lg)] sm:max-w-xl"
          overlayClassName="bg-[rgba(36,23,15,0.24)]"
        >
          <div className="p-5 sm:p-6">
            <DialogHeader className="gap-3 border-b border-foreground/8 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-coral/10 text-coral">
                  <ActiveKindIcon className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="font-serif text-[28px] leading-none text-foreground">
                    Idée, bug ou feedback
                  </DialogTitle>
                  <DialogDescription className="mt-2 max-w-lg text-[14px] leading-6 text-foreground/58">
                    Signale un problème, partage une idée ou un retour d&apos;usage.
                    L&apos;équipe le retrouvera ensuite dans l&apos;admin.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form ref={formRef} action={handleSubmit} className="mt-5 space-y-4">
              <input type="hidden" name="page_path" value={currentPath} />

              <div className="grid gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <label className="space-y-2">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/44">
                    Type
                  </span>
                  <select
                    name="kind"
                    value={selectedKind}
                    onChange={(event) => setSelectedKind(event.target.value as FeedbackKind)}
                    className={fieldClassName}
                  >
                    {FEEDBACK_KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-[20px] border border-coral/14 bg-coral/6 px-4 py-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-coral">
                    {activeKind.label}
                  </p>
                  <p className="mt-2 text-[13px] leading-5 text-foreground/58">
                    {activeKind.description}
                  </p>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/44">
                  Sujet
                </span>
                <input
                  name="subject"
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Ex: Le filtre ville ne répond plus"
                  className={fieldClassName}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/44">
                  Message
                </span>
                <textarea
                  name="message"
                  required
                  rows={6}
                  maxLength={2000}
                  placeholder="Décris ce que tu vois, ce que tu attendais, et si possible comment reproduire le problème."
                  className={`${fieldClassName} min-h-[144px] resize-y`}
                />
              </label>

              {isAuthenticated ? (
                <div className="rounded-[18px] border border-foreground/8 bg-white/70 px-4 py-3 text-[13px] text-foreground/56">
                  Envoyé avec le compte <span className="font-semibold text-foreground">{user.email}</span>.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/44">
                      Nom
                    </span>
                    <input
                      name="contact_name"
                      type="text"
                      maxLength={120}
                      placeholder="Optionnel"
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/44">
                      Email
                    </span>
                    <input
                      name="contact_email"
                      type="email"
                      required
                      placeholder="Pour pouvoir te recontacter"
                      className={fieldClassName}
                    />
                  </label>
                </div>
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
                  className="rounded-full border border-foreground/12 px-4 py-2.5 text-[12px] font-semibold text-foreground/60 transition-colors hover:bg-foreground/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-coral px-5 py-2.5 text-[12px] font-semibold tracking-[0.12em] text-white uppercase transition-colors hover:bg-coral-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
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
