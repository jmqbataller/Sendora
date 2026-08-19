-- Sendora database + storage setup
-- Run this in the Supabase SQL editor for a new or existing project.

create extension if not exists pgcrypto;

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  original_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null check (size_bytes > 0),
  storage_path text unique not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_downloads integer null check (max_downloads is null or max_downloads > 0),
  download_count integer not null default 0 check (download_count >= 0)
);

-- Multi-file shares are grouped by the first storage_path folder segment:
-- SHARECODE/001-file, SHARECODE/002-file, ...
-- No extra database columns are required, so older Sendora tables remain compatible.

create index if not exists files_code_idx on public.files(code);
create index if not exists files_expires_at_idx on public.files(expires_at);
create index if not exists files_storage_path_idx on public.files(storage_path);

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
