"use client";

import { useState, useTransition } from "react";
import {
  createCollection,
  updateCollection,
  deleteCollection,
  addEventToCollection,
  removeEventFromCollection,
  reorderCollections,
  reorderEventsInCollection,
  toggleCollectionActive,
} from "@/app/admin/actions";

interface AdminCollection {
  id: string;
  name: string;
  description: string | null;
  order: number;
  is_auto: boolean;
  is_active: boolean;
  auto_type: string | null;
  eventCount: number;
  eventIds: number[];
}

interface AdminEvent {
  id: number;
  name: string;
  date: string | null;
  type: string | null;
  city: string | null;
}

interface AdminCollectionsClientProps {
  collections: AdminCollection[];
  events: AdminEvent[];
}

export function AdminCollectionsClient({ collections, events }: AdminCollectionsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = (formData: FormData) => {
    startTransition(async () => {
      await createCollection(formData);
      setShowCreateForm(false);
    });
  };

  const handleUpdate = (id: string, formData: FormData) => {
    startTransition(async () => {
      await updateCollection(id, formData);
      setEditingId(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cette collection ?")) return;
    startTransition(() => deleteCollection(id));
  };

  const handleAddEvent = (collectionId: string, eventId: number) => {
    startTransition(() => addEventToCollection(collectionId, eventId));
  };

  const handleRemoveEvent = (collectionId: string, eventId: number) => {
    startTransition(() => removeEventFromCollection(collectionId, eventId));
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    startTransition(() => toggleCollectionActive(id, !currentActive));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const ids = collections.map((c) => c.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    startTransition(() => reorderCollections(ids));
  };

  const handleMoveDown = (index: number) => {
    if (index >= collections.length - 1) return;
    const ids = collections.map((c) => c.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    startTransition(() => reorderCollections(ids));
  };

  const handleMoveEventUp = (collectionId: string, eventIds: number[], index: number) => {
    if (index === 0) return;
    const reordered = [...eventIds];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    startTransition(() => reorderEventsInCollection(collectionId, reordered));
  };

  const handleMoveEventDown = (collectionId: string, eventIds: number[], index: number) => {
    if (index >= eventIds.length - 1) return;
    const reordered = [...eventIds];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    startTransition(() => reorderEventsInCollection(collectionId, reordered));
  };

  const filteredEvents = searchQuery.length >= 2
    ? events.filter((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.city && e.city.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 20)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[28px] text-foreground">Collections</h2>
        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-full bg-coral px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-coral-dark"
        >
          + Nouvelle collection
        </button>
      </div>

      {isPending && (
        <div className="text-[12px] text-foreground/50">Mise à jour...</div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <form
          action={handleCreate}
          className="rounded-[20px] border border-white/50 bg-white/60 p-5 space-y-4"
        >
          <input
            name="name"
            placeholder="Nom de la collection"
            required
            className="w-full rounded-xl border border-foreground/10 bg-white/80 px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/35 focus:border-coral/40 focus:outline-none"
          />
          <input
            name="description"
            placeholder="Description (optionnel)"
            className="w-full rounded-xl border border-foreground/10 bg-white/80 px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/35 focus:border-coral/40 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-coral px-4 py-2 text-[13px] font-semibold text-white"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-full border border-foreground/15 px-4 py-2 text-[13px] text-foreground/60"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Collections list */}
      <div className="space-y-3">
        {collections.map((col, index) => (
          <div
            key={col.id}
            className="rounded-[20px] border border-white/50 bg-white/60 overflow-hidden"
          >
            {/* Collection header */}
            <div className="flex items-center justify-between p-4">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === col.id ? null : col.id)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <span className="font-serif text-[18px] text-foreground">{col.name}</span>
                {col.is_auto && (
                  <span className="rounded-full bg-violet/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet">
                    Auto
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${col.is_active ? "bg-green-100 text-green-700" : "bg-foreground/8 text-foreground/40"}`}>
                  {col.is_active ? "Active" : "Inactive"}
                </span>
                <span className="text-[12px] text-foreground/40">
                  {col.eventCount} événement{col.eventCount !== 1 ? "s" : ""}
                </span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleActive(col.id, col.is_active)}
                  className={`h-8 rounded-full border px-3 text-[11px] font-semibold transition-colors ${
                    col.is_active
                      ? "border-green-200 text-green-600 hover:bg-green-50"
                      : "border-foreground/10 text-foreground/40 hover:bg-foreground/5"
                  }`}
                >
                  {col.is_active ? "Désactiver" : "Activer"}
                </button>
                {!col.is_auto && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="h-8 w-8 rounded-full border border-foreground/10 text-[13px] text-foreground/40 transition-colors hover:bg-foreground/5 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index >= collections.length - 1}
                      className="h-8 w-8 rounded-full border border-foreground/10 text-[13px] text-foreground/40 transition-colors hover:bg-foreground/5 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === col.id ? null : col.id)}
                      className="h-8 w-8 rounded-full border border-foreground/10 text-[13px] text-foreground/40 transition-colors hover:bg-foreground/5"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(col.id)}
                      className="h-8 w-8 rounded-full border border-red-200 text-[13px] text-red-400 transition-colors hover:bg-red-50"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Edit form */}
            {editingId === col.id && !col.is_auto && (
              <form
                action={(fd) => handleUpdate(col.id, fd)}
                className="border-t border-foreground/8 p-4 space-y-3"
              >
                <input
                  name="name"
                  defaultValue={col.name}
                  required
                  className="w-full rounded-xl border border-foreground/10 bg-white/80 px-4 py-2.5 text-[14px] text-foreground focus:border-coral/40 focus:outline-none"
                />
                <input
                  name="description"
                  defaultValue={col.description || ""}
                  placeholder="Description"
                  className="w-full rounded-xl border border-foreground/10 bg-white/80 px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/35 focus:border-coral/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-full bg-coral px-4 py-2 text-[13px] font-semibold text-white"
                >
                  Enregistrer
                </button>
              </form>
            )}

            {/* Expanded: events + search */}
            {expandedId === col.id && !col.is_auto && (
              <div className="border-t border-foreground/8 p-4 space-y-4">
                {/* Current events */}
                {col.eventIds.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-foreground/40">
                      Événements dans cette collection
                    </p>
                    {col.eventIds.map((eventId, eventIndex) => {
                      const event = events.find((e) => e.id === eventId);
                      if (!event) return null;
                      return (
                        <div
                          key={eventId}
                          className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2"
                        >
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveEventUp(col.id, col.eventIds, eventIndex)}
                              disabled={eventIndex === 0}
                              className="h-5 w-5 rounded text-[10px] text-foreground/40 hover:bg-foreground/5 disabled:opacity-20"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveEventDown(col.id, col.eventIds, eventIndex)}
                              disabled={eventIndex >= col.eventIds.length - 1}
                              className="h-5 w-5 rounded text-[10px] text-foreground/40 hover:bg-foreground/5 disabled:opacity-20"
                            >
                              ↓
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-medium text-foreground">
                              {event.name}
                            </span>
                            {event.city && (
                              <span className="ml-2 text-[11px] text-foreground/40">
                                {event.city}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveEvent(col.id, eventId)}
                            className="text-[12px] text-red-400 hover:text-red-600"
                          >
                            Retirer
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add event search */}
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-foreground/40">
                    Ajouter un événement
                  </p>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Chercher par nom ou ville..."
                    className="w-full rounded-xl border border-foreground/10 bg-white/80 px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/35 focus:border-coral/40 focus:outline-none"
                  />
                  {filteredEvents.length > 0 && (
                    <div className="mt-2 max-h-[240px] overflow-y-auto rounded-xl border border-foreground/8 bg-white/70">
                      {filteredEvents
                        .filter((e) => !col.eventIds.includes(e.id))
                        .map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => {
                              handleAddEvent(col.id, event.id);
                              setSearchQuery("");
                            }}
                            className="flex w-full items-center justify-between border-b border-foreground/5 px-3 py-2 text-left text-[13px] transition-colors last:border-0 hover:bg-foreground/3"
                          >
                            <div>
                              <span className="font-medium text-foreground">{event.name}</span>
                              {event.city && (
                                <span className="ml-2 text-foreground/40">{event.city}</span>
                              )}
                            </div>
                            <span className="text-[11px] text-coral">+ Ajouter</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {collections.length === 0 && !showCreateForm && (
        <div className="rounded-[24px] border border-dashed border-foreground/12 bg-white/36 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-foreground">Aucune collection</p>
          <p className="mt-1 text-xs text-foreground/45">
            Créez votre première collection pour commencer
          </p>
        </div>
      )}
    </div>
  );
}
