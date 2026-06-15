"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { submitEventProposal } from "@/app/proposer-un-evenement/actions";

const fieldClassName =
  "w-full rounded-[18px] border border-foreground/10 bg-white/86 px-4 py-3 text-[14px] text-foreground placeholder:text-foreground/35 focus:border-coral/40 focus:outline-none";
const labelClassName =
  "text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/48";

export function EventProposalForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSubmitted(false);

    startTransition(async () => {
      const result = await submitEventProposal(formData);

      if (result.ok) {
        formRef.current?.reset();
        setSubmitted(true);
        return;
      }

      setError(result.message);
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-6">
      <input
        type="text"
        name="company_url"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {submitted ? (
        <div className="rounded-[22px] border border-green-200 bg-green-50 px-4 py-4 text-[14px] leading-6 text-green-800">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Proposition envoyée
          </div>
          <p className="mt-1">
            Merci. L&apos;événement sera relu par l&apos;équipe avant d&apos;apparaître sur Upcomi.
          </p>
        </div>
      ) : null}

      <section className="space-y-4">
        <SectionHeading title="Événement" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nom de l'événement" name="nomEvent" required maxLength={180} />
          <Field label="Type d'événement" name="type_event" required maxLength={80} placeholder="Course, Brevet, Aventure..." />
          <Field label="Type de vélo" name="bike_type" required maxLength={120} placeholder="Route, Gravel, VTT..." />
          <Field label="Distance" name="distance" required maxLength={120} placeholder="120 km, 80-160 km..." />
          <Field label="Date de début" name="dateEvent" type="date" required />
          <Field label="Date de fin" name="dateFin" type="date" required />
          <Field label="Région" name="region" required maxLength={120} />
          <Field label="Budget" name="budget" required maxLength={80} placeholder="Gratuit, €, €€, €€€..." />
          <Field label="Site de l'événement" name="URL" type="url" required maxLength={500} placeholder="https://..." />
          <Field label="Image" name="image" type="url" required maxLength={500} placeholder="https://..." />
        </div>

        <label className="block space-y-2">
          <span className={labelClassName}>Description</span>
          <textarea
            name="description"
            required
            maxLength={4000}
            rows={8}
            placeholder="Présente le format, l'ambiance, les parcours et les informations utiles."
            className={`${fieldClassName} min-h-[180px] resize-y`}
          />
        </label>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Adresse de départ" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Adresse" name="departure_address" required maxLength={240} placeholder="Rue, lieu-dit, site de départ..." />
          <Field label="Code postal" name="departure_postal_code" required maxLength={32} />
          <Field label="Ville" name="villeDepart" required maxLength={120} />
          <Field label="Pays" name="paysDepart" required maxLength={120} defaultValue="France" />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Inscriptions" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Ouverture des inscriptions" name="dateInscription" type="date" required />
          <Field label="Clôture des inscriptions" name="clotureInscription" type="date" required />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <CheckboxField label="Inscriptions ouvertes" name="inscriptions_ouvertes" />
          <CheckboxField label="Dotwatching" name="Dotwatching" />
          <CheckboxField label="Mixité" name="mint" />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Organisateur" />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Organisateur" name="organisateur" required maxLength={180} />
          <Field label="Nom du contact" name="contact_name" required maxLength={160} />
          <Field label="Email du contact" name="contact_email" type="email" required maxLength={254} />
        </div>
      </section>

      {error ? (
        <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-coral-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Envoyer la proposition
        </button>
      </div>
    </form>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="border-b border-foreground/8 pb-2">
      <h2 className="font-serif text-[24px] text-foreground">{title}</h2>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  maxLength,
  placeholder,
  step,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: "text" | "date" | "url" | "number" | "email";
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  step?: string;
  defaultValue?: string;
}) {
  return (
    <label className="space-y-2">
      <span className={labelClassName}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        step={step}
        defaultValue={defaultValue}
        className={fieldClassName}
      />
    </label>
  );
}

function CheckboxField({ label, name }: { label: string; name: string }) {
  return (
    <label className="flex items-center gap-2 rounded-[18px] border border-foreground/10 bg-white/72 px-4 py-3 text-[13px] font-medium text-foreground/68">
      <input name={name} type="checkbox" className="h-4 w-4" />
      <span>{label}</span>
    </label>
  );
}
