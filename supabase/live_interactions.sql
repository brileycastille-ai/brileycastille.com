create table if not exists question_votes (question_id bigint not null references questions on delete cascade, voter_key text not null, created_at timestamptz default now(), primary key (question_id, voter_key));
alter table question_votes enable row level security;
drop policy if exists "Questions are public" on questions;
create policy "Questions are public" on questions for select using (true);
drop policy if exists "Vote totals are public" on question_votes;
create policy "Vote totals are public" on question_votes for select using (true);
