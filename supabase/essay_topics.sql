alter table public.essays add column if not exists topics text[] not null default '{}';
