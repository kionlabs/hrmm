create table if not exists hrmm.teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  normalized_name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hrmm.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references hrmm.teams(id) on delete restrict,
  source_key text not null unique,
  member_name text,
  normalized_name text,
  contact text,
  normalized_phone text,
  category text,
  company_name text,
  commission_rate numeric(7,4),
  power_usage_kw numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hrmm.import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  uploaded_at timestamptz not null default now(),
  total_rows integer not null default 0,
  new_count integer not null default 0,
  changed_count integer not null default 0,
  duplicate_count integer not null default 0,
  review_count integer not null default 0,
  same_count integer not null default 0,
  applied_count integer not null default 0,
  is_applied boolean not null default false,
  applied_at timestamptz
);

create table if not exists hrmm.import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references hrmm.import_batches(id) on delete cascade,
  row_number integer not null,
  status text not null check (status in ('new', 'changed', 'same', 'duplicate', 'review')),
  approved boolean not null default false,
  applied boolean not null default false,
  existing_team_id uuid references hrmm.teams(id) on delete set null,
  existing_member_id uuid references hrmm.team_members(id) on delete set null,
  old_value jsonb,
  new_value jsonb not null,
  created_at timestamptz not null default now(),
  unique(batch_id, row_number)
);

create index if not exists idx_team_members_team_id on hrmm.team_members(team_id);
create index if not exists idx_team_members_name on hrmm.team_members(normalized_name);
create index if not exists idx_team_members_phone on hrmm.team_members(normalized_phone);
create index if not exists idx_import_rows_batch_id on hrmm.import_rows(batch_id);
create index if not exists idx_import_rows_status on hrmm.import_rows(status);

alter table hrmm.teams enable row level security;
alter table hrmm.team_members enable row level security;
alter table hrmm.import_batches enable row level security;
alter table hrmm.import_rows enable row level security;

-- Auth와 관리자 권한 정책이 확정되기 전까지 Data API 접근을 모두 차단한다.
revoke all on hrmm.teams, hrmm.team_members, hrmm.import_batches, hrmm.import_rows from anon, authenticated;
