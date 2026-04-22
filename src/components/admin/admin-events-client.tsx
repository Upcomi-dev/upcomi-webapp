"use client";

import { useMemo, useState, useTransition } from "react";
import { createEvent, deleteEvent, updateEvent } from "@/app/admin/actions";

interface AdminEventRecord {
  id: number;
  nomEvent: string | null;
  dateEvent: string | null;
  dateEvent2: string | null;
  dateEventLongue: string | null;
  dateFin: string | null;
  villeDepart: string | null;
  paysDepart: string | null;
  dateInscription: string | null;
  inscriptions_ouvertes: boolean | null;
  clotureInscription: string | null;
  nb_sousEvents: number | null;
  URL: string | null;
  description: string | null;
  organisateur: string | null;
  image: string | null;
  bike_type: string | null;
  distance: string | null;
  catégorie: string | null;
  distance_range: string | null;
  distance_range_filter: string | null;
  sous_event1: string | null;
  sous_event2: string | null;
  url_tracking: string | null;
  tag: boolean | null;
  nature_tag: string | null;
  Dotwatching: boolean | null;
  type_event: string | null;
  region: string | null;
  budget: string | null;
  verifie: boolean;
  AlaUne: number | null;
  notified: boolean;
  mint: boolean;
  latitude: number | null;
  longitude: number | null;
}

interface AdminEventsClientProps {
  events: AdminEventRecord[];
  organisateurs: string[];
}

const inputClassName =
  "w-full rounded-xl border border-foreground/10 bg-white/85 px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/35 focus:border-coral/40 focus:outline-none";
const textAreaClassName =
  "min-h-[120px] w-full rounded-xl border border-foreground/10 bg-white/85 px-4 py-3 text-[14px] text-foreground placeholder:text-foreground/35 focus:border-coral/40 focus:outline-none";
const checkboxClassName =
  "flex items-center gap-2 rounded-xl border border-foreground/10 bg-white/72 px-3 py-2 text-[13px] text-foreground/72";

