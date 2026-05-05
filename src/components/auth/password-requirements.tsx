import { getPasswordRequirements } from "@/lib/auth/password";

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements = getPasswordRequirements(password);

  return (
    <div className="mt-2 rounded-[var(--radius-sm)] border border-white/55 bg-white/42 px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/40">
        Mot de passe requis
      </p>
      <ul className="mt-2 space-y-1.5 text-[12px] leading-5">
        {requirements.map((requirement) => (
          <li
            key={requirement.id}
            className={
              requirement.met ? "text-coral" : "text-foreground/48"
            }
          >
            <span aria-hidden="true" className="mr-2 font-semibold">
              {requirement.met ? "✓" : "•"}
            </span>
            {requirement.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
