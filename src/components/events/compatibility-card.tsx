"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, UserRoundSearch, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-context";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useFavorites } from "@/components/favorites/favorites-context";
import { CompatibilityPath } from "@/components/events/compatibility-path";
import { PeopleSheet } from "@/components/events/people-sheet";
import { useInterestedPeople } from "@/components/events/interested-people-context";
import {
  clearCompatAnswers,
  fetchCompatAnswers,
  saveCompatAnswers,
} from "@/lib/compatibility/answers";
import { getTierForScore } from "@/lib/compatibility/levels";
import {
  getCompatQuestions,
  ITINERARY_QUESTION_KEY,
  type CompatAnswers,
  type CompatQuestion,
} from "@/lib/compatibility/questions";
import { computeCompatibility, getProfileScore } from "@/lib/compatibility/scoring";
import type { CompatEventInput } from "@/lib/compatibility/scoring";
import { getSimilarPeople } from "@/lib/events/interested-people";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Le bloc lila de la fiche évènement : « Qui participe déjà ? ».
 *
 * Le questionnaire ne sert pas à noter l'évènement mais à **se situer parmi
 * les personnes déjà intéressées** — c'est la V2 du prototype, et c'est ce qui
 * réunit le score d'adéquation et le bloc social en un seul endroit.
 *
 * Trois états : l'accroche, le pas-à-pas (une question à la fois), le
 * résultat. Le chemin, lui, est toujours là.
 */

type CardState =
  | { kind: "idle" }
  | { kind: "stepping"; step: number; answers: CompatAnswers }
  | { kind: "result" };