export function AdminEventsClient({ events, organisateurs }: AdminEventsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return events.slice(0, 40);
    }

    return events
      .filter((event) =>
        [
          event.nomEvent,
          event.villeDepart,
          event.paysDepart,
          event.type_event,
          event.organisateur,
          event.region,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))
      )
      .slice(0, 40);
  }, [events, searchQuery]);

  const handleCreate = (formData: FormData) => {
    startTransition(async () => {
      await createEvent(formData);
      setShowCreateForm(false);
    });
  };

  const handleUpdate = (id: number, formData: FormData) => {
    startTransition(async () => {
      await updateEvent(id, formData);
      setEditingId(null);
    });
  };

  const handleDelete = (id: number, label: string) => {
    if (!confirm(`Supprimer l'événement "${label}" ?`)) return;
    startTransition(() => deleteEvent(id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-serif text-[28px] text-foreground">Événements</h2>
          <p className="mt-1 text-[14px] text-foreground/56">
            Création, modification et suppression des fiches événements.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Chercher un événement..."
            className={`${inputClassName} min-w-[260px]`}
          />
          <button
            type="button"
            onClick={() => setShowCreateForm((current) => !current)}
            className="rounded-full bg-coral px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-coral-dark"
          >
            + Nouvel événement
          </button>
        </div>
      </div>

      {isPending && (
        <div className="text-[12px] text-foreground/50">Mise à jour des événements...</div>
      )}

      {showCreateForm && (
        <div className="rounded-[24px] border border-coral/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,239,228,0.9))] p-5 shadow-[var(--shadow-sm)]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/40">
                Création
              </p>
              <h3 className="mt-1 font-serif text-[24px] text-foreground">
                Nouvel événement
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-full border border-foreground/12 px-4 py-2 text-[12px] text-foreground/60"
            >
              Fermer
            </button>
          </div>
          <EventForm
            action={handleCreate}
            submitLabel="Créer l'événement"
            organisateurs={organisateurs}
          />
        </div>
      )}

      <div className="grid gap-4">
        {filteredEvents.map((event) => {
          const label = event.nomEvent || `Événement #${event.id}`;
          const isEditing = editingId === event.id;

          return (
            <div
              key={event.id}
              className="overflow-hidden rounded-[24px] border border-white/60 bg-white/72 shadow-[var(--shadow-sm)]"
            >
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-[24px] text-foreground">{label}</h3>
                    <span className="rounded-full bg-foreground/6 px-2.5 py-1 text-[11px] font-semibold text-foreground/52">
                      #{event.id}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        event.verifie
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {event.verifie ? "Vérifié" : "À vérifier"}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] text-foreground/58">
                    {[event.dateEvent, event.villeDepart, event.paysDepart].filter(Boolean).join(" · ") ||
                      "Aucune information principale"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-foreground/45">
                    {event.type_event && <span>Type: {event.type_event}</span>}
                    {event.organisateur && <span>Organisateur: {event.organisateur}</span>}
                    {event.AlaUne !== null && <span>À la une: {event.AlaUne}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId((current) => (current === event.id ? null : event.id))}
                    className="rounded-full border border-foreground/12 px-4 py-2 text-[12px] font-semibold text-foreground/60 transition-colors hover:bg-foreground/5"
                  >
                    {isEditing ? "Fermer" : "Éditer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(event.id, label)}
                    className="rounded-full border border-red-200 px-4 py-2 text-[12px] font-semibold text-red-500 transition-colors hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="border-t border-foreground/8 p-5">
                  <EventForm
                    event={event}
                    action={(formData) => handleUpdate(event.id, formData)}
                    submitLabel="Enregistrer les modifications"
                    organisateurs={organisateurs}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-foreground/12 bg-white/36 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-foreground">Aucun événement trouvé</p>
          <p className="mt-1 text-xs text-foreground/45">
            Ajustez votre recherche ou créez un nouvel événement.
          </p>
        </div>
      )}
    </div>
  );
}

function EventForm({
  event,
  action,
  submitLabel,
  organisateurs,
}: {
  event?: AdminEventRecord;
  action: (formData: FormData) => void;
  submitLabel: string;
  organisateurs: string[];
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Nom" name="nomEvent" defaultValue={event?.nomEvent} required />
        <Field label="Date" name="dateEvent" type="date" defaultValue={event?.dateEvent} />
        <Field label="Date de fin" name="dateFin" type="date" defaultValue={event?.dateFin} />
        <Field label="Ville" name="villeDepart" defaultValue={event?.villeDepart} />
        <Field label="Pays" name="paysDepart" defaultValue={event?.paysDepart} />
        <Field label="Type" name="type_event" defaultValue={event?.type_event} />
        <Field
          label="Organisateur"
          name="organisateur"
          defaultValue={event?.organisateur}
          listId="admin-organisateurs"
        />
        <Field label="URL" name="URL" type="url" defaultValue={event?.URL} />
        <Field label="Image" name="image" type="url" defaultValue={event?.image} />
        <Field label="Bike type" name="bike_type" defaultValue={event?.bike_type} />
        <Field label="Distance" name="distance" defaultValue={event?.distance} />
        <Field label="Catégorie" name="categorie" defaultValue={event?.catégorie} />
        <Field label="Distance range" name="distance_range" defaultValue={event?.distance_range} />
        <Field
          label="Distance range filter"
          name="distance_range_filter"
          defaultValue={event?.distance_range_filter}
        />
        <Field label="Région" name="region" defaultValue={event?.region} />
        <Field label="Budget" name="budget" defaultValue={event?.budget} />
        <Field label="Date inscription" name="dateInscription" type="date" defaultValue={event?.dateInscription} />
        <Field
          label="Clôture inscription"
          name="clotureInscription"
          type="date"
          defaultValue={event?.clotureInscription}
        />
        <Field label="Date courte 2" name="dateEvent2" defaultValue={event?.dateEvent2} />
        <Field label="Date longue" name="dateEventLongue" defaultValue={event?.dateEventLongue} />
        <Field label="Nb sous-events" name="nb_sousEvents" type="number" defaultValue={toInputValue(event?.nb_sousEvents)} />
        <Field label="Sous-event 1" name="sous_event1" defaultValue={event?.sous_event1} />
        <Field label="Sous-event 2" name="sous_event2" defaultValue={event?.sous_event2} />
        <Field label="URL tracking" name="url_tracking" type="url" defaultValue={event?.url_tracking} />
        <Field label="Nature tag" name="nature_tag" defaultValue={event?.nature_tag} />
        <Field label="À la une" name="AlaUne" type="number" defaultValue={toInputValue(event?.AlaUne)} />
        <Field label="Latitude" name="latitude" type="number" step="any" defaultValue={toInputValue(event?.latitude)} />
        <Field label="Longitude" name="longitude" type="number" step="any" defaultValue={toInputValue(event?.longitude)} />
      </div>

      <label className="block space-y-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
          Description
        </span>
        <textarea
          name="description"
          defaultValue={event?.description ?? ""}
          className={textAreaClassName}
          placeholder="Description de l'événement"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <CheckboxField label="Inscriptions ouvertes" name="inscriptions_ouvertes" defaultChecked={Boolean(event?.inscriptions_ouvertes)} />
        <CheckboxField label="Tag actif" name="tag" defaultChecked={Boolean(event?.tag)} />
        <CheckboxField label="Dotwatching" name="Dotwatching" defaultChecked={Boolean(event?.Dotwatching)} />
        <CheckboxField label="Vérifié" name="verifie" defaultChecked={Boolean(event?.verifie)} />
        <CheckboxField label="Notified" name="notified" defaultChecked={Boolean(event?.notified)} />
        <CheckboxField label="Mint" name="mint" defaultChecked={Boolean(event?.mint)} />
      </div>

      <datalist id="admin-organisateurs">
        {organisateurs.map((organisateur) => (
          <option key={organisateur} value={organisateur} />
        ))}
      </datalist>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-full bg-coral px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-coral-dark"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required = false,
  type = "text",
  step,
  listId,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: "text" | "date" | "url" | "number";
  step?: string;
  listId?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
        {label}
      </span>
      <input
        name={name}
        type={type}
        step={step}
        list={listId}
        defaultValue={defaultValue ?? ""}
        required={required}
        className={inputClassName}
      />
    </label>
  );
}

function CheckboxField({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className={checkboxClassName}>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4" />
      <span>{label}</span>
    </label>
  );
}

function toInputValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}
