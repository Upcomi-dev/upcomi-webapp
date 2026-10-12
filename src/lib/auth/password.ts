export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRequirement {
  id: "length" | "lowercase" | "uppercase" | "digit" | "symbol";
  /** Télégraphique : la liste est un rappel discret, pas une consigne. */
  label: string;
  met: boolean;
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: "length",
      label: `${PASSWORD_MIN_LENGTH} caractères`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    { id: "lowercase", label: "1 minuscule", met: /[a-z]/.test(password) },
    { id: "uppercase", label: "1 majuscule", met: /[A-Z]/.test(password) },
    { id: "digit", label: "1 chiffre", met: /[0-9]/.test(password) },
    {
      id: "symbol",
      label: "1 caractère spécial",
      // Même jeu de symboles que Supabase Auth ; un espace ne compte pas.
      met: /[!@#$%^&*()_+\-=\[\]{};'\\:"|<>?,./`~]/.test(password),
    },
  ];
}

export function isPasswordValid(password: string) {
  return getPasswordRequirements(password).every((requirement) => requirement.met);
}

export function getPasswordRequirementsMessage() {
  return `Ton mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères, dont 1 minuscule, 1 majuscule, 1 chiffre et 1 caractère spécial (ex. : !, @, #).`;
}

export function translatePasswordError(message: string, code?: string) {
  const lowerMessage = message.toLowerCase();

  if (code === "same_password" || lowerMessage.includes("different from the old password")) {
    return "Choisis un mot de passe différent de ton mot de passe actuel.";
  }

  if (lowerMessage.includes("leaked") || lowerMessage.includes("pwned")) {
    return "Ce mot de passe a été exposé dans une fuite de données. Choisis-en un autre.";
  }

  if (
    code === "weak_password" ||
    lowerMessage.includes("password should contain") ||
    lowerMessage.includes("password must contain") ||
    lowerMessage.includes("password should be at least") ||
    lowerMessage.includes("password must be at least") ||
    lowerMessage.includes("password too short")
  ) {
    return getPasswordRequirementsMessage();
  }

  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || lowerMessage.includes("rate limit")) {
    return "Trop de tentatives. Patiente un instant avant de réessayer.";
  }

  return "Impossible de valider ta demande pour le moment. Réessaie dans un instant.";
}