export function CompatibilityCard({
  eventId,
  event,
  eventDate,
  className,
}: {
  eventId: number;
  event: CompatEventInput;
  /** Date de départ (`events.dateEvent`), pour le délai de préparation. */
  eventDate: string | null;
  className?: string;
}) {
  const { user, ready: authReady } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { isFavorite, toggleFavorite, ready: favoritesReady } = useFavorites();
  const { count, people } = useInterestedPeople();

  const [state, setState] = useState<CardState>({ kind: "idle" });
  const [answers, setAnswers] = useState<CompatAnswers | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Réponses déjà enregistrées : le bloc s'ouvre alors directement sur le
  // résultat, sur cette fiche comme sur toutes les autres — le profil est
  // global, on ne repasse pas le questionnaire à chaque évènement.
  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;
    void (async () => {
      // Déconnectée : rien à charger, et rien à garder d'une session
      // précédente — le bloc repart de son accroche.
      const saved = user ? await fetchCompatAnswers(createClient(), user) : null;
      if (cancelled) return;
      setAnswers(saved);
      setState(saved ? { kind: "result" } : { kind: "idle" });
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  const questions = useMemo(
    () =>
      getCompatQuestions(
        event.name,
        event.routes,
        state.kind === "stepping" ? state.answers : (answers ?? {})
      ),
    [event.name, event.routes, state, answers]
  );

  const result = useMemo(
    () => (answers ? computeCompatibility(event, answers) : null),
    [answers, event]
  );

  const myTier = useMemo(() => getTierForScore(getProfileScore(answers)), [answers]);
  const similar = useMemo(
    () => getSimilarPeople(people, myTier, user?.id ?? null),
    [people, myTier, user?.id]
  );

  const favorited = isFavorite(eventId);

  // Mois restants avant le départ, pour situer les conseils dans le temps :
  // « quelques conseils » n'a pas le même poids à trois semaines qu'à un an.
  const monthsToPrepare = useMemo(() => getMonthsUntil(eventDate), [eventDate]);

  const persist = useCallback(
    async (finalAnswers: CompatAnswers) => {
      if (!user) return;
      await saveCompatAnswers(createClient(), user, finalAnswers);
    },
    [user]
  );

  const answer = useCallback(
    (question: CompatQuestion, value: string) => {
      if (state.kind !== "stepping") return;

      const nextAnswers = { ...state.answers, [question.key]: value };
      // La liste des questions dépend des réponses déjà données (l'itinéraire
      // choisi décide si l'on demande le niveau gravel ou VTT) : elle est
      // recalculée à chaque réponse, jamais figée au démarrage.
      const nextQuestions = getCompatQuestions(event.name, event.routes, nextAnswers);

      if (state.step < nextQuestions.length - 1) {
        setState({ kind: "stepping", step: state.step + 1, answers: nextAnswers });
        return;
      }

      setAnswers(nextAnswers);
      setState({ kind: "result" });
      trackAnalyticsEvent("Compatibility Completed", {
        event_id: eventId,
        authenticated: Boolean(user),
      });
      // Le résultat est dû dès que les questions sont répondues, avec ou sans
      // compte : en test, ne rien voir s'afficher à la fin du questionnaire
      // était pris pour un bug. Déconnectée, il n'est simplement pas gardé.
      void persist(nextAnswers);
    },
    [state, event.name, event.routes, eventId, user, persist]
  );

  const restart = useCallback(() => {
    setAnswers(null);
    setState({ kind: "stepping", step: 0, answers: {} });
    if (user) void clearCompatAnswers(createClient(), user);
  }, [user]);

  const handleInterest = useCallback(async () => {
    if (!favoritesReady) return;
    if (!user) {
      openAuthModal({
        title: `Rejoins la communauté Upcomi pour indiquer que ${event.name} t'intéresse`,
      });
      return;
    }
    await toggleFavorite(eventId);
    trackAnalyticsEvent("Favorite Toggled", {
      event_id: eventId,
      action: favorited ? "remove" : "add",
      authenticated: true,
      source: "compatibility_card",
    });
  }, [favoritesReady, user, openAuthModal, event.name, toggleFavorite, eventId, favorited]);

  const openSheet = useCallback(() => {
    if (!user) {
      openAuthModal({
        title: "Rejoins la communauté Upcomi pour voir qui est déjà intéressé·e",
      });
      return;
    }
    setSheetOpen(true);
  }, [user, openAuthModal]);

  // Position du personnage : au tout début tant qu'aucune question **notée**
  // n'a de réponse. L'itinéraire ne note rien par lui-même, et certains
  // critères (le revêtement sur un parcours 100 % route) seraient sinon
  // comptés gratuitement dès qu'il est choisi, avant la première vraie
  // question de niveau.
  const steppingOverall = useMemo(() => {
    if (state.kind !== "stepping") return null;
    const scored = Object.keys(state.answers).filter((key) => key !== ITINERARY_QUESTION_KEY);
    if (scored.length === 0) return 0;
    return computeCompatibility(event, state.answers).overall;
  }, [state, event]);

  const overall =
    state.kind === "result" ? (result?.overall ?? null) : state.kind === "stepping" ? steppingOverall : null;

  return (
    <div
      className={cn(
        "compat-card relative mb-5 overflow-hidden scroll-mt-24 rounded-[var(--radius)] bg-violet p-7 text-white",
        className
      )}
    >
      {/* Filigrane, comme sur la maquette : l'icône déborde du coin, très
          discrète, et le titre passe devant. */}
      <UserRoundSearch
        className="pointer-events-none absolute -top-[26px] -right-[26px] z-0 h-[92px] w-[92px] text-white opacity-[0.18]"
        strokeWidth={1.2}
        aria-hidden
      />

      <h2 className="relative z-[1] mb-1 font-serif text-[22px] leading-tight text-white">
        Qui participe déjà&nbsp;?
      </h2>

      <CompatibilityPath overall={overall} interestedCount={count} />

      <hr className="mb-[18px] border-none border-t border-white/20" />

      {state.kind === "idle" && (
        <>
          <p className="mb-4 text-sm text-white/80">
            Réponds à quelques questions pour te situer parmi les personnes déjà intéressées.
          </p>
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => {
              setState({ kind: "stepping", step: 0, answers: {} });
              trackAnalyticsEvent("Compatibility Started", { event_id: eventId });
            }}
          >
            Commencer →
          </button>
        </>
      )}

      {state.kind === "stepping" && (
        <SteppingBody
          key={questions[Math.min(state.step, questions.length - 1)].key}
          question={questions[Math.min(state.step, questions.length - 1)]}
          answers={state.answers}
          canGoBack={state.step > 0}
          onBack={() => setState({ ...state, step: state.step - 1 })}
          onAnswer={answer}
        />
      )}

      {state.kind === "result" && result && (
        <ResultBody
          count={count}
          similarCount={similar.length}
          monthsToPrepare={monthsToPrepare}
          gaps={result.criteria.filter((c) => c.score !== null && c.score < 9)}
          favorited={favorited}
          onOpenSheet={openSheet}
          onInterest={handleInterest}
          onRestart={restart}
        />
      )}

      {/* La même feuille que partout ailleurs sur la fiche : toutes les
          personnes intéressées, jamais la sélection « expérience similaire ».
          Celle-ci ne sert qu'à compter. */}
      <PeopleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={`Qui est intéressée par ${event.name} ?`}
        people={people}
      />
    </div>
  );
}

/**
 * Mois qui restent avant le départ. `null` quand la date manque ou qu'il reste
 * moins d'un mois : « tu as 0 mois pour te préparer » n'est pas un conseil.
 */
function getMonthsUntil(dateEvent: string | null): number | null {
  if (!dateEvent) return null;
  const departure = new Date(dateEvent);
  if (Number.isNaN(departure.getTime())) return null;

  const months = Math.floor((departure.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44));
  return months >= 1 ? months : null;
}

function tipsIntro(months: number | null): string {
  if (months === null) return "Pour te préparer de ton côté :";
  if (months === 1) return "Tu as un mois pour te préparer, voici quelques conseils :";
  return `Tu as ${months} mois pour te préparer, voici quelques conseils :`;
}

/** Une question à la fois : cliquer une réponse fait avancer, il n'y a pas de « Suivant ». */
function SteppingBody({
  question,
  answers,
  canGoBack,
  onBack,
  onAnswer,
}: {
  question: CompatQuestion;
  answers: CompatAnswers;
  canGoBack: boolean;
  onBack: () => void;
  onAnswer: (question: CompatQuestion, value: string) => void;
}) {
  const chosen = answers[question.key];
  // Le composant est remonté à chaque question (voir la `key` posée par
  // l'appelant) : le curseur repart donc de la bonne valeur sans avoir à la
  // resynchroniser, et la question suivante n'hérite pas de la précédente.
  const [sliderValue, setSliderValue] = useState(() =>
    question.type === "slider" ? Number(chosen ?? question.defaultValue) : 0
  );

  return (
    <>
      {canGoBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-2.5 block text-[13px] text-white/75 underline underline-offset-[3px] hover:text-white"
        >
          ← Précédent
        </button>
      )}
      <p className="mb-3.5 text-[15px] font-semibold leading-snug text-white">{question.question}</p>

      {question.type === "slider" ? (
        <div>
          <output className="mb-2 block text-center text-lg font-bold text-white">
            {question.resolve(sliderValue).label}
          </output>
          <input
            type="range"
            min={question.min}
            max={question.max}
            step={question.step}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="w-full accent-white"
            aria-label={question.question}
          />
          <div className="mb-3 flex justify-between text-[11px] text-white/70">
            <span>{question.min} km</span>
            <span>{question.max} km et +</span>
          </div>
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => onAnswer(question, String(sliderValue))}
          >
            Valider →
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAnswer(question, option.value)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-[13px] transition-colors",
                chosen === option.value
                  ? "border-white bg-white font-semibold text-violet-dark"
                  : "border-white/30 bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Le résultat mène avec la preuve sociale — c'est la promesse du bloc — et
 * passe les conseils de préparation en second, en secondaire.
 */
function ResultBody({
  count,
  similarCount,
  monthsToPrepare,
  gaps,
  favorited,
  onOpenSheet,
  onInterest,
  onRestart,
}: {
  count: number;
  similarCount: number;
  monthsToPrepare: number | null;
  gaps: { key: string; gapText: string }[];
  favorited: boolean;
  onOpenSheet: () => void;
  onInterest: () => void;
  onRestart: () => void;
}) {
  const plural = similarCount > 1;
  // « Personne » est toujours féminin, quel que soit qui est compté.
  const socialProof = (
    <button
      type="button"
      onClick={onOpenSheet}
      className="mb-2.5 flex w-full items-start gap-2 text-left text-[17px] font-extrabold leading-snug text-white"
    >
      <Users className="mt-0.5 h-[18px] w-[18px] flex-none" strokeWidth={2} />
      {/* « Intéressées », jamais « inscrites » : cohérence avec l'action
          « Ça m'intéresse », pour ne pas suggérer trop tôt un engagement à
          l'inscription. */}
      <span>
        {similarCount} personne{plural ? "s" : ""} avec une expérience similaire{" "}
        {plural ? "sont" : "est"} déjà intéressée{plural ? "s" : ""}
      </span>
    </button>
  );

  const tips = (
    <div className="mb-3.5 text-[13px] text-white/75">
      {gaps.length > 0 ? (
        <>
          <p className="mb-2 font-semibold text-white/90">{tipsIntro(monthsToPrepare)}</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-[18px] leading-relaxed">
            {gaps.map((criterion) => (
              <li key={criterion.key}>{criterion.gapText}</li>
            ))}
          </ul>
        </>
      ) : (
        <p>Tu as le profil pour cet évènement, fonce&nbsp;!</p>
      )}
    </div>
  );

  return (
    <>
      {/* Quand quelqu'un se reconnaît dans les intéressées, c'est la promesse
          du bloc et ça passe en tête ; les conseils suivent, en secondaire.
          Quand personne ne correspond, il n'y a plus rien à annoncer — ce sont
          les conseils qui deviennent la réponse, et ils prennent la tête. */}
      {similarCount > 0 ? (
        <>
          {socialProof}
          {tips}
        </>
      ) : (
        <>
          {tips}
          <p className="mb-3.5 text-[13px] text-white/60">
            {count > 0
              ? "Personne avec une expérience proche de la tienne pour l'instant."
              : "Personne ne s'est encore dit intéressée."}
          </p>
        </>
      )}

      <button
        type="button"
        onClick={onInterest}
        data-active={favorited}
        className="btn-secondary mb-3 w-full font-bold"
      >
        <Heart className={cn("h-[15px] w-[15px]", favorited && "fill-current")} />
        {favorited ? "Intéressé·e" : "Ça m'intéresse"}
      </button>

      <button
        type="button"
        onClick={onRestart}
        className="text-[13px] text-white/75 underline underline-offset-[3px] hover:text-white"
      >
        Recommencer
      </button>
    </>
  );
}
