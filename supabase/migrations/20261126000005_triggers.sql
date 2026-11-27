-- Disparadores: fechas de actualización, perfil al crear usuario, reglas de alerta por defecto,
-- bitácora de cambios e invitaciones de tutores.

-- updated_at ---------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger schools_updated before update on public.schools for each row execute function private.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function private.set_updated_at();
create trigger students_updated before update on public.students for each row execute function private.set_updated_at();
create trigger attendance_updated before update on public.attendance for each row execute function private.set_updated_at();
create trigger grades_updated before update on public.grades for each row execute function private.set_updated_at();
create trigger alert_rules_updated before update on public.alert_rules for each row execute function private.set_updated_at();

-- Perfil automático al crear un usuario de Auth ---------------------------
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Reglas de alerta por defecto (ver docs/04-guia-psicologica.md y documento de alertas) ---
-- attendance: % de días con falta en la ventana. behavior: reportes en la ventana.
-- grades: calificación menor a este valor en el periodo actual. assignments: tareas no entregadas en la ventana.
create or replace function private.create_default_alert_rules()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.alert_rules (school_id, indicator, threshold, window_days) values
    (new.id, 'attendance', 10, 30),
    (new.id, 'behavior', 2, 30),
    (new.id, 'grades', 6, 90),
    (new.id, 'assignments', 3, 30)
  on conflict (school_id, indicator) do nothing;
  return new;
end $$;

create trigger schools_default_rules
  after insert on public.schools
  for each row execute function private.create_default_alert_rules();

-- Bitácora -----------------------------------------------------------------
-- Guarda quién, qué y cuándo; nunca copia el texto de notas sensibles.
create or replace function private.audit_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb;
  meta jsonb := '{}'::jsonb;
begin
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if tg_table_name = 'grades' then
    meta := jsonb_build_object(
      'old_score', case when tg_op <> 'INSERT' then to_jsonb(old) ->> 'score' end,
      'new_score', case when tg_op <> 'DELETE' then to_jsonb(new) ->> 'score' end);
  elsif tg_table_name = 'attendance' then
    meta := jsonb_build_object(
      'date', rec ->> 'date',
      'old_status', case when tg_op <> 'INSERT' then to_jsonb(old) ->> 'status' end,
      'new_status', case when tg_op <> 'DELETE' then to_jsonb(new) ->> 'status' end);
  elsif tg_table_name = 'monthly_summaries' then
    meta := jsonb_build_object('status', rec ->> 'status', 'month', rec ->> 'month');
  end if;

  insert into public.audit_log (school_id, actor_id, action, entity, entity_id, metadata)
  values ((rec ->> 'school_id')::uuid, auth.uid(), lower(tg_op), tg_table_name, (rec ->> 'id')::uuid,
          meta || jsonb_build_object('student_id', rec ->> 'student_id'));
  return null;
end $$;

create trigger audit_attendance after insert or update or delete on public.attendance for each row execute function private.audit_change();
create trigger audit_grades after insert or update or delete on public.grades for each row execute function private.audit_change();
create trigger audit_behavior after insert or update or delete on public.behavior_reports for each row execute function private.audit_change();
create trigger audit_sensitive after insert or update or delete on public.sensitive_notes for each row execute function private.audit_change();
create trigger audit_summaries after update on public.monthly_summaries for each row execute function private.audit_change();
create trigger audit_cases after insert or update on public.cases for each row execute function private.audit_change();
create trigger audit_guardians after insert or update or delete on public.student_guardians for each row execute function private.audit_change();
create trigger audit_students after insert or update or delete on public.students for each row execute function private.audit_change();

-- Registro de consultas (lo llama el servidor al abrir una ficha) -----------
create or replace function public.log_student_view(p_student uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_view_student(p_student) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  insert into public.audit_log (school_id, actor_id, action, entity, entity_id)
  values (private.student_school(p_student), auth.uid(), 'view', 'students', p_student);
end $$;
grant execute on function public.log_student_view(uuid) to authenticated;
revoke execute on function public.log_student_view(uuid) from anon, public;

-- Aceptar invitación de tutor ----------------------------------------------
-- El tutor entra con el correo invitado (OTP) y llama esta función con el token del enlace.
create or replace function public.accept_guardian_invitation(p_token text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  inv public.guardian_invitations;
  v_user uuid := auth.uid();
  v_email text := lower(coalesce(auth.email(), ''));
begin
  if v_user is null then
    raise exception 'sesión requerida' using errcode = '42501';
  end if;

  select * into inv from public.guardian_invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if inv.id is null then
    raise exception 'invitación no válida' using errcode = 'P0002';
  end if;
  if inv.accepted_at is not null then
    raise exception 'invitación ya usada' using errcode = 'P0001';
  end if;
  if inv.expires_at < now() then
    raise exception 'invitación vencida' using errcode = 'P0001';
  end if;
  if lower(inv.email) <> v_email then
    raise exception 'la invitación es para otro correo' using errcode = '42501';
  end if;

  insert into public.memberships (school_id, user_id, role)
  values (inv.school_id, v_user, 'guardian')
  on conflict (school_id, user_id, role) do nothing;

  insert into public.student_guardians (school_id, student_id, guardian_id, relationship)
  values (inv.school_id, inv.student_id, v_user, inv.relationship)
  on conflict (student_id, guardian_id) do nothing;

  update public.profiles set full_name = inv.full_name
  where id = v_user and full_name = '' and inv.full_name <> '';

  -- Acepta de una vez las demás invitaciones vigentes del mismo correo en la escuela (hermanos).
  insert into public.student_guardians (school_id, student_id, guardian_id, relationship)
  select gi.school_id, gi.student_id, v_user, gi.relationship
  from public.guardian_invitations gi
  where gi.school_id = inv.school_id and lower(gi.email) = v_email
    and gi.accepted_at is null and gi.expires_at >= now()
  on conflict (student_id, guardian_id) do nothing;

  update public.guardian_invitations
  set accepted_at = now(), accepted_by = v_user
  where school_id = inv.school_id and lower(email) = v_email and accepted_at is null and expires_at >= now();

  return inv.school_id;
end $$;
grant execute on function public.accept_guardian_invitation(text) to authenticated;
revoke execute on function public.accept_guardian_invitation(text) from anon, public;
