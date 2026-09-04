"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { CircleCheck, Eye, EyeOff, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-context";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  getPasswordRequirementsMessage,
  isPasswordValid,
  PASSWORD_MIN_LENGTH,
  translatePasswordError,
} from "@/lib/auth/password";
import {
  GENDER_OPTIONS,
  PRACTICE_LEVEL_OPTIONS,
  PRACTICE_TYPE_OPTIONS,
  isUserProfileComplete,
  normalizeUserProfile,
  sanitizeRedirectPath,
  type UserProfileFormValues,
} from "@/lib/profile";
import {
  fetchEventsWithStories,
  saveEventStory,
  saveRecommendedEvents,
  saveUserProfile,
} from "@/lib/profile-mutations";
import { Field, FIELD_INPUT_CLASS, FieldLabel, Muted } from "@/components/ui/field";
import { EventStoryForm } from "./event-story-form";
import { GoogleAuthButton } from "./google-auth-button";
import { PasswordRequirements } from "./password-requirements";
import {
  RecommendedEventsPicker,
  type RecommendableEvent,
} from "./recommended-events-picker";

// Le parcours du prototype, à ceci près que « Continuer avec Google » sort de
// l'application le temps de l'aller-retour OAuth : on ne revient pas dans cet
// état-ci mais dans une nouvelle page, où le garde d'onboarding rouvre le
// parcours directement à l'étape « profil » (voir OnboardingModal).
const STEPS = [
  "methode",
  "identite",
  "profil",
  "recommandations",
  "recits",
  "confirmation",
] as const;

export type SignupWizardStep = (typeof STEPS)[number];

const TERMS_URL = "https://www.upcomi.cc/conditions-generales-dutilisation-cgu";
const PRIVACY_POLICY_URL = "https://www.upcomi.cc/politique-de-confidentialite";

const EMPTY_PROFILE: UserProfileFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  city: "",
  practiceTypes: [],
  practiceLevel: "",
  gender: "",
};

const STEP_TITLES: Record<SignupWizardStep, { title: string; description?: string }> = {
  methode: {
    title: "Créer ton compte",
    description: "Sauvegarde tes événements et retrouve la communauté Upcomi.",
  },
  identite: { title: "Bienvenue dans la communauté Upcomi !" },
  profil: { title: "Où roules-tu, et comment ?" },
  recommandations: {
    title: "As-tu déjà participé à des événements ?",
    description: "Si oui, indique ceux que tu recommandes à la communauté.",
  },
  recits: {
    title: "As-tu écrit un récit ou pris des photos de l'événement ?",
    description:
      "Pour aider les autres membres de la communauté, ajoute un lien vers Instagram, Strava ou ton blog pour ajouter ton récit ou tes photos à l'événement. L'équipe le relit avant qu'il n'apparaisse sur la fiche.",
  },
  confirmation: { title: "C'est tout bon !" },
};

interface SignupWizardProps {
  /** « profil » pour reprendre un parcours interrompu (retour de Google, session coupée). */
  startStep?: SignupWizardStep;
  initialValues?: UserProfileFormValues;
  redirectTo?: string;
  onSwitchToLogin?: () => void;
  /** Appelé une fois le parcours terminé, avant la redirection (fermeture de la modale hôte). */
  onDone?: () => void;
}

