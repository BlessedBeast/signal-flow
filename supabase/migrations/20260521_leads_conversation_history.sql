-- Conversation ledger for follow-up reply generation
alter table public.leads
  add column if not exists conversation_history jsonb not null default '[]'::jsonb;

comment on column public.leads.conversation_history is
  'Ordered prospect/user turns for pipeline timeline sync.';
