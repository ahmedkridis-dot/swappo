-- ============================================================
-- 041_email_dispatch_without_service_key.sql
-- Transactional emails were silently skipped: the dispatch trigger (013)
-- reads the service-role key from Vault ('swappo_service_role_key') and
-- no-ops when it is missing — which it was. send-swap-email is deployed
-- with --no-verify-jwt and uses its own env key for the database, so the
-- bearer only needs to be a valid Supabase key: fall back to the public
-- anon key (stored in Vault as 'swappo_anon_key', same value as the one
-- shipped in js/supabase.js).
-- ============================================================
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'swappo_anon_key') then
    perform vault.create_secret('sb_publishable_aNOfDT5NUGDTN0HH5-uLuA_b58nEslu', 'swappo_anon_key', 'Public anon key — bearer for the email dispatch');
  end if;
end $$;

create or replace function public._swappo_anon_key()
returns text
language plpgsql
stable
security definer
set search_path = public, vault, pg_temp
as $$
declare v_key text;
begin
  begin
    select decrypted_secret into v_key from vault.decrypted_secrets
      where name = 'swappo_anon_key' limit 1;
  exception when others then v_key := null;
  end;
  return v_key;
end;
$$;

create or replace function public.notifications_email_dispatch()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_url text := public._swappo_email_fn_url();
  v_key text := coalesce(public._swappo_service_role_key(), public._swappo_anon_key());
begin
  if v_url is null or v_key is null then return new; end if;
  if new.kind not in ('swap_proposed', 'offer_received',
                      'swap_accepted', 'swap_declined',
                      'counter_offer', 'quota_low', 'banned') then
    return new;
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := jsonb_build_object('notification_id', new.id)
  );
  return new;
end;
$$;

-- Re-send today's 'banned' notice (skipped while the key was missing).
do $$
declare r record; v_url text := public._swappo_email_fn_url(); v_key text := coalesce(public._swappo_service_role_key(), public._swappo_anon_key());
begin
  if v_url is null or v_key is null then return; end if;
  for r in select id from public.notifications where kind = 'banned' and created_at > now() - interval '1 day' loop
    perform net.http_post(url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
      body := jsonb_build_object('notification_id', r.id));
  end loop;
end $$;
