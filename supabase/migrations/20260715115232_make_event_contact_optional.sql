alter table public.event_submission_contacts
  alter column contact_name drop not null,
  alter column contact_email drop not null;
