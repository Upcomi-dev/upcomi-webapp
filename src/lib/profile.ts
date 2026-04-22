import type { User } from "@supabase/supabase-js";

export const PRACTICE_TYPE_OPTIONS = [
  "Route",
  "Gravel",
  "VTT",
  "Bikepacking",
  "Ultra-distance",
  "Velotaf",
  "Loisir",
] as const;

export const PRACTICE_LEVEL_OPTIONS = [
  "Debutant",
  "Intermediaire",
  "Confirme",
  "Competition",
] as const;

type MetadataRecord = Record<string, unknown>;

export interface UserProfileRow {
  email?: string | null;
  name?: string | null;
  surname?: string | null;
  ville?: string | null;
  pref1?: string[] | null;
  pref2?: string | null;
}

export interface UserProfileFormValues {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  practiceTypes: string[];
  practiceLevel: string;
}

function getMetadataString(metadata: MetadataRecord, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getMetadataStringArray(metadata: MetadataRecord, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  }

  return [];
}

export function normalizeUserProfile(values: UserProfileFormValues): UserProfileFormValues {
  const allowedTypes = new Set<string>(PRACTICE_TYPE_OPTIONS);
  const allowedLevels = new Set<string>(PRACTICE_LEVEL_OPTIONS);
  const practiceTypes = values.practiceTypes
    .map((item) => item.trim())
    .filter((item) => allowedTypes.has(item));

  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim().toLowerCase(),
    city: values.city.trim(),
    practiceTypes: Array.from(new Set(practiceTypes)),
    practiceLevel: allowedLevels.has(values.practiceLevel) ? values.practiceLevel : "",
  };
}

export function buildInitialUserProfile(
  user: User,
  profile?: UserProfileRow | null
): UserProfileFormValues {
  const metadata = (user.user_metadata ?? {}) as MetadataRecord;
  const profilePracticeTypes =
    profile?.pref1?.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    ) ?? [];

  return normalizeUserProfile({
    firstName:
      profile?.name?.trim() ||
      getMetadataString(metadata, ["first_name", "firstName", "prenom", "name"]) ||
      "",
    lastName:
      profile?.surname?.trim() ||
      getMetadataString(metadata, ["last_name", "lastName", "surname", "nom"]) ||
      "",
    email: profile?.email?.trim() || user.email?.trim() || "",
    city:
      profile?.ville?.trim() ||
      getMetadataString(metadata, ["city", "ville"]) ||
      "",
    practiceTypes:
      profilePracticeTypes.length > 0
        ? profilePracticeTypes
        : getMetadataStringArray(metadata, ["practice_types"]),
    practiceLevel:
      profile?.pref2?.trim() ||
      getMetadataString(metadata, ["practice_level"]) ||
      "",
  });
}

export function isUserProfileComplete(values: UserProfileFormValues) {
  const normalized = normalizeUserProfile(values);

  return Boolean(
    normalized.firstName &&
      normalized.lastName &&
      normalized.city &&
      normalized.practiceTypes.length > 0 &&
      normalized.practiceLevel
  );
}

export function hasCompletedOnboarding(user: User, profile?: UserProfileRow | null) {
  const metadata = (user.user_metadata ?? {}) as MetadataRecord;
  if (metadata.onboarding_completed === true) {
    return true;
  }

  return isUserProfileComplete(buildInitialUserProfile(user, profile));
}

export function sanitizeRedirectPath(value: string | string[] | undefined, fallback = "/") {
  if (typeof value !== "string") {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
