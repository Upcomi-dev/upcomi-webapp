import { getPasswordRequirements } from "@/lib/auth/password";

interface PasswordRequirementsProps {
  password: string;
}

/**
 * Rappel discret des règles, sous le champ : un encadré titré prenait plus de
 * place que le formulaire qu'il accompagne.
 */
export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements = getPasswordRequirements(password);

  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[13px] leading-5 text-foreground/55">
      {requirements.map((requirement, index) => (
        <li
          key={requirement.id}
          className={requirement.met ? "font-medium text-green-600" : undefined}
        >
          {index > 0 && (
            <span aria-hidden="true" className="mr-2 text-foreground/25">
              ·
            </span>
          )}
          {requirement.label}
        </li>
      ))}
    </ul>
  );
}
