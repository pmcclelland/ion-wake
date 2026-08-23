-- Shared arcade high scores (unowned — no accounts).
create table if not exists scores (
  id    serial primary key,
  name  text not null,
  score integer not null,
  wave  integer not null,
  at    bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists scores_rank_idx on scores (score desc, at desc);
