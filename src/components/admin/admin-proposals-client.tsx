"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, Plus, RotateCcw, Save, Trash2, XCircle } from "lucide-react";
import {
  approveEventProposal,
  rejectEventProposal,
  reopenEventProposal,
  saveEventProposal,
  type ProposalActionResult,
} from "@/app/admin/proposal-actions";
import type { Event, EventSubmissionContact, SousEvent } from "@/lib/types/database";

export type ReviewStatus = "pending" | "approved" | "rejected";
export type AdminProposal = {
  event: Event;
  contact: EventSubmissionContact;
  routes: SousEvent[];
  imagePreviewUrl: string | null;
};

const EVENT_TYPES = ["Social Ride", "Aventure", "Brevet", "Course", "Ultra", "Événement"];
const BIKE_TYPES = ["Route", "Gravel", "VTT"];
const inputClass = "h-12 w-full rounded-[16px] border border-foreground/10 bg-white px-4 text-[14px] outline-none focus:border-coral/45";
const labelClass = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/45";

export function AdminProposalsClient({ proposals, organizers }: { proposals: AdminProposal[]; organizers: string[] }) {
  const [status, setStatus] = useState<ReviewStatus | "all">("pending");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return proposals.filter(({ event, contact }) => {
      if (status !== "all" && contact.review_status !== status) return false;
      if (!needle) return true;
      return [event.nomEvent, event.organisateur, event.villeDepart, contact.contact_email]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("fr").includes(needle));
    });
  }, [proposals, query, status]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["pending", "rejected", "approved", "all"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-full px-4 py-2 text-[12px] font-semibold ${status === value ? "bg-coral text-white" : "border border-foreground/10 bg-white/65 text-foreground/60"}`}>
              {{ pending: "En attente", rejected: "Refusées", approved: "Validées", all: "Toutes" }[value]}
              {value !== "all" ? ` (${proposals.filter(({ contact }) => contact.review_status === value).length})` : ""}
            </button>
          ))}
        </div>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Événement, organisateur, ville…" className={`${inputClass} lg:max-w-sm`} />
      </div>

      {filtered.map((proposal) => <ProposalEditor key={proposal.event.id} proposal={proposal} organizers={organizers} />)}
      {filtered.length === 0 ? <div className="rounded-[24px] border border-dashed border-foreground/15 bg-white/40 p-10 text-center text-[14px] text-foreground/50">Aucune proposition dans cette vue.</div> : null}
    </div>
  );
}

function ProposalEditor({ proposal, organizers }: { proposal: AdminProposal; organizers: string[] }) {
  const { event, contact } = proposal;
  const router = useRouter();
  const nextId = useRef(Math.max(0, ...proposal.routes.map((route) => route.sousEventID)) + 1);
  const [routes, setRoutes] = useState(() => proposal.routes.map((route) => ({ ...route, clientId: route.sousEventID })));
  const [expanded, setExpanded] = useState(contact.review_status === "pending");
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<ProposalActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (form: HTMLFormElement, action: "save" | "approve" | "reject" | "reopen") => {
    const data = new FormData(form);
    const handler = { save: saveEventProposal, approve: approveEventProposal, reject: rejectEventProposal, reopen: reopenEventProposal }[action];
    setResult(null);
    startTransition(async () => {
      const next = await handler(event.id, data);
      setResult(next);
      if (next.ok) {
        const imageInput = form.elements.namedItem("image");
        if (imageInput instanceof HTMLInputElement) imageInput.value = "";
        setDirty(false);
        router.refresh();
      }
    });
  };

  const statusStyle = contact.review_status === "approved" ? "bg-green-100 text-green-700" : contact.review_status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
  return (
    <article className="overflow-hidden rounded-[26px] border border-white/70 bg-white/72 shadow-[var(--shadow-sm)]">
      <button type="button" onClick={() => setExpanded((value) => !value)} className="flex w-full flex-col gap-3 p-5 text-left md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-[24px] text-foreground">{event.nomEvent || `Événement #${event.id}`}</h3>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle}`}>{{ pending: "En attente", approved: "Validé", rejected: "Refusé" }[contact.review_status]}</span>
          </div>
          <p className="mt-1 text-[13px] text-foreground/50">{event.dateEvent} · {event.villeDepart} · {event.organisateur}</p>
          <p className="mt-1 text-[11px] text-foreground/38">Proposé le {new Date(contact.submitted_at).toLocaleString("fr-FR")}</p>
        </div>
        <span className="text-[12px] font-semibold text-coral">{expanded ? "Fermer" : "Examiner"}</span>
      </button>

      {expanded ? (
        <form
          className="space-y-6 border-t border-foreground/8 p-5"
          onChange={(changeEvent) => {
            const target = changeEvent.target as unknown as HTMLInputElement;
            if (target.name !== "review_reason") setDirty(true);
          }}
          onSubmit={(submitEvent) => submitEvent.preventDefault()}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nom de l’événement" name="nomEvent" defaultValue={event.nomEvent} required span />
            <Field label="Date de début" name="dateEvent" type="date" defaultValue={event.dateEvent} required />
            <Field label="Date de fin" name="dateFin" type="date" defaultValue={event.dateFin} />
            <Field label="Ville de départ" name="villeDepart" defaultValue={event.villeDepart} required />
            <Field label="Pays" name="paysDepart" defaultValue={event.paysDepart} />
            <Field label="Organisateur" name="organisateur" defaultValue={event.organisateur} required list="review-organizers" />
            <Field label="Site ou page Instagram" name="URL" type="url" defaultValue={event.URL} />
          </div>
          <datalist id="review-organizers">{organizers.map((name) => <option key={name} value={name} />)}</datalist>

          <label><span className={labelClass}>Description *</span><textarea name="description" required defaultValue={event.description ?? ""} rows={7} className="w-full rounded-[18px] border border-foreground/10 bg-white p-4 text-[14px] outline-none focus:border-coral/45" /></label>

          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div>{proposal.imagePreviewUrl ? <Image src={proposal.imagePreviewUrl} alt="Image proposée" width={440} height={280} unoptimized className="aspect-[4/3] w-full rounded-[18px] object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center rounded-[18px] bg-foreground/5 text-[12px] text-foreground/40">Aucune image</div>}</div>
            <label><span className={labelClass}>Remplacer l’image</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={`${inputClass} py-2 file:mr-3 file:rounded-full file:border-0 file:bg-coral/10 file:px-3 file:py-1 file:text-coral`} /><span className="mt-2 block text-[11px] text-foreground/40">JPEG, PNG ou WebP · 6 Mo maximum</span></label>
          </div>

          <label className="flex items-center gap-2 rounded-[16px] border border-foreground/10 bg-white/70 px-4 py-3 text-[13px]"><input type="checkbox" name="mint" defaultChecked={event.mint} /> Mixité choisie</label>

          <div className="space-y-3 rounded-[22px] border border-foreground/10 bg-foreground/[0.025] p-4">
            <div><h4 className="font-serif text-[21px]">Parcours</h4><p className="text-[12px] text-foreground/45">Les résumés de l’événement seront recalculés automatiquement.</p></div>
            {routes.map((route, index) => (
              <div key={route.clientId} className="space-y-3 rounded-[18px] border border-foreground/10 bg-white/80 p-4">
                <input type="hidden" name="route_id" value={route.clientId} />
                <div className="flex items-center justify-between"><strong className="text-[14px]">Parcours {index + 1}</strong><button type="button" disabled={routes.length === 1} onClick={() => { setRoutes((current) => current.filter((item) => item.clientId !== route.clientId)); setDirty(true); }} className="rounded-full p-2 text-red-500 disabled:opacity-25"><Trash2 className="h-4 w-4" /></button></div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Nom" name="route_name" defaultValue={route.nom} />
                  <SelectField label="Type d’événement" name="route_type_event" defaultValue={route.typeEvent} options={route.typeEvent && !EVENT_TYPES.includes(route.typeEvent) ? [...EVENT_TYPES, route.typeEvent] : EVENT_TYPES} />
                  <SelectField label="Type de vélo" name="route_bike_type" defaultValue={route.bikeType} options={BIKE_TYPES} />
                  <Field label="Distance (km)" name="route_distance" type="number" defaultValue={route.distance} required min="1" />
                  <Field label="Dénivelé (m)" name="route_elevation" type="number" defaultValue={route.elevation} min="0" />
                  <Field label="Prix (€)" name="route_price" type="number" defaultValue={route.prix ?? 0} required min="0" />
                  <Field label="Délai" name="route_delay" defaultValue={route.delai} />
                  <label className="flex h-12 items-center gap-2 self-end rounded-[16px] border border-foreground/10 bg-white px-4 text-[13px]"><input name="route_trace_fixe" value={route.clientId} type="checkbox" defaultChecked={Boolean(route.trace_fixe)} /> Trace fixe</label>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => { setRoutes((current) => [...current, { clientId: nextId.current++, sousEventID: 0, event_id: event.id, event_name: event.nomEvent, nom: "", bikeType: "Route", distance: 1, prix: 0, elevation: null, delai: null, typeEvent: "Course", trace_fixe: false }]); setDirty(true); }} className="inline-flex items-center gap-2 rounded-full border border-coral/20 bg-white px-4 py-2 text-[12px] font-semibold text-coral"><Plus className="h-4 w-4" /> Ajouter un parcours</button>
          </div>

          <div className="rounded-[18px] border border-coral/12 bg-coral/5 p-4 text-[13px]"><strong>Contact privé</strong><p className="mt-1">{contact.contact_name || "Nom non renseigné"} · <a href={`mailto:${contact.contact_email}`} className="text-coral">{contact.contact_email}</a></p></div>

          {contact.review_status === "rejected" && contact.review_reason ? <p className="rounded-[16px] bg-red-50 p-3 text-[12px] text-red-700">Motif actuel : {contact.review_reason}</p> : null}
          <label><span className={labelClass}>Motif de refus</span><textarea name="review_reason" rows={3} placeholder="Obligatoire pour refuser" className="w-full rounded-[16px] border border-foreground/10 bg-white p-3 text-[13px] outline-none focus:border-coral/45" /></label>

          {dirty ? <p className="text-[12px] font-medium text-amber-700">Des modifications doivent être enregistrées avant la décision.</p> : null}
          {result ? <p className={`text-[12px] font-medium ${result.ok ? "text-green-700" : "text-red-700"}`}>{result.message}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <ActionButton pending={pending} onClick={(buttonEvent) => submit(buttonEvent.currentTarget.form!, "save")} icon={<Save className="h-4 w-4" />}>Enregistrer</ActionButton>
            {contact.review_status === "rejected" ? <ActionButton pending={pending || dirty} onClick={(buttonEvent) => submit(buttonEvent.currentTarget.form!, "reopen")} icon={<RotateCcw className="h-4 w-4" />}>Remettre en attente</ActionButton> : null}
            <ActionButton pending={pending || dirty} danger onClick={(buttonEvent) => submit(buttonEvent.currentTarget.form!, "reject")} icon={<XCircle className="h-4 w-4" />}>Refuser</ActionButton>
            <ActionButton pending={pending || dirty} success onClick={(buttonEvent) => submit(buttonEvent.currentTarget.form!, "approve")} icon={<CheckCircle2 className="h-4 w-4" />}>Valider et publier</ActionButton>
          </div>
        </form>
      ) : null}
    </article>
  );
}

function Field({ label, name, defaultValue, type = "text", required, span, list, min }: { label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; span?: boolean; list?: string; min?: string }) {
  return <label className={span ? "md:col-span-2" : ""}><span className={labelClass}>{label}{required ? " *" : ""}</span><input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} list={list} min={min} step={type === "number" ? "1" : undefined} className={inputClass} /></label>;
}

function SelectField({ label, name, defaultValue, options }: { label: string; name: string; defaultValue?: string | null; options: string[] }) {
  return <label><span className={labelClass}>{label} *</span><select name={name} required defaultValue={defaultValue ?? ""} className={inputClass}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function ActionButton({ children, icon, onClick, pending, danger, success }: { children: React.ReactNode; icon: React.ReactNode; onClick: React.MouseEventHandler<HTMLButtonElement>; pending: boolean; danger?: boolean; success?: boolean }) {
  const color = danger ? "bg-red-600 text-white" : success ? "bg-green-600 text-white" : "border border-foreground/12 bg-white text-foreground/65";
  return <button type="button" disabled={pending} onClick={onClick} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${color}`}>{icon}{children}</button>;
}