export function SignupWizard({
  startStep = "methode",
  initialValues,
  redirectTo = "/",
  onSwitchToLogin,
  onDone,
}: SignupWizardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<SignupWizardStep>(startStep);
  // Le genre est demandé avec le prénom et le nom. Quand le parcours reprend
  // plus loin (retour de Google, session coupée), cette étape n'est jamais
  // jouée : la question est alors rattachée à l'étape « profil ».
  const identityStepSkipped = startStep !== "methode";
  const [profile, setProfile] = useState<UserProfileFormValues>(() =>
    normalizeUserProfile(initialValues ?? EMPTY_PROFILE)
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
  const [recommended, setRecommended] = useState<RecommendableEvent[]>([]);
  // Un seul récit est demandé, comme dans le proto : le premier événement
  // recommandé qui n'en a pas déjà un. Nul tant que l'étape n'est pas atteinte.
  const [storyEvent, setStoryEvent] = useState<RecommendableEvent | null>(null);
  const [storyUrl, setStoryUrl] = useState("");
  const [story, setStory] = useState("");
  const [signedUpUser, setSignedUpUser] = useState<User | null>(null);
  // Vrai seulement si le projet Supabase exige une confirmation par email :
  // `signUp` renvoie alors un compte sans session, et le parcours ne peut pas
  // continuer tant que le lien n'a pas été ouvert.
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const accountUser = user ?? signedUpUser;
  // Sans événement recommandé il n'y a rien à raconter : l'étape « récits » est
  // sautée, et la pastille correspondante disparaît de la barre de progression.
  // Elle est aussi sautée, plus tard, si tous les événements choisis ont déjà
  // un récit — ça ne se sait qu'une fois la question posée à la base.
  const visibleSteps = useMemo<readonly SignupWizardStep[]>(
    () => (recommended.length > 0 ? STEPS : STEPS.filter((name) => name !== "recits")),
    [recommended.length]
  );
  const stepIndex = visibleSteps.indexOf(step);
  const heading = STEP_TITLES[step];

  const updateProfile = (patch: Partial<UserProfileFormValues>) => {
    setProfile((current) => ({ ...current, ...patch }));
  };

  const togglePracticeType = (practiceType: string) => {
    setProfile((current) => ({
      ...current,
      practiceTypes: current.practiceTypes.includes(practiceType)
        ? current.practiceTypes.filter((item) => item !== practiceType)
        : [...current.practiceTypes, practiceType],
    }));
  };

  // ---- Étape 1 : méthode d'inscription --------------------------------------

  const handleMethodSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    updateProfile({ email: profile.email.trim().toLowerCase() });
    setStep("identite");
  };

  // ---- Étape 2 : identité, mot de passe, genre -------------------------------

  const handleIdentitySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setError("Merci d'indiquer ton prénom et ton nom.");
      return;
    }

    if (!isPasswordValid(password)) {
      setError(getPasswordRequirementsMessage());
      trackAnalyticsEvent("Signup Submitted", { success: false, reason: "weak_password" });
      return;
    }

    if (!acceptedPrivacyPolicy) {
      setError("Tu dois accepter les CGU et la politique de confidentialité pour créer un compte");
      trackAnalyticsEvent("Signup Submitted", { success: false, reason: "privacy_not_accepted" });
      return;
    }

    setPending(true);

    const nextProfile = normalizeUserProfile(profile);
    const acceptedAt = new Date().toISOString();
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: nextProfile.email,
      password,
      options: {
        data: {
          first_name: nextProfile.firstName,
          last_name: nextProfile.lastName,
          gender: nextProfile.gender,
          terms_accepted: true,
          terms_accepted_at: acceptedAt,
          terms_url: TERMS_URL,
          privacy_policy_accepted: true,
          privacy_policy_accepted_at: acceptedAt,
          privacy_policy_url: PRIVACY_POLICY_URL,
        },
      },
    });

    if (signUpError) {
      const alreadyRegistered = signUpError.message.includes("already registered");
      trackAnalyticsEvent("Signup Submitted", {
        success: false,
        reason: alreadyRegistered ? "already_registered" : "supabase_error",
      });
      setError(
        alreadyRegistered
          ? "Un compte existe déjà avec cet email"
          : translatePasswordError(signUpError.message)
      );
      setPending(false);
      return;
    }

    trackAnalyticsEvent("Signup Submitted", { success: true });
    trackAnalyticsEvent("Signup Completed");
    setProfile(nextProfile);
    setPending(false);

    if (!data.session) {
      setAwaitingEmailConfirmation(true);
      return;
    }

    setSignedUpUser(data.user);
    setStep("profil");
  };

  // ---- Étape 3 : ville, niveau, pratiques ------------------------------------
  //
  // Le profil est enregistré ici, et pas seulement à la fin : si le parcours
  // est interrompu à l'étape suivante, rien n'est perdu. Le drapeau
  // « onboarding terminé » n'est posé qu'à la dernière étape.

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!accountUser) {
      setError("Ta session a expiré. Reconnecte-toi pour continuer.");
      return;
    }

    const nextProfile = normalizeUserProfile(profile);

    if (!isUserProfileComplete(nextProfile)) {
      setError("Merci de renseigner ta ville, ton type de pratique et ton niveau.");
      return;
    }

    setPending(true);
    const { error: saveError } = await saveUserProfile(createClient(), accountUser, nextProfile);
    setPending(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    setProfile(nextProfile);
    setStep("recommandations");
  };

  // ---- Étape 4 : événements recommandés --------------------------------------

  // Le drapeau « onboarding terminé » est posé une seule fois, quel que soit le
  // chemin emprunté — avec ou sans étape « récits ».
  const completeOnboarding = async ({ storyAdded }: { storyAdded: boolean }) => {
    const { error: flagError } = await createClient().auth.updateUser({
      data: { onboarding_completed: true },
    });
    setPending(false);

    if (flagError) {
      setError(flagError.message || "Impossible de finaliser ton inscription.");
      return;
    }

    trackAnalyticsEvent("Onboarding Completed", {
      recommended_events: recommended.length,
      story_added: storyAdded,
    });
    setStep("confirmation");
  };

  const handleRecommendationsSubmit = async () => {
    setError(null);

    if (!accountUser) {
      setError("Ta session a expiré. Reconnecte-toi pour continuer.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: recommendationsError } = await saveRecommendedEvents(
      supabase,
      accountUser,
      recommended.map((event) => event.id)
    );

    if (recommendationsError) {
      setPending(false);
      setError(recommendationsError);
      return;
    }

    // Les recommandations sont enregistrées avant l'étape suivante, sur le
    // modèle du profil : une interruption pendant le récit ne les perd pas.
    const alreadyCovered = await fetchEventsWithStories(
      supabase,
      recommended.map((event) => event.id)
    );
    const nextStoryEvent =
      recommended.find((event) => !alreadyCovered.has(event.id)) ?? null;

    if (!nextStoryEvent) {
      await completeOnboarding({ storyAdded: false });
      return;
    }

    setStoryEvent(nextStoryEvent);
    setPending(false);
    setStep("recits");
  };

  // ---- Étape 5 : récits ------------------------------------------------------

  // « Ajouter » valide l'étape même les champs vides : le récit est facultatif
  // de bout en bout, et le proto ne double donc pas le bouton d'un « Passer ».
  const handleStorySubmit = async () => {
    setError(null);

    if (!accountUser || !storyEvent) {
      setError("Ta session a expiré. Reconnecte-toi pour continuer.");
      return;
    }

    setPending(true);
    const { error: storyError, saved } = await saveEventStory(createClient(), accountUser, {
      eventId: storyEvent.id,
      storyUrl,
      story,
    });

    if (storyError) {
      setPending(false);
      setError(storyError);
      return;
    }

    await completeOnboarding({ storyAdded: saved });
  };

  // ---- Étape 6 : confirmation -------------------------------------------------

  const handleDone = () => {
    onDone?.();
    router.replace(sanitizeRedirectPath(redirectTo, "/"));
    router.refresh();
  };

  if (awaitingEmailConfirmation) {
    return (
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto size-7 text-foreground/72" />
        <h3 className="font-serif text-[20px] leading-tight text-foreground">
          Vérifie ta boîte mail
        </h3>
        <Muted>
          On vient d&apos;envoyer un lien de confirmation à{" "}
          <span className="font-semibold text-foreground">{profile.email}</span>. Ouvre-le
          pour finir de créer ton profil.
        </Muted>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepDots steps={visibleSteps} currentIndex={stepIndex} />

      <div className="space-y-1.5">
        <h3 className="font-serif text-[20px] font-bold leading-tight text-foreground">
          {heading.title}
        </h3>
        {heading.description && <Muted>{heading.description}</Muted>}
      </div>

      {error && (
        <div className="rounded-[var(--radius-sm)] border border-red-200/60 bg-red-50/80 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </div>
      )}

      {step === "methode" && (
        <MethodStep
          email={profile.email}
          redirectTo={redirectTo}
          onEmailChange={(value) => updateProfile({ email: value })}
          onSubmit={handleMethodSubmit}
          onSwitchToLogin={onSwitchToLogin}
        />
      )}

      {step === "identite" && (
        <form onSubmit={handleIdentitySubmit} className="space-y-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="signup-first-name">
              <input
                id="signup-first-name"
                type="text"
                value={profile.firstName}
                onChange={(event) => updateProfile({ firstName: event.target.value })}
                required
                disabled={pending}
                className={FIELD_INPUT_CLASS}
                placeholder="Ton prénom"
              />
            </Field>
            <Field label="Nom" htmlFor="signup-last-name">
              <input
                id="signup-last-name"
                type="text"
                value={profile.lastName}
                onChange={(event) => updateProfile({ lastName: event.target.value })}
                required
                disabled={pending}
                className={FIELD_INPUT_CLASS}
                placeholder="Ton nom"
              />
            </Field>
          </div>

          <GenderField
            value={profile.gender}
            disabled={pending}
            onChange={(gender) => updateProfile({ gender })}
          />

          <Field label="Mot de passe" htmlFor="signup-password">
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={PASSWORD_MIN_LENGTH}
                disabled={pending}
                className={`${FIELD_INPUT_CLASS} pr-10`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={pending}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-foreground/40 transition-colors hover:text-foreground disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <PasswordRequirements password={password} />
          </Field>

          <label
            htmlFor="signup-privacy-policy"
            className="flex items-start gap-2.5 text-[13px] leading-5 text-foreground/60"
          >
            <input
              id="signup-privacy-policy"
              type="checkbox"
              checked={acceptedPrivacyPolicy}
              onChange={(event) => setAcceptedPrivacyPolicy(event.target.checked)}
              required
              disabled={pending}
              className="mt-0.5 h-3.5 w-3.5 flex-none rounded border-white/70 text-coral focus:ring-2 focus:ring-orange/40"
            />
            <span>
              J&apos;ai lu et j&apos;accepte les{" "}
              <ExternalLink href={TERMS_URL}>CGU</ExternalLink> et la{" "}
              <ExternalLink href={PRIVACY_POLICY_URL}>
                politique de confidentialité
              </ExternalLink>
              .
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep("methode");
              }}
              disabled={pending}
              className="rounded-[var(--radius-sm)] px-3.5 py-3 text-sm font-medium text-foreground/55 transition-colors hover:text-foreground disabled:opacity-50"
            >
              Retour
            </button>
            <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON_CLASS} flex-1`}>
              {pending ? "Création..." : "Continuer →"}
            </button>
          </div>
        </form>
      )}

      {step === "profil" && (
        <form onSubmit={handleProfileSubmit} className="space-y-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Ville" htmlFor="signup-city">
              <input
                id="signup-city"
                type="text"
                value={profile.city}
                onChange={(event) => updateProfile({ city: event.target.value })}
                required
                disabled={pending}
                className={FIELD_INPUT_CLASS}
                placeholder="Nantes, Lyon…"
              />
            </Field>
            <Field label="Niveau" htmlFor="signup-level">
              <select
                id="signup-level"
                value={profile.practiceLevel}
                onChange={(event) => updateProfile({ practiceLevel: event.target.value })}
                required
                disabled={pending}
                className={FIELD_INPUT_CLASS}
              >
                <option value="">Choisir</option>
                {PRACTICE_LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Type de pratique">
            <PillGroup
              options={PRACTICE_TYPE_OPTIONS}
              isActive={(option) => profile.practiceTypes.includes(option)}
              onSelect={togglePracticeType}
              disabled={pending}
            />
          </Field>

          {identityStepSkipped && (
            <GenderField
              value={profile.gender}
              disabled={pending}
              onChange={(gender) => updateProfile({ gender })}
            />
          )}

          <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON_CLASS} w-full`}>
            {pending ? "Enregistrement..." : "Continuer →"}
          </button>
        </form>
      )}

      {step === "recommandations" && (
        <div className="space-y-4">
          <RecommendedEventsPicker
            selected={recommended}
            onChange={setRecommended}
            disabled={pending}
          />
          <button
            type="button"
            onClick={handleRecommendationsSubmit}
            disabled={pending}
            className={`${PRIMARY_BUTTON_CLASS} w-full`}
          >
            {pending
              ? "Enregistrement..."
              : recommended.length > 0
                ? "Continuer →"
                : "Passer cette étape"}
          </button>
        </div>
      )}

      {step === "recits" && storyEvent && (
        <div className="space-y-4">
          <EventStoryForm
            event={storyEvent}
            storyUrl={storyUrl}
            story={story}
            onStoryUrlChange={setStoryUrl}
            onStoryChange={setStory}
            disabled={pending}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep("recommandations");
              }}
              disabled={pending}
              className="rounded-[var(--radius-sm)] px-3.5 py-3 text-sm font-medium text-foreground/55 transition-colors hover:text-foreground disabled:opacity-50"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={handleStorySubmit}
              disabled={pending}
              className={`${PRIMARY_BUTTON_CLASS} flex-1`}
            >
              {pending ? "Enregistrement..." : "Ajouter →"}
            </button>
          </div>
        </div>
      )}

      {step === "confirmation" && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <CircleCheck className="size-16 text-foreground/72" />
            <Muted>
              Bienvenue dans la communauté Upcomi
              {profile.firstName ? `, ${profile.firstName}` : ""} !
            </Muted>
          </div>
          <button type="button" onClick={handleDone} className={`${PRIMARY_BUTTON_CLASS} w-full`}>
            Continuer →
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Étape 1, extraite pour garder le composant principal lisible ------------

interface MethodStepProps {
  email: string;
  redirectTo: string;
  onEmailChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onSwitchToLogin?: () => void;
}

function MethodStep({
  email,
  redirectTo,
  onEmailChange,
  onSubmit,
  onSwitchToLogin,
}: MethodStepProps) {
  return (
    <div>
      <GoogleAuthButton mode="signup" redirectTo={redirectTo} />
      <Muted className="mt-2 text-center">
        En continuant avec Google, tu acceptes les{" "}
        <ExternalLink href={TERMS_URL}>CGU</ExternalLink> et la{" "}
        <ExternalLink href={PRIVACY_POLICY_URL}>politique de confidentialité</ExternalLink>.
      </Muted>

      <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/35">
        <span className="h-px flex-1 bg-foreground/10" />
        ou
        <span className="h-px flex-1 bg-foreground/10" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3.5">
        <Field label="Email" htmlFor="signup-email">
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            required
            className={FIELD_INPUT_CLASS}
            placeholder="ton@email.com"
          />
        </Field>

        <button type="submit" className={`${PRIMARY_BUTTON_CLASS} w-full`}>
          Continuer avec email
        </button>
      </form>

      <Muted className="mt-5 text-center">
        Déjà un compte ?{" "}
        {onSwitchToLogin ? (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-coral hover:text-coral-dark"
          >
            Se connecter
          </button>
        ) : (
          <Link href="/login" className="font-semibold text-coral hover:text-coral-dark">
            Se connecter
          </Link>
        )}
      </Muted>
    </div>
  );
}

// ---- Briques d'UI partagées ---------------------------------------------------

const PRIMARY_BUTTON_CLASS =
  "rounded-[var(--radius-sm)] bg-coral py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,94,65,0.35)] transition-all hover:bg-coral-dark hover:shadow-[0_6px_24px_rgba(255,94,65,0.45)] disabled:opacity-50";

function StepDots({
  steps,
  currentIndex,
}: {
  steps: readonly SignupWizardStep[];
  currentIndex: number;
}) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {steps.map((stepName, index) => (
        <span
          key={stepName}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            index < currentIndex
              ? "bg-coral/45"
              : index === currentIndex
                ? "bg-coral"
                : "bg-foreground/10"
          }`}
        />
      ))}
    </div>
  );
}

function PillGroup({
  options,
  isActive,
  onSelect,
  disabled,
}: {
  options: readonly string[];
  isActive: (option: string) => boolean;
  onSelect: (option: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = isActive(option);

        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onSelect(option)}
            className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${
              active
                ? "border-orange/45 bg-orange/12 text-orange-dark"
                : "border-white/65 bg-white/70 text-foreground/70 hover:border-orange/25 hover:text-foreground"
            } disabled:opacity-50`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

// Facultatif de bout en bout : recliquer sur la réponse déjà sélectionnée la
// retire, et ne rien choisir laisse la colonne `users.genre` à `null`.
function GenderField({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const options = useMemo(() => [...GENDER_OPTIONS], []);

  return (
    <div>
      <FieldLabel>
        Genre <span className="normal-case tracking-normal text-foreground/40">(facultatif)</span>
      </FieldLabel>
      <PillGroup
        options={options}
        isActive={(option) => value === option}
        onSelect={(option) => onChange(value === option ? "" : option)}
        disabled={disabled}
      />
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-coral hover:text-coral-dark"
    >
      {children}
    </Link>
  );
}
