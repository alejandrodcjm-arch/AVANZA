-- Tareas programadas (Supabase Cron = pg_cron + pg_net). Horarios en UTC.
-- Durango no tiene horario de verano desde 2022: hora local = UTC - 6.
-- La IA y el envío de avisos viven en la app (rutas /api/cron/* en Vercel, Node.js).
-- pg_net las llama con la URL de la app y un secreto compartido guardados en Vault:
--   select vault.create_secret('https://app.tudominio.mx', 'app_url');
--   select vault.create_secret('<el mismo CRON_SECRET de Vercel>', 'cron_secret');
-- En la base local de pruebas no existe pg_cron: esta migración no hace nada ahí.

do $outer$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron no disponible: se omiten las tareas programadas';
    return;
  end if;

  create extension if not exists pg_cron;
  create extension if not exists pg_net;

  -- Llama una ruta /api/cron/* de la app con el secreto compartido.
  create or replace function private.call_app(p_route text, p_body jsonb default '{}'::jsonb)
  returns bigint language plpgsql security definer set search_path = '' as $f$
  declare v_url text; v_secret text; v_id bigint;
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'app_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
    if v_url is null or v_secret is null then
      raise warning 'Faltan los secretos app_url / cron_secret en Vault';
      return null;
    end if;
    select net.http_post(
      url := v_url || '/api/cron/' || p_route,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
      body := p_body,
      timeout_milliseconds := 60000) into v_id;
    return v_id;
  end $f$;
  revoke execute on function private.call_app(text, jsonb) from public, anon, authenticated;

  -- 07:00 Durango, lunes a viernes: alertas del día (para que el maestro las vea al llegar).
  perform cron.schedule('alertas-diarias', '0 13 * * 1-5', $$ select private.evaluate_alerts() $$);

  -- Viernes 16:00 Durango: resumen semanal a papás (llega cuando ya salieron de trabajar).
  perform cron.schedule('resumen-semanal', '0 22 * * 5', $$ select private.build_weekly_digests() $$);

  -- Día 1 de cada mes, 06:00 Durango: preparar resúmenes del mes anterior.
  perform cron.schedule('preparar-resumenes', '0 12 1 * *',
    $$ select private.prepare_monthly_summaries((date_trunc('month', current_date) - interval '1 month')::date) $$);

  -- Cada 10 minutos: la IA redacta los borradores pendientes (por lotes).
  perform cron.schedule('redactar-resumenes', '*/10 * * * *', $$ select private.call_app('generate-summaries') $$);

  -- Cada 2 minutos: enviar notificaciones pendientes (push y respaldo por correo).
  perform cron.schedule('enviar-avisos', '*/2 * * * *', $$ select private.call_app('send-notifications') $$);

  -- Domingo 03:00 Durango: limpiar invitaciones vencidas (las suscripciones push muertas se borran al enviar).
  perform cron.schedule('limpieza-semanal', '0 9 * * 0', $$
    delete from public.guardian_invitations where accepted_at is null and expires_at < now() - interval '30 days';
  $$);
end $outer$;
