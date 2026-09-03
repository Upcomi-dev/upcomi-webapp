export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRequirement {
  id: "length";
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
  ];
}

export function isPasswordValid(password: string) {
  return getPasswordRequirements(password).every((requirement) => requirement.met);
}

export function getPasswordRequirementsMessage() {
  return `Ton mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
}

export function translatePasswordError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("password should be at least") ||
    lowerMessage.includes("password must be at least") ||
    lowerMessage.includes("password too short")
  ) {
    return `Ton mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }

  return message;
}
