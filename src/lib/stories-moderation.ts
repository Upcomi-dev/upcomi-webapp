import type { EventStoryStatus } from "@/lib/types/database";

/**
 * Les trois états d'un récit dans `/admin`.
 *
 * « En attente » est le défaut et n'est jamais affiché sur une fiche : un récit
 * est du texte libre publié à côté du nom de son autrice et du nom d'un
 * évènement, il se relit avant de paraître.
 */
export const EVENT_STORY_STATUS_OPTIONS: Array<{
  value: EventStoryStatus;
  label: string;
  description: string;
}> = [
  {
    value: "pending",
    label: "En attente",
    description: "Pas encore relu — invisible sur la fiche de l'évènement.",
  },
  {
    value: "approved",
    label: "Publié",
    description: "Relu et affiché sur la fiche de l'évènement.",
  },
  {
    value: "rejected",
    label: "Refusé",
    description: "Écarté à la relecture — conservé, mais jamais affiché.",
  },
];

export function isEventStoryStatus(value: string): value is EventStoryStatus {
  return EVENT_STORY_STATUS_OPTIONS.some((option) => option.value === value);
}

export function getEventStoryStatusLabel(status: EventStoryStatus) {
  return (
    EVENT_STORY_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
  );
}
