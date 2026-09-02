-- Mesures d'inclusion affichées sur la fiche évènement.
--
-- Deux tables, additives : le catalogue (partagé, alimenté par Upcomi) et la
-- liaison évènement ↔ mesure. La clé étrangère est portée par la table enfant :
-- `events` n'est pas modifiée.
--
-- Les deux tables sont en lecture publique : la fiche évènement est rendue
-- côté serveur avec la clé publique, et elle est consultable sans compte.
-- L'écriture reste réservée aux admins (saisie en SQL ou via `/admin` plus
-- tard) : ce ne sont pas des données déclarées par les utilisatrices.

create table if not exists public.inclusion_measures (
  id text primary key,
  label text not null,
  description text not null,
  -- Moment de l'évènement auquel la mesure s'applique. Sert au regroupement
  -- de l'affichage (un groupe sans mesure ne s'affiche pas).
  measure_group text not null check (measure_group in ('avant', 'pendant', 'apres')),
  -- Nom d'icône lucide, résolu côté code par un dictionnaire explicite :
  -- une valeur inconnue retombe sur une icône par défaut, jamais d'import
  -- dynamique depuis la base.
  icon text not null,
  -- Ordre d'affichage à l'intérieur d'un groupe.
  position integer not null default 0
);

create table if not exists public.event_inclusion_measures (
  event_id integer not null references public.events(id) on delete cascade,
  measure_id text not null references public.inclusion_measures(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, measure_id)
);

create index if not exists event_inclusion_measures_event_id_idx
  on public.event_inclusion_measures (event_id);

alter table public.inclusion_measures enable row level security;
alter table public.event_inclusion_measures enable row level security;

revoke all on table public.inclusion_measures from anon, authenticated;
revoke all on table public.event_inclusion_measures from anon, authenticated;

grant select on table public.inclusion_measures to anon, authenticated;
grant select on table public.event_inclusion_measures to anon, authenticated;

drop policy if exists "Inclusion measures are viewable by everyone" on public.inclusion_measures;
create policy "Inclusion measures are viewable by everyone"
  on public.inclusion_measures
  for select
  using (true);

drop policy if exists "Event inclusion measures are viewable by everyone" on public.event_inclusion_measures;
create policy "Event inclusion measures are viewable by everyone"
  on public.event_inclusion_measures
  for select
  using (true);

