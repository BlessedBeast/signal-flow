-- RLS policies for browser-side lead reads (API routes use service role)
drop policy if exists "leads_select_own" on public.leads;
create policy "leads_select_own"
  on public.leads
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "leads_insert_own" on public.leads;
create policy "leads_insert_own"
  on public.leads
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "leads_update_own" on public.leads;
create policy "leads_update_own"
  on public.leads
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
