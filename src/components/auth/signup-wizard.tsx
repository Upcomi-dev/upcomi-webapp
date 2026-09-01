"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { CircleCheck, MailCheck } from "lucide-react";
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
import { saveRecommendedEvents, saveUserProfile } from "@/lib/profile-mutations";
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
const STEPS = ["methode", "identite", "profil", "recommandations", "confirmation"] as const;

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
  const [profile, setProfile] = useState<UserProfileFormValues>(() =>
    normalizeUserProfile(initialValues ?? EMPTY_PROFILE)
  );
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
  const [recommended, setRecommended] = useState<RecommendableEvent[]>([]);
  const [signedUpUser, setSignedUpUser] = useState<User | null>(null);
  // Vrai seulement si le projet Supabase exige une confirmation par email :
  // `signUp` renvoie alors un compte sans session, et le parcours ne peut pas
  // continuer tant que le lien n'a pas été ouvert.
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const accountUser = user ?? signedUpUser;
  const stepIndex = STEPS.indexOf(step);
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

    const normalizedEmail = profile.email.trim().toLowerCase();

    if (normalizedEmail !== emailConfirmation.trim().toLowerCase()) {
      setError("Les emails ne correspondent pas");
      trackAnalyticsEvent("Signup Submitted", { success: false, reason: "email_mismatch" });
      return;
    }

    updateProfile({ email: normalizedEmail });
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

    if (password !== passwordConfirmation) {
      setError("Les mots de passe ne correspondent pas");
      trackAnalyticsEvent("Signup Submitted", { success: false, reason: "password_mismatch" });
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

  const handleFinish = async () => {
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

    const { error: flagError } = await supabase.auth.updateUser({
      data: { onboarding_completed: true },
    });
    setPending(false);

    if (flagError) {
      setError(flagError.message || "Impossible de finaliser ton inscription.");
      return;
    }

    trackAnalyticsEvent("Onboarding Completed", {
      recommended_events: recommended.length,
    });
    setStep("confirmation");
  };

  // ---- Étape 5 : confirmation -------------------------------------------------

  const handleDone = () => {
    onDone?.();
    router.replace(sanitizeRedirectPath(redirectTo, "/"));
    router.refresh();
  };

  if (awaitingEmailConfirmation) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-orange/12 text-orange-dark">
          <MailCheck className="size-6" />
        </div>
        <h3 className="font-serif text-[20px] leading-tight text-foreground">
          Vérifie ta boîte mail
        </h3>
        <p className="text-[13px] leading-6 text-foreground/60">
          On vient d&apos;envoyer un lien de confirmation à{" "}
          <span className="font-semibold text-foreground">{profile.email}</span>. Ouvre-le
          pour finir de créer ton profil.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepDots currentIndex={stepIndex} />

      <div className="space-y-1.5">
        <h3 className="font-serif text-[20px] font-bold leading-tight text-foreground">
          {heading.title}
        </h3>
        {heading.description && (
          <p className="text-[13px] leading-5 text-foreground/52">{heading.description}</p>
        )}
      </div>

      {error && (
        <div className="rounded-[var(--radius-sm)] border border-red-200/60 bg-red-50/80 px-3.5 py-2.5 text-[13px] text-red-600">
          {error}
        </div>
      )}

      {step === "methode" && (
        <MethodStep
          email={profile.email}
          emailConfirmation={emailConfirmation}
          redirectTo={redirectTo}
          onEmailChange={(value) => updateProfile({ email: value })}
          onEmailConfirmationChange={setEmailConfirmation}
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
                className={INPUT_CLASS}
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
                className={INPUT_CLASS}
                placeholder="Ton nom"
              />
            </Field>
          </div>

          <Field label="Mot de passe" htmlFor="signup-password">
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
              disabled={pending}
              className={INPUT_CLASS}
              placeholder="8 caractères minimum"
            />
            <PasswordRequirements password={password} />
          </Field>

          <Field label="Confirmation du mot de passe" htmlFor="signup-password-confirmation">
            <input
              id="signup-password-confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
              disabled={pending}
              className={INPUT_CLASS}
              placeholder="Confirme ton mot de passe"
            />
          </Field>

          <GenderField
            value={profile.gender}
            disabled={pending}
            onChange={(gender) => updateProfile({ gender })}
          />

          <label
            htmlFor="signup-privacy-policy"
            className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-white/55 bg-white/42 px-3.5 py-3 text-[13px] leading-5 text-foreground/72"
          >
            <input
              id="signup-privacy-policy"
              type="checkbox"
              checked={acceptedPrivacyPolicy}
              onChange={(event) => setAcceptedPrivacyPolicy(event.target.checked)}
              required
              disabled={pending}
              className="mt-0.5 h-4 w-4 rounded border-white/70 text-coral focus:ring-2 focus:ring-orange/40"
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
                className={INPUT_CLASS}
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
                className={INPUT_CLASS}
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
            onClick={handleFinish}
            disabled={pending}
            className={`${PRIMARY_BUTTON_CLASS} w-full`}
          >
            {pending ? "Enregistrement..." : recommended.length > 0 ? "Terminer" : "Passer cette étape"}
          </button>
        </div>
      )}

      {step === "confirmation" && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-orange/12 text-orange-dark">
              <CircleCheck className="size-7" />
            </div>
            <p className="text-[14px] leading-6 text-foreground/68">
              Ton compte est bien créé
              {profile.firstName ? `, ${profile.firstName}` : ""} — bienvenue dans la
              communauté Upcomi !
            </p>
          </div>
          <button type="button" onClick={handleDone} className={`${PRIMARY_BUTTON_CLASS} w-full`}>
            C&apos;est parti →
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Étape 1, extraite pour garder le composant principal lisible ------------

interface MethodStepProps {
  email: string;
  emailConfirmation: string;
  redirectTo: string;
  onEmailChange: (value: string) => void;
  onEmailConfirmationChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onSwitchToLogin?: () => void;
}

function MethodStep({
  email,
  emailConfirmation,
  redirectTo,
  onEmailChange,
  onEmailConfirmationChange,
  onSubmit,
  onSwitchToLogin,
}: MethodStepProps) {
  return (
    <div>
      <GoogleAuthButton mode="signup" redirectTo={redirectTo} />
      <p className="mt-2 text-center text-[11px] leading-4 text-foreground/45">
        En continuant avec Google, tu acceptes les{" "}
        <ExternalLink href={TERMS_URL}>CGU</ExternalLink> et la{" "}
        <ExternalLink href={PRIVACY_POLICY_URL}>politique de confidentialité</ExternalLink>.
      </p>

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
            className={INPUT_CLASS}
            placeholder="ton@email.com"
          />
        </Field>

        <Field label="Confirmation de l'email" htmlFor="signup-email-confirmation">
          <input
            id="signup-email-confirmation"
            type="email"
            value={emailConfirmation}
            onChange={(event) => onEmailConfirmationChange(event.target.value)}
            required
            className={INPUT_CLASS}
            placeholder="Confirme ton email"
          />
        </Field>

        <button type="submit" className={`${PRIMARY_BUTTON_CLASS} w-full`}>
          Continuer avec email
        </button>
      </form>

      <div className="mt-5 text-center text-[13px] text-foreground/45">
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
      </div>
    </div>
  );
}

// ---- Briques d'UI partagées ---------------------------------------------------

const INPUT_CLASS =
  "soft-ring w-full rounded-[var(--radius-sm)] bg-white/58 px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange/40 disabled:opacity-50";

const PRIMARY_BUTTON_CLASS =
  "rounded-[var(--radius-sm)] bg-coral py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,94,65,0.35)] transition-all hover:bg-coral-dark hover:shadow-[0_6px_24px_rgba(255,94,65,0.45)] disabled:opacity-50";

function StepDots({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {STEPS.map((stepName, index) => (
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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/40"
      >
        {label}
      </label>
      {children}
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
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/40">
        Genre <span className="normal-case tracking-normal text-foreground/35">(facultatif)</span>
      </label>
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
