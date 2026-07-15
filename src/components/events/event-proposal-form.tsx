"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Select } from "@base-ui/react/select";
import { Building2, Check, CheckCircle2, ChevronDown, HelpCircle, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { submitEventProposal } from "@/app/proposer-un-evenement/actions";

const EVENT_TYPES = ["Social Ride", "Aventure", "Brevet", "Course", "Ultra", "Événement", "Autre"];
const BIKE_TYPES = ["Route", "Gravel", "VTT"];

const fieldClassName =
  "h-12 w-full rounded-[18px] border border-foreground/10 bg-white/86 px-4 text-[14px] text-foreground placeholder:text-foreground/35 focus:border-coral/40 focus:outline-none";
const labelClassName =
  "block min-h-10 text-[12px] font-semibold uppercase leading-5 tracking-[0.14em] text-foreground/48";

type RouteRow = { id: number; eventType: string; bikeType: string };

const createRoute = (id: number): RouteRow => ({ id, eventType: "", bikeType: "" });

export function EventProposalForm({ organizers }: { organizers: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const nextRouteId = useRef(1);
  const [organizer, setOrganizer] = useState("");
  const [routes, setRoutes] = useState<RouteRow[]>([createRoute(0)]);
  const [formResetKey, setFormResetKey] = useState(0);
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
        setOrganizer("");
        setRoutes([createRoute(nextRouteId.current++)]);
        setFormResetKey((current) => current + 1);
        setSubmitted(true);
        return;
      }

      setError(result.message);
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-6">
      <input type="text" name="company_url" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      {submitted ? (
        <div className="rounded-[22px] border border-green-200 bg-green-50 px-4 py-4 text-[14px] leading-6 text-green-800">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Proposition envoyée
          </div>
          <p className="mt-1">Merci. L&apos;événement sera publié après validation par l&apos;équipe Upcomi.</p>
        </div>
      ) : null}

      <section className="space-y-4">
        <SectionHeading title="Événement" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Nom de l'événement" name="nomEvent" required maxLength={180} />
          </div>
          <Field label="Date de début" name="dateEvent" type="date" required />
          <Field label="Date de fin" name="dateFin" type="date" optional />
          <Field label="Ville de départ" name="villeDepart" required maxLength={120} placeholder="Ex. Paris" />
          <Field label="Pays" name="paysDepart" optional maxLength={120} placeholder="Ex. France" />
        </div>

        <div className="space-y-3 rounded-[22px] border border-foreground/8 bg-white/45 p-4">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">Parcours</h3>
            <p className="mt-1 text-[12px] text-foreground/48">Ajoutez une version complète pour chaque parcours proposé.</p>
          </div>

          {routes.map((route, index) => (
            <div key={route.id} className="space-y-4 rounded-[20px] border border-foreground/8 bg-white/75 p-4">
              <input type="hidden" name="route_id" value={route.id} />
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-serif text-[19px] text-foreground">Parcours {index + 1}</h4>
                <button
                  type="button"
                  aria-label={`Supprimer le parcours ${index + 1}`}
                  disabled={routes.length === 1}
                  onClick={() => setRoutes((current) => current.filter((item) => item.id !== route.id))}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 text-foreground/45 hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Nom du parcours" name="route_name" optional maxLength={180} placeholder={`${index + 1}00 km`} />
                <SelectField
                  label="Type d'événement"
                  name="route_type_event"
                  options={EVENT_TYPES}
                  value={route.eventType}
                  required
                  onChange={(value) => setRoutes((current) => current.map((item) => item.id === route.id ? { ...item, eventType: value } : item))}
                />
                {route.eventType === "Autre" ? (
                  <Field label="Précisez le type" name={`route_type_other_${route.id}`} required maxLength={80} />
                ) : null}
                <SelectField
                  label="Type de vélo"
                  name="route_bike_type"
                  options={BIKE_TYPES}
                  value={route.bikeType}
                  required
                  onChange={(value) => setRoutes((current) => current.map((item) => item.id === route.id ? { ...item, bikeType: value } : item))}
                />
                <Field label="Distance (km)" name="route_distance" type="number" required min="1" step="1" />
                <Field label="Dénivelé (m)" name="route_elevation" type="number" optional min="0" step="1" />
                <Field label="Prix (€)" name="route_price" type="number" required min="0" step="1" />
                <Field label="Délai" name="route_delay" optional maxLength={120} placeholder="Ex. 24 h" />
                <CheckboxField label="Trace fixe" name="route_trace_fixe" value={String(route.id)} optional />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setRoutes((current) => [...current, createRoute(nextRouteId.current++)])}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-coral/20 bg-white px-3.5 text-[12px] font-semibold text-coral hover:bg-coral/5"
          >
            <Plus className="h-4 w-4" /> Ajouter un parcours
          </button>
        </div>

        <label className="block space-y-2">
          <FieldLabel label="Description" required />
          <textarea
            name="description"
            required
            maxLength={4000}
            rows={8}
            placeholder="Présente le format, l'ambiance, les parcours et les informations utiles."
            className={`${fieldClassName} min-h-[180px] resize-y`}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Site ou page Insta pour plus d'informations" name="URL" type="url" optional maxLength={500} placeholder="https://..." />
          <FileField key={formResetKey} />
        </div>

        <CheckboxField
          label="Mixité choisie"
          name="mint"
          optional
          help="Événement non mixte, réservé aux femmes et minorités de genre."
        />
      </section>

      <section className="space-y-4">
        <SectionHeading title="Organisateur" />
        <div className="grid gap-4 md:grid-cols-3">
          <OrganizerAutocomplete organizers={organizers} value={organizer} onChange={setOrganizer} />
          <Field label="Nom du contact" name="contact_name" optional maxLength={160} />
          <Field label="Email du contact" name="contact_email" type="email" required maxLength={254} />
        </div>
      </section>

      {error ? <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div> : null}

      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-coral-dark disabled:cursor-not-allowed disabled:opacity-70">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Envoyer la proposition
        </button>
      </div>
    </form>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <div className="border-b border-foreground/8 pb-2"><h2 className="font-serif text-[24px] text-foreground">{title}</h2></div>;
}

function Field({ label, name, type = "text", required = false, optional = false, maxLength, placeholder, step, min }: {
  label: string;
  name: string;
  type?: "text" | "date" | "url" | "number" | "email";
  required?: boolean;
  optional?: boolean;
  maxLength?: number;
  placeholder?: string;
  step?: string;
  min?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <FieldLabel label={label} required={required} optional={optional} />
      <input name={name} type={type} required={required} maxLength={maxLength} placeholder={placeholder} step={step} min={min} className={fieldClassName} />
    </label>
  );
}

function OrganizerAutocomplete({ organizers, value, onChange }: {
  organizers: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const trimmedValue = value.trim();
  const existingOrganizer = organizers.find(
    (organizerName) => organizerName.localeCompare(trimmedValue, "fr", { sensitivity: "base" }) === 0,
  );

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="block"><FieldLabel label="Organisateur" required /></span>
      <Autocomplete.Root
        items={organizers}
        value={value}
        onValueChange={(nextValue, eventDetails) => {
          onChange(nextValue);
          setOpen(eventDetails.reason === "input-change" && nextValue.trim().length > 0);
        }}
        open={open}
        onOpenChange={setOpen}
        openOnInputClick={false}
        autoHighlight
      >
        <Autocomplete.InputGroup className="group flex h-12 w-full items-center gap-3 rounded-[18px] border border-foreground/10 bg-white/86 px-4 text-[14px] text-foreground transition-all hover:border-coral/20 hover:bg-white focus-within:border-coral/45 focus-within:ring-3 focus-within:ring-coral/12 data-[popup-open]:border-coral/35 data-[popup-open]:bg-white data-[popup-open]:ring-3 data-[popup-open]:ring-coral/10">
          <Building2 className="h-4 w-4 shrink-0 text-coral" />
          <Autocomplete.Input
            aria-labelledby={labelId}
            name="organisateur"
            required
            maxLength={180}
            placeholder="Rechercher ou saisir un nom"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-foreground/35"
          />
        </Autocomplete.InputGroup>

        <Autocomplete.Portal>
          <Autocomplete.Positioner sideOffset={8} align="start" className="z-50">
            <Autocomplete.Popup className="min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-[20px] border border-coral/15 bg-[#fffaf4] p-1.5 text-foreground shadow-[0_20px_55px_rgba(80,48,32,0.22)] transition-[transform,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
              <Autocomplete.Empty className="px-3.5 py-3 text-[13px] text-foreground/48">
                Aucun organisateur connu — vous pouvez conserver ce nouveau nom.
              </Autocomplete.Empty>
              <Autocomplete.List className="max-h-64 overflow-y-auto py-1">
                {(organizerName: string, index: number) => (
                  <Autocomplete.Item
                    key={organizerName}
                    value={organizerName}
                    index={index}
                    className="flex cursor-default items-center gap-2.5 rounded-[14px] px-3.5 py-2.5 text-[14px] outline-none transition-colors data-[highlighted]:bg-coral/9 data-[highlighted]:text-coral-dark"
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-coral/65" />
                    <span className="truncate">{organizerName}</span>
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
      {trimmedValue ? (
        existingOrganizer ? (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Organisateur existant sélectionné
          </p>
        ) : (
          <p className="text-[11px] leading-5 text-foreground/50">
            <span className="font-semibold text-coral">Nouveau :</span> « {trimmedValue} » sera créé comme organisateur lors de l’envoi.
          </p>
        )
      ) : (
        <p className="text-[11px] leading-5 text-foreground/42">
          Commencez à saisir un nom pour rechercher un organisateur. S’il n’existe pas, il sera créé automatiquement.
        </p>
      )}
    </div>
  );
}

function SelectField({ label, name, options, value, required, onChange }: {
  label: string;
  name: string;
  options: string[];
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  const items = options.map((option) => ({ label: option, value: option }));

  return (
    <div className="space-y-2">
      <span id={labelId} className="block"><FieldLabel label={label} required={required} /></span>
      <Select.Root
        name={name}
        items={items}
        required={required}
        value={value || null}
        onValueChange={(nextValue) => onChange(nextValue ?? "")}
      >
        <Select.Trigger
          aria-labelledby={labelId}
          className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-[18px] border border-white/80 bg-white/84 px-4 py-3 text-left text-[14px] text-foreground shadow-[var(--shadow-sm)] outline-none transition-all hover:border-coral/20 hover:bg-white focus-visible:border-coral/45 focus-visible:ring-3 focus-visible:ring-coral/12 data-[popup-open]:border-coral/35 data-[popup-open]:bg-white data-[popup-open]:ring-3 data-[popup-open]:ring-coral/10"
        >
          <Select.Value placeholder="Sélectionner" className="data-[placeholder]:text-foreground/35" />
          <Select.Icon className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral/8 text-coral transition-transform duration-200 group-data-[popup-open]:rotate-180 group-data-[popup-open]:bg-coral/12">
            <ChevronDown className="h-4 w-4" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Positioner sideOffset={8} alignItemWithTrigger={false} className="z-50">
            <Select.Popup className="min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-[20px] border border-coral/15 bg-[#fffaf4] p-1.5 text-foreground shadow-[0_20px_55px_rgba(80,48,32,0.22)] transition-[transform,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
              <Select.List className="max-h-72 overflow-y-auto py-1">
                {options.map((option) => (
                  <Select.Item
                    key={option}
                    value={option}
                    className="group/item grid cursor-default grid-cols-[1fr_auto] items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[14px] outline-none transition-colors data-[highlighted]:bg-coral/9 data-[highlighted]:text-coral-dark data-[selected]:font-semibold data-[selected]:text-coral"
                  >
                    <Select.ItemText>{option}</Select.ItemText>
                    <Select.ItemIndicator className="flex h-6 w-6 items-center justify-center rounded-full bg-coral text-white shadow-sm">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

function FileField() {
  const [fileName, setFileName] = useState("Aucun fichier choisi");

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel label="Image" optional />
      <label className={`${fieldClassName} flex cursor-pointer items-center gap-3 p-1`}>
        <span className="inline-flex h-10 shrink-0 items-center rounded-full bg-coral/10 px-4 text-[12px] font-semibold text-coral">
          Choisir un fichier
        </span>
        <span className="min-w-0 truncate px-1 text-[14px] text-foreground">{fileName}</span>
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "Aucun fichier choisi")}
        />
      </label>
      <span className="block text-[11px] text-foreground/42">JPEG, PNG ou WebP · 6 Mo maximum</span>
    </div>
  );
}

function CheckboxField({ label, name, help, optional = false, value }: { label: string; name: string; help?: string; optional?: boolean; value?: string }) {
  return (
    <label className="flex items-center gap-2 rounded-[18px] border border-foreground/10 bg-white/72 px-4 py-3 text-[13px] font-medium text-foreground/68">
      <input name={name} value={value} type="checkbox" className="h-4 w-4" />
      <span>{label}{optional ? <span className="ml-1.5 text-[11px] font-normal text-foreground/40">Facultatif</span> : null}</span>
      {help ? (
        <span className="group relative ml-1 inline-flex" tabIndex={0} aria-label={help}>
          <HelpCircle className="h-4 w-4 text-foreground/40" />
          <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-xl bg-foreground px-3 py-2 text-[12px] font-normal leading-5 text-white shadow-lg group-hover:block group-focus:block">{help}</span>
        </span>
      ) : null}
    </label>
  );
}

function FieldLabel({ label, required = false, optional = false }: { label: string; required?: boolean; optional?: boolean }) {
  return (
    <span className={labelClassName}>
      {label}
      {required ? <span className="ml-1 text-coral" aria-hidden="true">*</span> : null}
      {optional ? <span className="ml-1.5 normal-case tracking-normal text-foreground/35">Facultatif</span> : null}
    </span>
  );
}
