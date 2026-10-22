-- Run once in the SQL editor of your own Supabase project.
create table if not exists public.learning_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint state_size check (octet_length(data::text) < 10485760)
);
alter table public.learning_states enable row level security;
create policy "owner reads state" on public.learning_states for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner deletes state" on public.learning_states for delete to authenticated using ((select auth.uid()) = user_id);
-- No direct INSERT/UPDATE policy: use the optimistic-concurrency RPC below.
create or replace function public.save_learning_state(p_data jsonb, p_expected_revision bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_revision bigint; v_owner uuid := auth.uid();
begin
  if v_owner is null then raise exception 'authentication required'; end if;
  if p_data->>'version' is distinct from '1' then raise exception 'invalid state'; end if;
  if p_expected_revision is null then
    insert into public.learning_states(user_id,data,revision) values(v_owner,p_data,1)
      on conflict(user_id) do nothing returning revision into v_revision;
  else
    update public.learning_states set data=p_data,revision=revision+1,updated_at=now()
      where user_id=v_owner and revision=p_expected_revision returning revision into v_revision;
  end if;
  if v_revision is null then raise exception 'SYNC_CONFLICT: download cloud version before saving'; end if;
  return v_revision;
end;
$$;
revoke all on function public.save_learning_state(jsonb,bigint) from public, anon;
grant execute on function public.save_learning_state(jsonb,bigint) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('study-private','study-private',false,15728640,array['audio/webm','audio/webm;codecs=opus','audio/ogg','audio/ogg;codecs=opus','audio/mp4','audio/wav','image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
create policy "owner reads assets" on storage.objects for select to authenticated using (bucket_id='study-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "owner uploads assets" on storage.objects for insert to authenticated with check (bucket_id='study-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "owner updates assets" on storage.objects for update to authenticated using (bucket_id='study-private' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='study-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "owner deletes assets" on storage.objects for delete to authenticated using (bucket_id='study-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