-- Catalogue repris du guide inclusivité Upcomi (mêmes libellés et descriptions
-- que le prototype). Rejouable sans dégât : les descriptions sont remises à
-- jour, les rattachements évènement ↔ mesure ne sont pas touchés.
insert into public.inclusion_measures (id, label, description, measure_group, icon, position) values
  ('vocabulaire-inclusif', 'Communication et vocabulaire inclusifs', 'Un langage clair et non intimidant dans toute la communication de l''évènement, qui montre des profils variés plutôt qu''un seul type de participant·e.', 'avant', 'MessageCirclePlus', 10),
  ('photos-representatives', 'Photos représentatives de femmes et minorités de genre', 'Des images qui montrent réellement des femmes et minorités de genre dans différents rôles — débutantes, expertes, en groupe — pas seulement comme figurantes sur l''affiche.', 'avant', 'Star', 20),
  ('inscription-levier', 'Inscription pensée comme levier d''inclusion', 'Période d''inscription longue, quotas de places, tarifs réduits ou fenêtres dédiées : les freins logistiques (garde d''enfants, budget, organisation) sont identifiés et pris en compte.', 'avant', 'Calendar', 30),
  ('sas-premiere-aventure', '« Sas » première aventure', 'Un format découverte, un groupe débutantes ou un briefing renforcé, pour que se lancer sur une première aventure de ce type soit pleinement légitime.', 'avant', 'Compass', 40),
  ('plusieurs-portes-entree', 'Plusieurs portes d''entrée', 'Plusieurs distances, allures ou groupes possibles, pour participer selon son niveau et sa disponibilité plutôt que selon un seul format imposé.', 'avant', 'MoveHorizontal', 50),
  ('temps-mixite-choisie', 'Temps en mixité choisie', 'Des sorties, ateliers ou temps d''accueil réservés aux femmes et minorités de genre, assumés comme un outil d''inclusion et non comme une exclusion.', 'avant', 'Venus', 60),
  ('enseigner-autonomie', 'Autonomie enseignée, pas supposée', 'Ateliers mécanique et matériel, check-lists de préparation, temps de questions : l''autonomie sur ce type de format s''apprend, elle n''est pas prérequise.', 'avant', 'GraduationCap', 70),
  ('pret-materiel', 'Prêt de matériel et solutions d''accès', 'Prêt de sacoches ou d''équipement, solutions de location, bourse d''échange ou covoiturage organisé pour lever la barrière du matériel.', 'avant', 'Backpack', 80),
  ('ambassadrices-referentes', 'Ambassadrices, marraines ou référentes identifiées', 'Des personnes-clés visibles et présentées en amont, pour l''accueil, la transmission et la mise en lien avec les participantes.', 'avant', 'Users', 90),
  ('hebergement-adapte', 'Solutions d''hébergement adaptées', 'Options non mixtes, dortoirs ou chambres réservés, modalités rassurantes et conditions claires annoncées avant l''inscription.', 'avant', 'BedDouble', 100),
  ('entraide-avant-depart', 'Espace d''entraide avant le départ', 'Groupe de discussion, canal de questions-réponses, mise en relation pour le covoiturage ou le partage de matériel entre participant·es avant le jour J.', 'avant', 'Heart', 110),
  ('cadre-clair-avant-depart', 'Cadre et procédure de signalement clairs', 'Une charte de conduite courte, une personne référente identifiée contre les violences sexistes et sexuelles, un contact affiché — pas caché dans le règlement.', 'avant', 'ShieldCheck', 120),
  ('on-roule-ensemble', '« On roule ensemble »', 'Un principe no-drop rappelé au briefing, des regroupements organisés, une personne devant et une derrière : l''entraide prime sur la vitesse.', 'pendant', 'Users', 10),
  ('convivialite-format', 'Convivialité intégrée au format', 'Accueil avant le départ, repas ou café partagés, débrief collectif : les liens comptent autant que la performance dans le déroulé de la journée.', 'pendant', 'Smile', 20),
  ('toilettes-organisation', 'Sanitaires pensés et entretenus', 'Toilettes faciles à trouver, propres, éclairées, en nombre suffisant et non réservées aux hommes, avec des protections périodiques à disposition.', 'pendant', 'Droplet', 30),
  ('personnes-ressources-visibles', 'Personnes ressources visibles sur place', 'Référentes rappelées au briefing, numéros utiles affichés, équipe identifiable et bénévoles formé·es à réagir en cas de besoin.', 'pendant', 'Flag', 40),
  ('porte-sortie-rassurante', 'Porte de sortie rassurante', 'Gares, arrêts, raccourcis ou contacts d''urgence indiqués clairement : abandonner ou changer de format en cours de route est présenté comme normal.', 'pendant', 'MapPin', 50),
  ('eviter-hierarchie', 'Pas de hiérarchie implicite entre participant·es', 'Classement et podium femmes visibles, dotation de valeur égale, reconnaissance des différentes façons de vivre l''évènement au-delà de la seule performance.', 'pendant', 'Award', 60),
  ('penser-apres', 'Suivi après l''évènement', 'Photos et contacts partagés, prochaines sorties proposées, groupe d''échange maintenu actif : l''aventure ne s''arrête pas à la ligne d''arrivée.', 'apres', 'Clock', 10),
  ('demander-retours', 'Retours recueillis et cadre qui évolue', 'Un questionnaire après l''évènement, ce qui a aidé ou freiné documenté, et des évolutions concrètes annoncées pour l''édition suivante.', 'apres', 'MessageCirclePlus', 20)
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  measure_group = excluded.measure_group,
  icon = excluded.icon,
  position = excluded.position;
