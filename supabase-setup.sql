-- Run once in the Supabase SQL editor (same project Portia uses is fine —
-- this creates a new, separate table, isolated from Portia's app_data).

create table if not exists wc_app_data (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table wc_app_data enable row level security;

-- Single shared-password app (gated client-side, same as Portia) — the anon
-- key is already effectively public once shipped in the page, so RLS here
-- just needs to scope access to this one table, not lock it down further.
drop policy if exists "wc anon read" on wc_app_data;
create policy "wc anon read" on wc_app_data for select using (true);

drop policy if exists "wc anon write" on wc_app_data;
create policy "wc anon write" on wc_app_data for insert with check (true);

drop policy if exists "wc anon update" on wc_app_data;
create policy "wc anon update" on wc_app_data for update using (true);

-- Enables the Realtime subscription app.js/data.js relies on for live
-- cross-device sync (Database → Replication in the dashboard does the same thing).
-- Guarded so the script is safe to re-run.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'wc_app_data'
  ) then
    alter publication supabase_realtime add table wc_app_data;
  end if;
end $$;
