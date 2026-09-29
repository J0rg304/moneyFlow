-- OPCIONAL. Crea primero un usuario en Authentication > Users.
-- Sustituye el UUID de abajo por el ID de ese usuario de PRUEBAS.
-- Ejecutar en SQL Editor. No usa auth.uid(): aquí actúas como administrador.
-- Los datos son ficticios y sus IDs permiten repetirlo sin duplicarlos.
begin;
do $$
declare
  target_user uuid := '00000000-0000-0000-0000-000000000000'; -- CAMBIAR AQUÍ
  month_start date := date_trunc('month', current_timestamp at time zone 'Europe/Madrid')::date;
begin
  if not exists (select 1 from auth.users where id = target_user) then
    raise exception 'Sustituye target_user por un UUID real de Authentication > Users';
  end if;

  insert into public.movements (user_id, id, type, amount_cents, category, date, note) values
    (target_user, 'sample-income', 'income', 180000, 'Nómina', month_start, 'Nómina de ejemplo'),
    (target_user, 'sample-groceries', 'expense', 4250, 'Alimentación', month_start, 'Compra de ejemplo')
    on conflict (user_id, id) do nothing;

  insert into public.budgets (user_id, id, month, category, limit_cents)
    values (target_user, to_char(month_start, 'YYYY-MM') || ':Alimentación', to_char(month_start, 'YYYY-MM'), 'Alimentación', 30000)
    on conflict do nothing;

  insert into public.recurring (user_id, id, name, amount_cents, category, interval, next_date, anchor_day)
    values (target_user, 'sample-gym', 'Gimnasio de ejemplo', 3000, 'Salud', 'monthly', month_start, 1)
    on conflict (user_id, id) do nothing;
end;
$$;
commit;
