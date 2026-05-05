export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRequirement {
  id: "length" | "lowercase" | "uppercase" | "digit" | "symbol";
  label: string;
  met: boolean;
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: "length",
      label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "lowercase",
      label: "Au moins une lettre minuscule",
      met: /[a-z]/.test(password),
    },
    {
      id: "uppercase",
      label: "Au moins une lettre majuscule",
      met: /[A-Z]/.test(password),
    },
    {
      id: "digit",
      label: "Au moins un chiffre",
      met: /\d/.test(password),
    },
    {
      id: "symbol",
      label: "Au moins un symbole",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function isPasswordValid(password: string) {
  return getPasswordRequirements(password).every((requirement) => requirement.met);
}

export function getPasswordRequirementsMessage() {
  return "Ton mot de passe doit contenir au moins 8 caractères, une minuscule, une majuscule, un chiffre et un symbole.";
}

export function translatePasswordError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("password should contain at least one character of each") ||
    lowerMessage.includes("weak password") ||
    lowerMessage.includes("password is weak")
  ) {
    return getPasswordRequirementsMessage();
  }

  if (
    lowerMessage.includes("password should be at least") ||
    lowerMessage.includes("password must be at least") ||
    lowerMessage.includes("password too short")
  ) {
    return `Ton mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }

  return message;
}
