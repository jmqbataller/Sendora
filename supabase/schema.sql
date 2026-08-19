-- Sendora database + storage setup
-- Run this in the Supabase SQL editor for a new or existing project.

create extension if not exists pgcrypto;

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  share_code text not null,
  position integer not null default 0 check (position >= 0),
  original_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null check (size_bytes > 0),
  storage_path text unique not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_downloads integer null check (max_downloads is null or max_downloads > 0),
  download_count integer not null default 0 check (download_count >= 0)
);

-- Upgrade existing Sendora projects created before multi-file sharing.
alter table public.files add column if not exists share_code text;
alter table public.files add column if not exists position integer not null default 0;
update public.files set share_code = code where share_code is null;
alter table public.files alter column share_code set not null;

create index if not exists files_code_idx on public.files(code);
create index if not exists files_share_code_idx on public.files(share_code);
create index if not exists files_expires_at_idx on public.files(expires_at);

alter table public.files enable row level security;

-- Metadata is read/written only by the server using the service role.
-- No public table policies are intentionally created.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sendora-files',
  'sendora-files',
  false,
  209715200,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = null;

-- Anonymous browser uploads are allowed into the private bucket.
-- File type is intentionally unrestricted; the 200 MB per-file cap still applies.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'anon can upload sendora files'
  ) then
    create policy "anon can upload sendora files"
    on storage.objects for insert
    to anon
    with check (bucket_id = 'sendora-files');
  end if;
end $$;

-- No public SELECT policy: files cannot be read directly with the anon key.
