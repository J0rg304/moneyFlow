-- Ejecutar DESPUÉS de 01_schema.sql. Se puede repetir.
-- Permite exportación coherente e importación completa en una transacción.
begin;
create or replace function public.export_moneyflow()
returns jsonb language plpgsql stable security invoker set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión' using errcode='42501'; end if;
  return jsonb_build_object(
    'version',2,
    'movements',coalesce((select jsonb_agg(jsonb_build_object('id',id,'type',type,'amountCents',amount_cents,'category',category,'date',to_char(date,'YYYY-MM-DD'),'note',note) order by date,id) from public.movements where user_id=auth.uid()),'[]'::jsonb),
    'budgets',coalesce((select jsonb_agg(jsonb_build_object('id',month||':'||category,'month',month,'category',category,'limitCents',limit_cents) order by month,category) from public.budgets where user_id=auth.uid()),'[]'::jsonb),
    'recurring',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'amountCents',amount_cents,'category',category,'interval',interval,'nextDate',to_char(next_date,'YYYY-MM-DD'),'anchorDay',anchor_day,'active',active) order by next_date,id) from public.recurring where user_id=auth.uid()),'[]'::jsonb)
  );
end;
$$;

create or replace function public.restore_moneyflow(p_backup jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión' using errcode='42501'; end if;
  if p_backup is null or jsonb_typeof(p_backup) <> 'object'
    or (p_backup->>'version') is distinct from '2'
    or jsonb_typeof(p_backup->'movements') is distinct from 'array'
    or jsonb_typeof(p_backup->'budgets') is distinct from 'array'
    or jsonb_typeof(p_backup->'recurring') is distinct from 'array' then
      raise exception 'Formato de copia inválido' using errcode='22023';
  end if;
  if octet_length(p_backup::text)>10000000 then raise exception 'Copia demasiado grande' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_backup->'movements') r where
    jsonb_typeof(r) <> 'object' or coalesce(r->>'amountCents','') !~ '^[0-9]+$' or coalesce(r->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
    or exists(select 1 from jsonb_array_elements(p_backup->'budgets') r where
    jsonb_typeof(r) <> 'object' or coalesce(r->>'limitCents','') !~ '^[0-9]+$')
    or exists(select 1 from jsonb_array_elements(p_backup->'recurring') r where
    jsonb_typeof(r) <> 'object' or coalesce(r->>'amountCents','') !~ '^[0-9]+$' or coalesce(r->>'anchorDay','') !~ '^[0-9]+$' or jsonb_typeof(r->'active') is distinct from 'boolean' or coalesce(r->>'nextDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then
      raise exception 'La copia contiene campos inválidos' using errcode='22023';
  end if;
  -- Toda excepción de conversión o constraint revierte también los DELETE.
  -- El propietario siempre procede de la sesión, nunca del JSON.
  delete from public.movements where user_id=auth.uid();
  delete from public.budgets where user_id=auth.uid();
  delete from public.recurring where user_id=auth.uid();
  insert into public.movements(user_id,id,type,amount_cents,category,date,note)
    select auth.uid(),id,type,"amountCents",category,date::date,note
    from jsonb_to_recordset(p_backup->'movements') as r(id text,type text,"amountCents" bigint,category text,date text,note text);
  insert into public.budgets(user_id,id,month,category,limit_cents)
    select auth.uid(),month||':'||category,month,category,"limitCents"
    from jsonb_to_recordset(p_backup->'budgets') as r(month text,category text,"limitCents" bigint);
  insert into public.recurring(user_id,id,name,amount_cents,category,interval,next_date,anchor_day,active)
    select auth.uid(),id,name,"amountCents",category,interval,"nextDate"::date,"anchorDay",active
    from jsonb_to_recordset(p_backup->'recurring') as r(id text,name text,"amountCents" bigint,category text,interval text,"nextDate" text,"anchorDay" smallint,active boolean);
end;
$$;
revoke all on function public.export_moneyflow() from public,anon,authenticated;
revoke all on function public.restore_moneyflow(jsonb) from public,anon,authenticated;
grant execute on function public.export_moneyflow() to authenticated;
grant execute on function public.restore_moneyflow(jsonb) to authenticated;
commit;
