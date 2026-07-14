create extension if not exists citext;

alter table profiles add column if not exists username citext;
create unique index if not exists profiles_username_unique on profiles (username) where username is not null;

create or replace function public.make_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, username, is_creator)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Reader'), '@', 1)),
    null,
    lower(coalesce(new.email, '')) = 'brileycastille@gmail.com'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup after insert on auth.users
for each row execute function public.make_profile_for_new_user();

insert into profiles (id, email, display_name, is_creator)
select id, email, coalesce(nullif(raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(email, 'Reader'), '@', 1)), lower(coalesce(email, '')) = 'brileycastille@gmail.com'
from auth.users
on conflict (id) do update set email = excluded.email;

alter table questions add column if not exists display_name text not null default 'Anonymous';
alter table questions add column if not exists is_anonymous boolean not null default true;

create table if not exists reporting (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null,
  status text not null default 'Planning',
  expected text not null default 'To be announced',
  color text not null default 'amber',
  created_at timestamptz default now()
);

create table if not exists progress_votes (
  reporting_id bigint not null references reporting on delete cascade,
  voter_key text not null,
  created_at timestamptz default now(),
  primary key (reporting_id, voter_key)
);

create table if not exists question_votes (
  question_id bigint not null references questions on delete cascade,
  voter_key text not null,
  created_at timestamptz default now(),
  primary key (question_id, voter_key)
);

alter table question_votes add column if not exists voter_key text;
update question_votes set voter_key = 'user:' || user_id::text where voter_key is null and user_id is not null;
alter table question_votes drop constraint if exists question_votes_pkey;
alter table question_votes alter column user_id drop not null;
alter table question_votes alter column voter_key set not null;
alter table question_votes add constraint question_votes_pkey primary key (question_id, voter_key);

create table if not exists notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  title text not null,
  message text not null,
  href text not null default '/account',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists publication_settings (
  id text primary key default 'main',
  about_heading text not null default 'I have always been fascinated by the questions behind the headlines.',
  about_body text not null default 'I am Briley Castille, a political writer from Spring, Texas. I am currently a freshman at Texas A&M University-Corpus Christi and participating in Texas A&M''s Program for System Admission, commonly known as PSA. I plan to continue my education in College Station.',
  about_photo_url text,
  updated_at timestamptz default now()
);

insert into publication_settings (id) values ('main') on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('publication-media', 'publication-media', true)
on conflict (id) do update set public = true;

alter table reporting enable row level security;
alter table progress_votes enable row level security;
alter table question_votes enable row level security;
alter table publication_settings enable row level security;
alter table notifications enable row level security;

drop policy if exists "Reporting is public" on reporting;
create policy "Reporting is public" on reporting for select using (true);
drop policy if exists "Progress vote totals are public" on progress_votes;
create policy "Progress vote totals are public" on progress_votes for select using (true);
drop policy if exists "Question vote totals are public" on question_votes;
create policy "Question vote totals are public" on question_votes for select using (true);
drop policy if exists "Publication settings are public" on publication_settings;
create policy "Publication settings are public" on publication_settings for select using (true);
drop policy if exists "Readers see own notifications" on notifications;
create policy "Readers see own notifications" on notifications for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Readers update own notifications" on notifications;
create policy "Readers update own notifications" on notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
