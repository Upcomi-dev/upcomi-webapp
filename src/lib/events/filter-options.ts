export const DEFAULT_EVENT_TYPES = [
  "Course",
  "Aventure",
  "Brevet",
  "Social Ride",
  "Evènement",
] as const;

const EVENT_TYPE_ORDER = new Map(
  DEFAULT_EVENT_TYPES.map((value, index) => [value.toLocaleLowerCase("fr-FR"), index])
);

export function buildEventTypeOptions(values: readonly (string | null | undefined)[]): string[] {
  const uniqueValues = Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );

  return uniqueValues.sort((left, right) => {
    const leftOrder = EVENT_TYPE_ORDER.get(left.toLocaleLowerCase("fr-FR"));
    const rightOrder = EVENT_TYPE_ORDER.get(right.toLocaleLowerCase("fr-FR"));

    if (leftOrder != null && rightOrder != null) {
      return leftOrder - rightOrder;
    }

    if (leftOrder != null) return -1;
    if (rightOrder != null) return 1;

    return left.localeCompare(right, "fr-FR", { sensitivity: "base" });
  });
}
