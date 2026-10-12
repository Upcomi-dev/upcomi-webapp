import type { LabelHTMLAttributes, ReactNode } from "react";

/**
 * Style partagé des champs texte (input/select) des formulaires d'auth et de
 * profil. `soft-ring` (un simple liseré blanc translucide) ne se voit quasi
 * pas sur le fond crème de l'app : les champs paraissaient sans bordure. On
 * lui préfère un contour sombre léger, repris du prototype
 * (`--upcomi-text-muted` à 12 % d'opacité dans upcomi-clone/assets/css/base.css).
 */
export const FIELD_INPUT_CLASS =
  "w-full rounded-[var(--radius-sm)] border border-foreground/14 bg-white/80 px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/35 transition-colors focus:border-orange/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange/25 disabled:opacity-50";

/** Libellé de champ : label court en majuscules au-dessus d'un input. */
export function FieldLabel({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={`mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/55 ${className}`}
    />
  );
}

/** Un champ = son libellé + son contrôle, verticalement empilés. */
export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
    </div>
  );
}

/**
 * Texte secondaire (descriptions, aides, mentions) : un seul format pour
 * tous les formulaires d'auth, repris du `.field-hint` / `p.lead` du
 * prototype plutôt que les tailles (11-13px) et opacités (30-52 %) qui
 * variaient d'un composant à l'autre.
 */
export function Muted({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`text-[13px] leading-5 text-foreground/60 ${className}`}>{children}</p>;
}
