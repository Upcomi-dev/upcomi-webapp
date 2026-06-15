update public.events
set image = replace(
  image,
  '/storage/v1/object/public/flutterflow/',
  '/storage/v1/object/public/upcomi/'
)
where image like '%/storage/v1/object/public/flutterflow/%';

update public.users
set avatar_url = replace(
  avatar_url,
  '/storage/v1/object/public/flutterflow/',
  '/storage/v1/object/public/upcomi/'
)
where avatar_url like '%/storage/v1/object/public/flutterflow/%';
