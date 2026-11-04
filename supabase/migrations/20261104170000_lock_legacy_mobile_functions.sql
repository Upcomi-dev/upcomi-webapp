-- Fonctions héritées de l'app mobile FlutterFlow (arrêtée), encore appelables
-- via l'API par anon / n'importe quel compte : listes d'utilisateurs, amitiés,
-- favoris d'autrui, notification broadcast TestFlight, etc. Le site n'en
-- appelle aucune. On retire l'exécution à public / anon / authenticated ;
-- service_role garde l'accès.
--
-- Les fonctions de trigger sont incluses : PostgreSQL ne vérifie le droit
-- EXECUTE qu'à la création du trigger, pas à son déclenchement.
--
-- Gardées (utilisées par le site ou une branche en cours) : ensure_organisateur,
-- get_event_favourite_counts, get_event_interested_count, get_event_interested_levels,
-- get_event_approved_story_count, get_events_with_stories, get_popular_events(integer),
-- has_event_promo_code, is_upcomi_web_server, upcomi_event_slugify.
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.broadcast_testflight_notification(text,text)',
    'public.create_profile_for_new_user()',
    'public.debug_get_filtered_events(text,text)',
    'public.delete_auth_user(uuid)',
    'public.get_all_users(text,text)',
    'public.get_event_likes(bigint,uuid)',
    'public.get_favourite_events(uuid,boolean)',
    'public.get_favourite_orga(uuid)',
    'public.get_filtered_events(text,text,text,text[],text[],text[],text[],text,integer,integer)',
    'public.get_filtered_events(text,text,text,text[],text[],text[],text[],text,integer,integer,text)',
    'public.get_filtered_events(text,text,text,text[],text[],text[],text[],text,integer,integer,text,text)',
    'public.get_friends_who_liked_event(text,bigint)',
    'public.get_next_favourite_event(uuid)',
    'public.get_organizer_details(integer)',
    'public.get_user_favourite_events(uuid)',
    'public.get_user_relationship_data(uuid,uuid)',
    'public.has_unread_notifications(uuid)',
    'public.notify_dot_event()',
    'public.notify_friend_accepted()',
    'public.notify_friend_request()',
    'public.notify_new_event_from_favourite_org()',
    'public.refresh_popular_events()',
    'public.set_orga_image()',
    'public.sync_user_public()',
    'public.update_nb_events_for_organisateur()',
    'public.update_updated_at_column()',
    'public.update_user_fcm(text)'
  ]
  loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end $$;
