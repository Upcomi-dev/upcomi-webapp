"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-context";

interface ProfileInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
}

const emptyForm: ProfileFormState = {
  firstName: "",
  lastName: "",
  email: "",
};

function normalizeForm(form: ProfileFormState) {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
  };
}

export function ProfileInfoDialog({
  open,
  onOpenChange,
}: ProfileInfoDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [initialForm, setInitialForm] = useState<ProfileFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isDirty =
    JSON.stringify(normalizeForm(form)) !== JSON.stringify(normalizeForm(initialForm));

  // Hydrate the form from the AuthContext user whenever the dialog opens.
  useEffect(() => {
    if (!open || !user) return;

    setError(null);
    setSuccess(null);

    const metadata = user.user_metadata ?? {};
    const firstName =
      metadata.first_name ??
      metadata.firstName ??
      metadata.prenom ??
      "";
    const lastName =
      metadata.last_name ??
      metadata.lastName ??
      metadata.surname ??
      metadata.nom ??
      "";

    const nextForm = {
      firstName,
      lastName,
      email: user.email ?? "",
    };
    setForm(nextForm);
    setInitialForm(nextForm);
  }, [open, user]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const trimmedFirstName = form.firstName.trim();
    const trimmedLastName = form.lastName.trim();
    const fullName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(" ");

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        name: fullName,
        full_name: fullName,
      },
    });

    if (updateError) {
      setError(updateError.message || "La mise à jour a échoué.");
      setSaving(false);
      return;
    }

    setSuccess("Tes informations ont été mises à jour.");
    setInitialForm({
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: form.email,
    });
    setSaving(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 rounded-[28px] border border-white/65 bg-[linear-gradient(135deg,rgba(255,252,247,0.98),rgba(250,242,232,0.98)_52%,rgba(247,237,221,0.98))] p-0 shadow-[var(--shadow-lg)] sm:max-w-[560px]">
        <div className="relative overflow-hidden rounded-[28px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(235,95,59,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(213,143,56,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(235,95,59,0.08),transparent_24%)]" />

          <div className="relative px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
            <DialogHeader className="gap-3">
              <div className="inline-flex w-fit items-center rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-dark shadow-[var(--shadow-sm)]">
                Mes infos
              </div>
              <div className="space-y-2">
                <DialogTitle className="font-serif text-[28px] leading-none tracking-tight text-foreground">
                  Modifier mes informations
                </DialogTitle>
                <DialogDescription className="max-w-[42ch] text-[14px] leading-6 text-foreground/62">
                  Mets à jour les informations personnelles associées à ton compte.
                </DialogDescription>
              </div>
            </DialogHeader>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                    Prénom
                  </span>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    disabled={saving}
                    className="w-full rounded-[18px] border border-white/70 bg-white/80 px-4 py-3 text-[15px] text-foreground shadow-[var(--shadow-sm)] outline-none transition focus:border-orange/45 focus:ring-2 focus:ring-orange/15 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Ton prénom"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                    Nom
                  </span>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    disabled={saving}
                    className="w-full rounded-[18px] border border-white/70 bg-white/80 px-4 py-3 text-[15px] text-foreground shadow-[var(--shadow-sm)] outline-none transition focus:border-orange/45 focus:ring-2 focus:ring-orange/15 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Ton nom"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                  E-mail
                </span>
                <div className="flex min-h-[52px] items-center rounded-[18px] border border-white/60 bg-[rgba(255,255,255,0.5)] px-4 py-3 text-[15px] text-foreground/70 shadow-[var(--shadow-sm)]">
                  {form.email || user?.email || "E-mail indisponible"}
                </div>
              </div>

              {error && (
                <p className="rounded-[16px] border border-red-200 bg-red-50/90 px-4 py-3 text-[13px] text-red-700">
                  {error}
                </p>
              )}

              {success && (
                <p className="rounded-[16px] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-[13px] text-emerald-700">
                  {success}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={saving || !isDirty}
                  className="rounded-full border border-foreground/12 px-5 py-3 text-[13px] font-medium text-foreground/68 transition-colors hover:bg-foreground/5 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !isDirty}
                  className="rounded-full bg-[linear-gradient(135deg,rgba(235,95,59,1),rgba(213,143,56,0.95))] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-white shadow-[var(--shadow-warm)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
