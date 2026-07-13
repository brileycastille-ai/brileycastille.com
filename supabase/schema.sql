create table if not exists profiles (id uuid primary key references auth.users on delete cascade, email text, display_name text, is_creator boolean default false, notify_new_idea boolean default true, notify_new_work boolean default true, notify_comment_reply boolean default true, notify_creator_reply boolean default true, notify_question_answered boolean default true, created_at timestamptz default now());
create table if not exists essays (id bigint generated always as identity primary key, slug text unique not null, title text not null, dek text, content_html text not null, status text default 'published', published_at timestamptz default now(), created_by uuid references auth.users);
create table if not exists essay_ideas (id bigint generated always as identity primary key, title text not null, overview text not null, stage text default 'Idea', created_at timestamptz default now());
create table if not exists comments (id bigint generated always as identity primary key, essay_slug text not null, paragraph_id text, parent_id bigint references comments, user_id uuid references auth.users, display_name text default 'Anonymous', guest_email text, body text not null, is_creator_reply boolean default false, created_at timestamptz default now());
create table if not exists questions (id bigint generated always as identity primary key, question text not null, context text default 'standalone', user_id uuid references auth.users, answered_in_slug text, created_at timestamptz default now());
alter table profiles enable row level security; alter table essays enable row level security; alter table essay_ideas enable row level security; alter table comments enable row level security; alter table questions enable row level security;
create policy "Published essays are public" on essays for select using (status='published');
create policy "Ideas are public" on essay_ideas for select using (true);
create policy "Comments are public" on comments for select using (true);
create policy "Readers can comment" on comments for insert to authenticated with check (auth.uid()=user_id or user_id is null);
create policy "Readers manage own profile" on profiles for all to authenticated using (auth.uid()=id) with check (auth.uid()=id);
create policy "Readers submit questions" on questions for insert to authenticated with check (auth.uid()=user_id or user_id is null);
-- Server-side creator actions additionally verify this exact email before using the service role.
