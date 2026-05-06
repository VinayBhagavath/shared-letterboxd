-- =====================================================================
-- Shared Letterboxd-style Watchlist - Supabase schema
-- ---------------------------------------------------------------------
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- It is idempotent: safe to re-run.
--
-- Design notes:
--  * No auth: a "user" is just a display name stored in the browser's
--    localStorage. RLS is enabled but policies allow anon read/write
--    so any visitor can participate. Treat your project URL/anon key
--    as a soft secret (share within your friend group only).
--  * Realtime is enabled on movies, votes, and comments so all open
--    tabs sync live.
-- =====================================================================

-- Extensions ---------------------------------------------------------
create extension if not exists "pgcrypto";

-- Tables -------------------------------------------------------------
create table if not exists public.movies (
  id              uuid          primary key default gen_random_uuid(),
  tmdb_id         bigint        not null unique,
  title           text          not null,
  year            int,
  poster_url      text,
  backdrop_url    text,
  director        text,
  overview        text,
  runtime         int,
  genres          text[]        not null default '{}',
  letterboxd_url  text,
  added_by        text          not null,
  added_by_color  text,
  added_at        timestamptz   not null default now(),
  watched         boolean       not null default false,
  watched_at      timestamptz
);

-- Backfill column on databases created before added_by_color existed.
alter table public.movies add column if not exists added_by_color text;

create table if not exists public.votes (
  id          uuid         primary key default gen_random_uuid(),
  movie_id    uuid         not null references public.movies(id) on delete cascade,
  user_name   text         not null,
  user_color  text,
  created_at  timestamptz  not null default now(),
  constraint  votes_movie_user_unique unique (movie_id, user_name)
);

-- Backfill column on databases created before user_color existed.
alter table public.votes add column if not exists user_color text;

create table if not exists public.comments (
  id          uuid         primary key default gen_random_uuid(),
  movie_id    uuid         not null references public.movies(id) on delete cascade,
  user_name   text         not null,
  user_color  text,
  body        text         not null check (length(trim(body)) > 0),
  created_at  timestamptz  not null default now()
);

-- Backfill column on databases created before user_color existed.
alter table public.comments add column if not exists user_color text;

-- Per-user "I have seen this" records. One row per (movie, user).
create table if not exists public.watches (
  id          uuid         primary key default gen_random_uuid(),
  movie_id    uuid         not null references public.movies(id) on delete cascade,
  user_name   text         not null,
  user_color  text,
  created_at  timestamptz  not null default now(),
  constraint  watches_movie_user_unique unique (movie_id, user_name)
);

alter table public.watches add column if not exists user_color text;

-- Indexes ------------------------------------------------------------
create index if not exists movies_added_at_idx   on public.movies (added_at desc);
create index if not exists movies_watched_idx    on public.movies (watched);
create index if not exists votes_movie_idx       on public.votes (movie_id);
create index if not exists comments_movie_idx    on public.comments (movie_id, created_at);
create index if not exists watches_movie_idx     on public.watches (movie_id);

-- Row Level Security -------------------------------------------------
-- Public read + write is intentional for this app (no auth model).
alter table public.movies   enable row level security;
alter table public.votes    enable row level security;
alter table public.comments enable row level security;
alter table public.watches  enable row level security;

-- Drop and recreate policies so this script is idempotent.
drop policy if exists "movies_select_all"   on public.movies;
drop policy if exists "movies_insert_all"   on public.movies;
drop policy if exists "movies_update_all"   on public.movies;
drop policy if exists "movies_delete_all"   on public.movies;
drop policy if exists "votes_select_all"    on public.votes;
drop policy if exists "votes_insert_all"    on public.votes;
drop policy if exists "votes_delete_all"    on public.votes;
drop policy if exists "comments_select_all" on public.comments;
drop policy if exists "comments_insert_all" on public.comments;
drop policy if exists "comments_delete_all" on public.comments;
drop policy if exists "watches_select_all"  on public.watches;
drop policy if exists "watches_insert_all"  on public.watches;
drop policy if exists "watches_delete_all"  on public.watches;

create policy "movies_select_all"   on public.movies   for select using (true);
create policy "movies_insert_all"   on public.movies   for insert with check (true);
create policy "movies_update_all"   on public.movies   for update using (true) with check (true);
create policy "movies_delete_all"   on public.movies   for delete using (true);

create policy "votes_select_all"    on public.votes    for select using (true);
create policy "votes_insert_all"    on public.votes    for insert with check (true);
create policy "votes_delete_all"    on public.votes    for delete using (true);

create policy "comments_select_all" on public.comments for select using (true);
create policy "comments_insert_all" on public.comments for insert with check (true);
create policy "comments_delete_all" on public.comments for delete using (true);

create policy "watches_select_all"  on public.watches  for select using (true);
create policy "watches_insert_all"  on public.watches  for insert with check (true);
create policy "watches_delete_all"  on public.watches  for delete using (true);

-- Realtime publication ----------------------------------------------
-- Supabase ships a `supabase_realtime` publication. Add tables to it.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'movies'
  ) then
    execute 'alter publication supabase_realtime add table public.movies';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'votes'
  ) then
    execute 'alter publication supabase_realtime add table public.votes';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then
    execute 'alter publication supabase_realtime add table public.comments';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'watches'
  ) then
    execute 'alter publication supabase_realtime add table public.watches';
  end if;
end $$;

-- Optional: a convenience view for debugging vote counts.
create or replace view public.movie_vote_counts as
select m.id as movie_id, count(v.id)::int as vote_count
from public.movies m
left join public.votes v on v.movie_id = m.id
group by m.id;
