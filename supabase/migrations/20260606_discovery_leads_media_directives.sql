alter table public.discovery_leads
  add column if not exists media_directives jsonb not null default '[]'::jsonb;

comment on column public.discovery_leads.media_directives is
  'Text-only proof directives for native attachments (screenshots, charts, clips) tied to reply drafts.';
