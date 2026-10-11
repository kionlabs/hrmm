create extension if not exists pgcrypto with schema extensions;

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
  source_row_number integer not null unique,
  source_key text not null,
  member_name text,
  normalized_name text,
  contact text,
  normalized_phone text,
  category text,
  company_name text,
  normalized_company text,
  commission_rate numeric(7,4),
  power_usage_kw numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hrmm.team_compare_config (
  singleton boolean primary key default true check (singleton),
  secret_hash text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_team_members_team_id on hrmm.team_members(team_id);
create index if not exists idx_team_members_source_key on hrmm.team_members(source_key);
create index if not exists idx_team_members_name on hrmm.team_members(normalized_name);
create index if not exists idx_team_members_phone on hrmm.team_members(normalized_phone);
create index if not exists idx_team_members_company on hrmm.team_members(normalized_company);

alter table hrmm.teams enable row level security;
alter table hrmm.team_members enable row level security;
alter table hrmm.team_compare_config enable row level security;

revoke all on hrmm.teams, hrmm.team_members, hrmm.team_compare_config from anon, authenticated;

create or replace function hrmm.get_team_baseline(p_secret text)
returns table (
  member_id uuid, team_id uuid, team_name text, normalized_team text, source_key text,
  source_row_number integer, member_name text, normalized_member text, contact text,
  normalized_phone text, category text, company_name text, normalized_company text,
  commission_rate numeric, power_usage_kw numeric
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_secret is null or not exists (
    select 1 from hrmm.team_compare_config config
    where config.singleton
      and config.secret_hash = encode(extensions.digest(p_secret, 'sha256'), 'hex')
  ) then
    raise exception 'comparison access denied' using errcode = '42501';
  end if;

  return query
  select member.id, team.id, team.team_name, team.normalized_name, member.source_key,
    member.source_row_number, member.member_name, member.normalized_name, member.contact,
    member.normalized_phone, member.category, member.company_name, member.normalized_company,
    member.commission_rate, member.power_usage_kw
  from hrmm.team_members member
  join hrmm.teams team on team.id = member.team_id
  where team.is_active
  order by member.source_row_number;
end;
$$;

revoke all on function hrmm.get_team_baseline(text) from public;
grant execute on function hrmm.get_team_baseline(text) to anon, authenticated;
