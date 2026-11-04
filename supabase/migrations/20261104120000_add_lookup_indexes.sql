-- Index des recherches faites à chaque ouverture de page. Les tables sont encore
-- petites (≈ 1 600 évènements), mais ces lectures partent en scan séquentiel à
-- chaque requête : on les indexe avant que le volume ne le fasse sentir.

-- Fiche évènement : `.eq("slug", …)`. L'index unique existant porte sur
-- `lower(slug)` et n'est donc pas utilisé par une égalité simple.
create index if not exists events_slug_idx on public.events (slug);

-- « Leurs autres évènements » sur la fiche.
create index if not exists events_organisateur_idx on public.events (organisateur)
  where verifie = true;

-- Parcours d'un évènement (fiche, dénivelés de la carte).
create index if not exists sous_events_event_id_idx on public.sous_events (event_id);

-- Favoris d'un compte, et compteurs par évènement.
create index if not exists favourite_events_user_id_idx on public.favourite_events (user_id);
create index if not exists favourite_events_event_idx on public.favourite_events (event);

-- Contrôle d'accès des images servies par /api/storage.
create index if not exists events_image_idx on public.events (image)
  where verifie = true;
