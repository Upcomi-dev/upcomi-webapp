import type { FeedbackKind, FeedbackStatus } from "@/lib/types/database";

export const FEEDBACK_KIND_OPTIONS: Array<{
  value: FeedbackKind;
  label: string;
  description: string;
}> = [
  {
    value: "idea",
    label: "Idée",
    description: "Une proposition pour améliorer le produit ou le contenu.",
  },
  {
    value: "bug",
    label: "Bug",
    description: "Un problème technique, un comportement cassé ou inattendu.",
  },
  {
    value: "feedback",
    label: "Feedback",
    description: "Un retour d'usage, une remarque ou une friction produit.",
  },
];

export const FEEDBACK_STATUS_OPTIONS: Array<{
  value: FeedbackStatus;
  label: string;
}> = [
  { value: "new", label: "Nouveau" },
  { value: "reviewing", label: "En cours" },
  { value: "closed", label: "Clôturé" },
];

export function isFeedbackKind(value: string): value is FeedbackKind {
  return FEEDBACK_KIND_OPTIONS.some((option) => option.value === value);
}

export function isFeedbackStatus(value: string): value is FeedbackStatus {
  return FEEDBACK_STATUS_OPTIONS.some((option) => option.value === value);
}

export function getFeedbackKindLabel(kind: FeedbackKind) {
  return FEEDBACK_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind;
}

export function getFeedbackStatusLabel(status: FeedbackStatus) {
  return FEEDBACK_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}
