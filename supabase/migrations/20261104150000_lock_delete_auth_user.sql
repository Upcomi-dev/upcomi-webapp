-- delete_auth_user (héritée de FlutterFlow) était SECURITY DEFINER et
-- exécutable par anon : n'importe qui avec la clé publique pouvait supprimer
-- n'importe quel compte. Désormais seul l'utilisateur connecté peut supprimer
-- le sien ; l'admin passe par auth.admin.deleteUser (clé secrète).
create or replace function public.delete_auth_user(user_uuid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is distinct from user_uuid then
    raise exception 'delete_auth_user: not allowed' using errcode = '42501';
  end if;

  delete from auth.identities where user_id = user_uuid;
  delete from auth.sessions where user_id = user_uuid;
  delete from auth.refresh_tokens where user_id = user_uuid::text;
  delete from auth.mfa_factors where user_id = user_uuid;
  delete from auth.users where id = user_uuid;
end;
$function$;

revoke execute on function public.delete_auth_user(uuid) from public, anon;
grant execute on function public.delete_auth_user(uuid) to authenticated, service_role;
