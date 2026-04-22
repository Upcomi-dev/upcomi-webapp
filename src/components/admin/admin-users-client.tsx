"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createAdminUser,
  deleteAdminUser,
  updateAdminUser,
} from "@/app/admin/actions";

interface AdminUserRecord {
  uid: string;
  email: string | null;
  name: string | null;
  surname: string | null;
  avatar_url: string | null;
  ville: string | null;
  gender: string | null;
  pref1: string[] | null;
  pref2: string | null;
  pref3: string | null;
  premium: boolean;
  subscription_expires_at: string | null;
  product_id: string | null;
  store: string | null;
  cancel_reason: string | null;
  expiration_reason: string | null;
  billing_issue: boolean | null;
  grace_period_expires_at: string | null;
  subscription_paused: boolean | null;
  auto_resume_at: string | null;
  updated_at: string | null;
  revenuecat_id: string | null;
  selection_count: number | null;
  fcm_token: string | null;
  fcm_last_date: string | null;
  created_at: string;
}

interface AdminUsersClientProps {
  users: AdminUserRecord[];
  currentAdminId: string;
}

const inputClassName =
  "w-full rounded-xl border border-foreground/10 bg-white/85 px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/35 focus:border-coral/40 focus:outline-none";
const checkboxClassName =
  "flex items-center gap-2 rounded-xl border border-foreground/10 bg-white/72 px-3 py-2 text-[13px] text-foreground/72";

