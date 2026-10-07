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
 * Un seul événement : un lien, quelques mots, ou les deux.
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
        <span className="min-w-0 flex-1 break-words text-[13px] font-medium text-foreground">
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

      <Field label="Ton récit en quelques mots (facultatif)" htmlFor="signup-story">
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
        {/* Le compteur reste discret et n'alerte pas : le champ ne laisse pas
            dépasser, il n'y a donc pas d'erreur à annoncer. Il dit seulement
            combien il reste de place, ce que « en quelques mots » ne chiffre
            pas. */}
        <p className="mt-1 text-right text-[12px] tabular-nums text-foreground/65">
          {story.length} / {EVENT_STORY_MAX_LENGTH}
        </p>
      </Field>
      <p className="text-[12px] leading-5 text-foreground/65">
        L&apos;équipe relit ton récit avant sa publication sur la fiche de l&apos;événement.
      </p>
    </div>
  );
}
