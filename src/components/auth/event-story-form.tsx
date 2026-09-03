"use client";

import { Field, FIELD_INPUT_CLASS } from "@/components/ui/field";
import { EVENT_STORY_MAX_LENGTH } from "@/lib/profile-mutations";
import { EventThumb, type RecommendableEvent } from "./recommended-events-picker";

interface EventStoryFormProps {
  event: RecommendableEvent;
  storyUrl: string;
  story: string;
  onStoryUrlChange: (value: string) => void;
  onStoryChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * L'étape « Ajoute ton récit d'aventure » du prototype (`review.js`) : un seul
 * champ, le lien vers là où le récit a déjà été publié. Le texte libre est
 * gardé sous le lien — la table le prévoit et il viendra compléter l'extrait.
 */
export function EventStoryForm({
  event,
  storyUrl,
  story,
  onStoryUrlChange,
  onStoryChange,
  disabled = false,
}: EventStoryFormProps) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-3">
        <EventThumb event={event} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
          {event.nomEvent || "Événement"}
        </span>
      </div>

      <Field label="Lien vers ton récit (facultatif)" htmlFor="signup-story-url">
        <input
          id="signup-story-url"
          type="url"
          inputMode="url"
          value={storyUrl}
          onChange={(changeEvent) => onStoryUrlChange(changeEvent.target.value)}
          disabled={disabled}
          autoComplete="off"
          placeholder="Colle le lien vers Instagram, Strava ou ton blog"
          className={FIELD_INPUT_CLASS}
        />
      </Field>

      <Field label="Quelques mots (facultatif)" htmlFor="signup-story">
        <textarea
          id="signup-story"
          value={story}
          onChange={(changeEvent) => onStoryChange(changeEvent.target.value)}
          disabled={disabled}
          rows={3}
          maxLength={EVENT_STORY_MAX_LENGTH}
          placeholder="Le parcours, l'ambiance, ce que tu aurais aimé savoir avant de partir…"
          className={`${FIELD_INPUT_CLASS} resize-y leading-6`}
        />
      </Field>
    </div>
  );
}