export function AdminUsersClient({ users, currentAdminId }: AdminUsersClientProps) {
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return users.slice(0, 40);
    }

    return users
      .filter((user) =>
        [
          user.email,
          user.name,
          user.surname,
          user.ville,
          user.gender,
          user.store,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))
      )
      .slice(0, 40);
  }, [users, searchQuery]);

  const handleCreate = (formData: FormData) => {
    startTransition(async () => {
      await createAdminUser(formData);
      setShowCreateForm(false);
    });
  };

  const handleUpdate = (uid: string, formData: FormData) => {
    startTransition(async () => {
      await updateAdminUser(uid, formData);
      setEditingId(null);
    });
  };

  const handleDelete = (uid: string, label: string) => {
    if (!confirm(`Supprimer le compte "${label}" ?`)) return;
    startTransition(() => deleteAdminUser(uid));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-serif text-[28px] text-foreground">Utilisateurs</h2>
          <p className="mt-1 text-[14px] text-foreground/56">
            Création, édition et suppression des comptes applicatifs.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Chercher un utilisateur..."
            className={`${inputClassName} min-w-[260px]`}
          />
          <button
            type="button"
            onClick={() => setShowCreateForm((current) => !current)}
            className="rounded-full bg-coral px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-coral-dark"
          >
            + Nouvel utilisateur
          </button>
        </div>
      </div>

      {isPending && (
        <div className="text-[12px] text-foreground/50">Mise à jour des utilisateurs...</div>
      )}

      {showCreateForm && (
        <div className="rounded-[24px] border border-coral/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,239,228,0.9))] p-5 shadow-[var(--shadow-sm)]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/40">
                Création
              </p>
              <h3 className="mt-1 font-serif text-[24px] text-foreground">
                Nouveau compte
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
          <UserForm action={handleCreate} submitLabel="Créer le compte" />
        </div>
      )}

      <div className="grid gap-4">
        {filteredUsers.map((user) => {
          const label =
            [user.name, user.surname].filter(Boolean).join(" ").trim() ||
            user.email ||
            user.uid;
          const isEditing = editingId === user.uid;
          const isCurrentAdmin = user.uid === currentAdminId;

          return (
            <div
              key={user.uid}
              className="overflow-hidden rounded-[24px] border border-white/60 bg-white/72 shadow-[var(--shadow-sm)]"
            >
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-[24px] text-foreground">{label}</h3>
                    {user.premium && (
                      <span className="rounded-full bg-coral/12 px-2.5 py-1 text-[11px] font-semibold text-coral">
                        Premium
                      </span>
                    )}
                    {isCurrentAdmin && (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                        Admin courant
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[14px] text-foreground/58">
                    {user.email || "Email indisponible"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-foreground/45">
                    {user.ville && <span>Ville: {user.ville}</span>}
                    {user.gender && <span>Genre: {user.gender}</span>}
                    {user.store && <span>Store: {user.store}</span>}
                    <span>Créé le {formatDate(user.created_at)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId((current) => (current === user.uid ? null : user.uid))}
                    className="rounded-full border border-foreground/12 px-4 py-2 text-[12px] font-semibold text-foreground/60 transition-colors hover:bg-foreground/5"
                  >
                    {isEditing ? "Fermer" : "Éditer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(user.uid, label)}
                    disabled={isCurrentAdmin}
                    className="rounded-full border border-red-200 px-4 py-2 text-[12px] font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="border-t border-foreground/8 p-5">
                  <UserForm
                    user={user}
                    action={(formData) => handleUpdate(user.uid, formData)}
                    submitLabel="Enregistrer les modifications"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-foreground/12 bg-white/36 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-foreground">Aucun utilisateur trouvé</p>
          <p className="mt-1 text-xs text-foreground/45">
            Ajustez votre recherche ou créez un nouveau compte.
          </p>
        </div>
      )}
    </div>
  );
}

function UserForm({
  user,
  action,
  submitLabel,
}: {
  user?: AdminUserRecord;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Email" name="email" type="email" defaultValue={user?.email} required />
        <Field
          label={user ? "Nouveau mot de passe" : "Mot de passe"}
          name="password"
          type="password"
          required={!user}
        />
        <Field label="Prénom" name="name" defaultValue={user?.name} />
        <Field label="Nom" name="surname" defaultValue={user?.surname} />
        <Field label="Avatar URL" name="avatar_url" type="url" defaultValue={user?.avatar_url} />
        <Field label="Ville" name="ville" defaultValue={user?.ville} />
        <Field label="Genre" name="gender" defaultValue={user?.gender} />
        <Field label="Préférences 1" name="pref1" defaultValue={user?.pref1?.join(", ")} />
        <Field label="Préférence 2" name="pref2" defaultValue={user?.pref2} />
        <Field label="Préférence 3" name="pref3" defaultValue={user?.pref3} />
        <Field label="Store" name="store" defaultValue={user?.store} />
        <Field label="Product ID" name="product_id" defaultValue={user?.product_id} />
        <Field label="RevenueCat ID" name="revenuecat_id" defaultValue={user?.revenuecat_id} />
        <Field
          label="Selection count"
          name="selection_count"
          type="number"
          defaultValue={toInputValue(user?.selection_count)}
        />
        <Field
          label="Subscription expires at"
          name="subscription_expires_at"
          type="datetime-local"
          defaultValue={toDateTimeLocal(user?.subscription_expires_at)}
        />
        <Field
          label="Grace period expires at"
          name="grace_period_expires_at"
          type="datetime-local"
          defaultValue={toDateTimeLocal(user?.grace_period_expires_at)}
        />
        <Field
          label="Auto resume at"
          name="auto_resume_at"
          type="datetime-local"
          defaultValue={toDateTimeLocal(user?.auto_resume_at)}
        />
        <Field label="Cancel reason" name="cancel_reason" defaultValue={user?.cancel_reason} />
        <Field
          label="Expiration reason"
          name="expiration_reason"
          defaultValue={user?.expiration_reason}
        />
        <Field label="FCM token" name="fcm_token" defaultValue={user?.fcm_token} />
        <Field
          label="FCM last date"
          name="fcm_last_date"
          type="datetime-local"
          defaultValue={toDateTimeLocal(user?.fcm_last_date)}
        />
      </div>

      {user && (
        <div className="rounded-[18px] border border-foreground/8 bg-white/55 px-4 py-3 text-[13px] text-foreground/55">
          UID: {user.uid}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <CheckboxField label="Premium" name="premium" defaultChecked={Boolean(user?.premium)} />
        <CheckboxField
          label="Billing issue"
          name="billing_issue"
          defaultChecked={Boolean(user?.billing_issue)}
        />
        <CheckboxField
          label="Subscription paused"
          name="subscription_paused"
          defaultChecked={Boolean(user?.subscription_paused)}
        />
      </div>

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
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: "text" | "email" | "url" | "number" | "password" | "datetime-local";
}) {
  return (
    <label className="space-y-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
        {label}
      </span>
      <input
        name={name}
        type={type}
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

function formatDate(value: string | null) {
  if (!value) return "Date inconnue";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toInputValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
