"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-context";
import {
  GENDER_OPTIONS,
  PRACTICE_LEVEL_OPTIONS,
  PRACTICE_TYPE_OPTIONS,
  type UserProfileFormValues,
  isUserProfileComplete,
  normalizeUserProfile,
} from "@/lib/profile";
import { saveUserProfile } from "@/lib/profile-mutations";

// La première connexion passe par le parcours en étapes
// (`SignupWizard`) ; ce formulaire ne sert plus qu'à modifier son profil.
interface UserProfileFormProps {
  initialValues: UserProfileFormValues;
}

function areSameProfile(left: UserProfileFormValues, right: UserProfileFormValues) {
  const normalizedLeft = normalizeUserProfile(left);
  const normalizedRight = normalizeUserProfile(right);

  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

export function UserProfileForm({ initialValues }: UserProfileFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const normalizedInitialForm = useMemo(
    () => normalizeUserProfile(initialValues),
    [initialValues]
  );
  const [form, setForm] = useState<UserProfileFormValues>(normalizedInitialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const normalizedForm = useMemo(() => normalizeUserProfile(form), [form]);
  const isDirty = !areSameProfile(normalizedForm, normalizedInitialForm);

  const togglePracticeType = (practiceType: string) => {
    setForm((current) => {
      const currentTypes = current.practiceTypes.includes(practiceType)
        ? current.practiceTypes.filter((item) => item !== practiceType)
        : [...current.practiceTypes, practiceType];

      return {
        ...current,
        practiceTypes: currentTypes,
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("Tu dois être connecté pour modifier ton profil.");
      return;
    }

    const nextProfile = normalizeUserProfile(form);

    if (!isUserProfileComplete(nextProfile)) {
      setError("Merci de compléter ton prénom, ton nom, ta ville, ton type de pratique et ton niveau.");
      return;
    }

    setSaving(true);

    const { error: saveError } = await saveUserProfile(createClient(), user, nextProfile, {
      completeOnboarding: true,
    });

    if (saveError) {
      setError(saveError);
      setSaving(false);
      return;
    }

    setSuccess("Ton profil a été mis à jour.");
    setSaving(false);
    router.refresh();
  };

  const pending = saving;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
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
            disabled={pending}
            className="w-full rounded-[18px] border border-foreground/14 bg-white/80 px-4 py-3 text-[15px] text-foreground shadow-[var(--shadow-sm)] outline-none transition focus:border-orange/50 focus:ring-2 focus:ring-orange/15 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Ton prénom"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
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
            disabled={pending}
            className="w-full rounded-[18px] border border-foreground/14 bg-white/80 px-4 py-3 text-[15px] text-foreground shadow-[var(--shadow-sm)] outline-none transition focus:border-orange/50 focus:ring-2 focus:ring-orange/15 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Ton nom"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
            Genre
          </p>
          <p className="text-[13px] leading-6 text-foreground/60">
            Facultatif. Reclique sur ta réponse pour la retirer.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map((gender) => {
            const isActive = form.gender === gender;

            return (
              <button
                key={gender}
                type="button"
                disabled={pending}
                aria-pressed={isActive}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    gender: current.gender === gender ? "" : gender,
                  }))
                }
                className={`rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                  isActive
                    ? "border-orange/45 bg-orange/12 text-orange-dark"
                    : "border-white/65 bg-white/70 text-foreground/70 hover:border-orange/25 hover:text-foreground"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {gender}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="space-y-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
            Ville
          </span>
          <input
            type="text"
            value={form.city}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                city: event.target.value,
              }))
            }
            disabled={pending}
            className="w-full rounded-[18px] border border-foreground/14 bg-white/80 px-4 py-3 text-[15px] text-foreground shadow-[var(--shadow-sm)] outline-none transition focus:border-orange/50 focus:ring-2 focus:ring-orange/15 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Ta ville"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
            Niveau
          </span>
          <select
            value={form.practiceLevel}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                practiceLevel: event.target.value,
              }))
            }
            disabled={pending}
            className="w-full rounded-[18px] border border-foreground/14 bg-white/80 px-4 py-3 text-[15px] text-foreground shadow-[var(--shadow-sm)] outline-none transition focus:border-orange/50 focus:ring-2 focus:ring-orange/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Choisir</option>
            {PRACTICE_LEVEL_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
            Type de pratique
          </p>
          <p className="text-[13px] leading-6 text-foreground/60">
            Sélectionne une ou plusieurs pratiques pour personnaliser ton profil.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRACTICE_TYPE_OPTIONS.map((practiceType) => {
            const isActive = form.practiceTypes.includes(practiceType);

            return (
              <button
                key={practiceType}
                type="button"
                disabled={pending}
                onClick={() => togglePracticeType(practiceType)}
                className={`rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                  isActive
                    ? "border-orange/45 bg-orange/12 text-orange-dark"
                    : "border-white/65 bg-white/70 text-foreground/70 hover:border-orange/25 hover:text-foreground"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {practiceType}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
          E-mail
        </span>
        <div className="flex min-h-[52px] items-center rounded-[18px] border border-foreground/14 bg-[rgba(255,255,255,0.5)] px-4 py-3 text-[15px] text-foreground/70 shadow-[var(--shadow-sm)]">
          {normalizedForm.email || user?.email || "E-mail indisponible"}
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
          onClick={() => setForm(normalizedInitialForm)}
          disabled={pending || !isDirty}
          className="rounded-full border border-foreground/12 px-5 py-3 text-[13px] font-medium text-foreground/68 transition-colors hover:bg-foreground/5 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending || !isDirty}
          className="rounded-full bg-[linear-gradient(135deg,rgba(235,95,59,1),rgba(213,143,56,0.95))] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-white shadow-[var(--shadow-warm)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
        >
          {pending ? "Mise à jour..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
