-- Funciones auxiliares de permisos. Viven en el esquema private (no expuesto por la API),
-- son SECURITY DEFINER para no recursar en RLS y usan search_path vacío por seguridad.

create or replace function private.uid()
returns uuid
language sql stable
as $$ select auth.uid() $$;

create or replace function private.has_role(p_school uuid, p_role public.member_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.school_id = p_school and m.user_id = (select auth.uid()) and m.role = p_role
  );
$$;

create or replace function private.is_member(p_school uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.school_id = p_school and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_staff(p_school uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.school_id = p_school and m.user_id = (select auth.uid())
      and m.role in ('director', 'teacher')
  );
$$;

create or replace function private.is_director(p_school uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select private.has_role(p_school, 'director'); $$;

create or replace function private.teaches_group(p_group uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.teaching_assignments ta
    where ta.group_id = p_group and ta.teacher_id = (select auth.uid())
  );
$$;

create or replace function private.teaches_group_subject(p_group uuid, p_subject uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.teaching_assignments ta
    where ta.group_id = p_group and ta.subject_id = p_subject and ta.teacher_id = (select auth.uid())
  );
$$;

create or replace function private.teaches_student(p_student uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.teaching_assignments ta on ta.group_id = e.group_id
    where e.student_id = p_student and ta.teacher_id = (select auth.uid())
  );
$$;

create or replace function private.teaches_student_subject(p_student uuid, p_subject uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.teaching_assignments ta on ta.group_id = e.group_id
    where e.student_id = p_student and ta.subject_id = p_subject and ta.teacher_id = (select auth.uid())
  );
$$;

-- Consentimiento vigente: aceptó la versión actual del aviso de privacidad de la escuela.
create or replace function private.has_consent(p_school uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.consents c
    join public.schools s on s.id = c.school_id
    where c.school_id = p_school and c.user_id = (select auth.uid())
      and c.notice_version = s.privacy_notice_version
  );
$$;

-- Un tutor solo ve a su hijo si está ligado a él Y ya aceptó el aviso vigente.
create or replace function private.is_guardian_of(p_student uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.student_guardians sg
    where sg.student_id = p_student and sg.guardian_id = (select auth.uid())
      and private.has_consent(sg.school_id)
  );
$$;

create or replace function private.student_school(p_student uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$ select s.school_id from public.students s where s.id = p_student; $$;

create or replace function private.group_school(p_group uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$ select g.school_id from public.groups g where g.id = p_group; $$;

create or replace function private.can_view_student(p_student uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_director(private.student_school(p_student))
      or private.teaches_student(p_student)
      or private.is_guardian_of(p_student);
$$;

create or replace function private.is_staff_for_student(p_student uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_director(private.student_school(p_student))
      or private.teaches_student(p_student);
$$;

-- Personal ve perfiles de su escuela; un tutor ve su propio perfil y el del personal.
create or replace function private.can_view_profile(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_user = (select auth.uid())
    or exists (
      select 1
      from public.memberships me
      join public.memberships them on them.school_id = me.school_id
      where me.user_id = (select auth.uid()) and them.user_id = p_user
        and (me.role in ('director', 'teacher') or them.role in ('director', 'teacher'))
    );
$$;

create or replace function private.can_edit_assignment(p_assignment uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = p_assignment
      and (private.is_director(a.school_id) or private.teaches_group_subject(a.group_id, a.subject_id))
  );
$$;

create or replace function private.is_enrolled_in_group(p_student uuid, p_group uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e where e.student_id = p_student and e.group_id = p_group
  );
$$;

create or replace function private.case_student(p_case uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$ select c.student_id from public.cases c where c.id = p_case; $$;

grant usage on schema private to authenticated, service_role;
grant execute on all functions in schema private to authenticated, service_role;
revoke execute on all functions in schema private from anon, public;
