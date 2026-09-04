-- Le nombre d'intéressé·es par niveau, lisible sans compte — brique
-- `feat/score-adequation`, complément de 20260904120000_score_adequation.sql.
--
-- Le problème corrigé ici : `get_event_interested_people()` est réservée aux
-- comptes connectés, et c'est elle qui portait le niveau des autres. Résultat,
-- déconnectée, la carte d'adéquation affichait bien « 47 personnes
-- intéressées » — le compteur, lui, est public — puis retombait toujours sur
-- « personne avec une expérience proche de la tienne », la liste étant vide et
-- la sélection avec elle. Le questionnaire perdait sa promesse au moment précis
-- où elle aurait pu donner envie de créer un compte.
--
-- On ouvre donc le **nombre**, jamais les personnes : une ligne par niveau, pas
-- une ligne par personne. Ouvrir plutôt la policy de select de `user_public` à
-- `anon` aurait livré du même geste les noms et les avatars — c'est la mauvaise
-- porte, et elle ne se referme pas.


create or replace function public.get_event_interested_levels(p_event_id bigint)
  returns table(niveau text, nb bigint)
  language sql
  stable
  security definer
  set search_path to 'public'
  as $$
    -- `security definer` porte ici tout le poids de la fonction, contrairement
    -- aux deux précédentes où il ne servait qu'à joindre par-dessus une clé
    -- étrangère : `user_public` n'a qu'une policy de select `to authenticated`,
    -- et c'est bien elle qu'on contourne. Ce qui rend le contournement
    -- acceptable, c'est la forme du retour — des totaux agrégés, jamais un
    -- `uid`, un nom ou un avatar.
    select up.niveau, count(*)::bigint
    from (
      -- `distinct` : `favourite_events` n'a pas de contrainte d'unicité et
      -- porte des doublons en production (même raison que
      -- `get_event_interested_count`, qui compte des personnes et non des
      -- lignes de favoris).
      select distinct fe.user_id
      from public.favourite_events fe
      where fe.event = p_event_id
        -- Moi exclue : la phrase annonce « X personnes avec une expérience
        -- similaire », c'est-à-dire les autres. Pour `anon`, `auth.uid()` est
        -- `null` et n'exclut personne.
        --
        -- Cette exclusion côté SQL évite au passage le rattrapage optimiste que
        -- le compteur total doit faire côté client : cocher « Ça m'intéresse »
        -- me fait entrer dans le total, mais jamais dans le nombre des autres.
        and fe.user_id is distinct from auth.uid()
    ) fe
    join public.user_public up on up.uid = fe.user_id
    group by up.niveau;
  $$;

comment on function public.get_event_interested_levels(bigint) is
  'Nombre d''intéressé·es par niveau déclaré, appelante exclue. Public : renvoie des totaux, jamais des personnes.';

-- Les niveaux sont renvoyés **bruts**, et non repliés en paliers. Le repliage
-- (`Competition` rangé avec `Confirme`, la tolérance d'un palier d'écart) est
-- une décision produit qui vit dans `src/lib/compatibility/levels.ts`, avec ses
-- raisons. La refaire ici en ferait une deuxième source de vérité, et les deux
-- dériveraient. La ligne `niveau is null` remonte telle quelle : ces
-- personnes-là comptent dans le total des intéressé·es, jamais dans une
-- sélection par expérience.
--
-- Sur une fiche à une seule personne intéressée, l'agrégat laisse déduire le
-- niveau de cette personne. C'est assumé : un compte connecté lit déjà les
-- niveaux dans `user_public`, et une visiteuse anonyme n'obtient au mieux qu'un
-- `uid` — jamais un nom, `user_public` lui restant fermée.

revoke all on function public.get_event_interested_levels(bigint) from public;
grant execute on function public.get_event_interested_levels(bigint) to anon, authenticated, service_role;
