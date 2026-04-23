export interface Event {
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

export interface MapEvent {
  id: number;
  nomEvent: string | null;
  latitude: number;
  longitude: number;
  bike_type: string | null;
  type_event: string | null;
  dateEvent: string | null;
  image: string | null;
  distance_range_filter: string | null;
  region: string | null;
  budget: string | null;
  villeDepart: string | null;
  paysDepart: string | null;
  mint: boolean;
}

export interface SousEvent {
  sousEventID: number;
  event_id: number | null;
  event_name: string | null;
  nom: string | null;
  bikeType: string | null;
  distance: number | null;
  prix: number | null;
  elevation: number | null;
  delai: string | null;
  typeEvent: string | null;
  trace_fixe: boolean | null;
}

export interface FavouriteEvent {
  id: number;
  created_at: string;
  user_id: string;
  event: number;
}

export type FeedbackKind = "idea" | "bug" | "feedback";

export type FeedbackStatus = "new" | "reviewing" | "closed";

export interface FeedbackEntry {
  id: string;
  user_id: string | null;
  kind: FeedbackKind;
  status: FeedbackStatus;
  subject: string;
  message: string;
  contact_name: string | null;
  contact_email: string | null;
  page_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  order: number;
  is_auto: boolean;
  is_active: boolean;
  auto_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionWithEvents extends Collection {
  events: MapEvent[];
}

export type EventTypeColor = {
  [key: string]: string;
};

export const EVENT_TYPE_COLORS: EventTypeColor = {
  Course: "#9ab0ec",
  Aventure: "#ff7d59",
  Brevet: "#f5a60b",
  "Social Ride": "#ab89db",
  "Social ride": "#ab89db",
  Evènement: "#f59e42",
};

export const EVENT_TYPE_LEGEND = [
  { label: "Course", color: EVENT_TYPE_COLORS.Course },
  { label: "Aventure", color: EVENT_TYPE_COLORS.Aventure },
  { label: "Brevet", color: EVENT_TYPE_COLORS.Brevet },
  { label: "Social Ride", color: EVENT_TYPE_COLORS["Social Ride"] },
  { label: "Evènement", color: EVENT_TYPE_COLORS.Evènement },
] as const;

export function getEventTypeColor(type: string | null): string {
  if (!type) return "#f59e42";
  return EVENT_TYPE_COLORS[type] || "#f59e42";
}
