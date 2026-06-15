update storage.buckets
set public = false
where id = 'flutterflow';

drop policy if exists "forFlutterflow 1quy05m_0" on storage.objects;
drop policy if exists "forFlutterflow 1quy05m_1" on storage.objects;
drop policy if exists "forFlutterflow 1quy05m_2" on storage.objects;
drop policy if exists "forFlutterflow 1quy05m_3" on storage.objects;
