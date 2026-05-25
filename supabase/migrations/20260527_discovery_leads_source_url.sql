-- Align legacy installs: rename url -> source_url when the old column still exists
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'discovery_leads'
      and column_name = 'url'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'discovery_leads'
      and column_name = 'source_url'
  ) then
    alter table public.discovery_leads rename column url to source_url;
  end if;
end $$;

-- Recreate unique constraint for source_url naming (idempotent)
alter table public.discovery_leads
  drop constraint if exists discovery_leads_user_url_unique;

alter table public.discovery_leads
  drop constraint if exists discovery_leads_user_source_url_unique;

alter table public.discovery_leads
  add constraint discovery_leads_user_source_url_unique unique (user_id, source_url);

drop index if exists discovery_leads_url_idx;

create index if not exists discovery_leads_source_url_idx
  on public.discovery_leads (source_url);
