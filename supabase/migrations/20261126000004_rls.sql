-- Row Level Security: implementa docs/01-permisos.md. Toda tabla de public tiene RLS.
-- Sin política = sin acceso. Las escrituras del sistema (alertas, resúmenes, bitácora)
-- se hacen con funciones SECURITY DEFINER o con la llave de servicio desde el servidor.

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    -- Sin FORCE: las funciones auxiliares SECURITY DEFINER (dueño de tablas) deben poder leer.
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- schools
create policy schools_select on public.schools for select to authenticated
  using ((select private.is_member(id)));
create policy schools_update on public.schools for update to authenticated
  using ((select private.is_director(id))) with check ((select private.is_director(id)));

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (private.can_view_profile(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- memberships
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_director(school_id));
create policy memberships_write on public.memberships for all to authenticated
  using (private.is_director(school_id)) with check (private.is_director(school_id));

-- Estructura académica: la ve cualquier miembro, la edita el director.
create policy school_years_select on public.school_years for select to authenticated using (private.is_member(school_id));
create policy school_years_write on public.school_years for all to authenticated
  using (private.is_director(school_id)) with check (private.is_director(school_id));

create policy periods_select on public.periods for select to authenticated using (private.is_member(school_id));
create policy periods_write on public.periods for all to authenticated
  using (private.is_director(school_id)) with check (private.is_director(school_id));

create policy subjects_select on public.subjects for select to authenticated using (private.is_member(school_id));
create policy subjects_write on public.subjects for all to authenticated
  using (private.is_director(school_id)) with check (private.is_director(school_id));

create policy groups_select on public.groups for select to authenticated using (private.is_member(school_id));
create policy groups_write on public.groups for all to authenticated
  using (private.is_director(school_id)) with check (private.is_director(school_id));

create policy teaching_assignments_select on public.teaching_assignments for select to authenticated
  using (private.is_member(school_id));
create policy teaching_assignments_write on public.teaching_assignments for all to authenticated
  using (private.is_director(school_id))
  with check (private.is_director(school_id) and school_id = private.group_school(group_id));

-- students
create policy students_select on public.students for select to authenticated
  using (private.can_view_student(id));
create policy students_write on public.students for all to authenticated
  using (private.is_director(school_id)) with check (private.is_director(school_id));

-- enrollments
create policy enrollments_select on public.enrollments for select to authenticated
  using (private.is_director(school_id) or private.teaches_group(group_id) or private.is_guardian_of(student_id));
create policy enrollments_write on public.enrollments for all to authenticated
  using (private.is_director(school_id))
  with check (private.is_director(school_id) and school_id = private.group_school(group_id)
              and school_id = private.student_school(student_id));

-- student_guardians
create policy student_guardians_select on public.student_guardians for select to authenticated
  using (guardian_id = (select auth.uid()) or private.is_staff_for_student(student_id));
create policy student_guardians_write on public.student_guardians for all to authenticated
  using (private.is_director(school_id))
  with check (private.is_director(school_id) and school_id = private.student_school(student_id));

-- guardian_invitations: solo el director.
create policy guardian_invitations_all on public.guardian_invitations for all to authenticated
  using (private.is_director(school_id))
  with check (private.is_director(school_id) and school_id = private.student_school(student_id));

-- attendance
create policy attendance_select on public.attendance for select to authenticated
  using (private.is_director(school_id) or private.teaches_group(group_id) or private.is_guardian_of(student_id));
create policy attendance_insert on public.attendance for insert to authenticated
  with check (
    (private.is_director(school_id) or private.teaches_group(group_id))
    and school_id = private.group_school(group_id)
    and private.is_enrolled_in_group(student_id, group_id)
    and recorded_by = (select auth.uid())
  );
create policy attendance_update on public.attendance for update to authenticated
  using (private.is_director(school_id) or private.teaches_group(group_id))
  with check (
    (private.is_director(school_id) or private.teaches_group(group_id))
    and school_id = private.group_school(group_id)
    and private.is_enrolled_in_group(student_id, group_id)
    and recorded_by = (select auth.uid())
  );
create policy attendance_delete on public.attendance for delete to authenticated
  using (private.is_director(school_id) or private.teaches_group(group_id));

-- grades
create policy grades_select on public.grades for select to authenticated
  using (private.can_view_student(student_id));
create policy grades_insert on public.grades for insert to authenticated
  with check (
    (private.is_director(school_id) or private.teaches_student_subject(student_id, subject_id))
    and school_id = private.student_school(student_id)
    and recorded_by = (select auth.uid())
  );
create policy grades_update on public.grades for update to authenticated
  using (private.is_director(school_id) or private.teaches_student_subject(student_id, subject_id))
  with check (
    (private.is_director(school_id) or private.teaches_student_subject(student_id, subject_id))
    and school_id = private.student_school(student_id)
    and recorded_by = (select auth.uid())
  );
create policy grades_delete on public.grades for delete to authenticated
  using (private.is_director(school_id) or private.teaches_student_subject(student_id, subject_id));

-- assignments
create policy assignments_select on public.assignments for select to authenticated
  using (
    private.is_director(school_id) or private.teaches_group(group_id)
    or exists (
      select 1 from public.enrollments e
      where e.group_id = assignments.group_id and private.is_guardian_of(e.student_id)
    )
  );
create policy assignments_write on public.assignments for all to authenticated
  using (private.is_director(school_id) or private.teaches_group_subject(group_id, subject_id))
  with check (
    (private.is_director(school_id) or private.teaches_group_subject(group_id, subject_id))
    and school_id = private.group_school(group_id)
  );

-- assignment_misses
create policy assignment_misses_select on public.assignment_misses for select to authenticated
  using (private.can_view_student(student_id));
create policy assignment_misses_write on public.assignment_misses for all to authenticated
  using (private.can_edit_assignment(assignment_id))
  with check (private.can_edit_assignment(assignment_id) and school_id = private.student_school(student_id));

-- behavior_reports
create policy behavior_select on public.behavior_reports for select to authenticated
  using (private.can_view_student(student_id));
create policy behavior_insert on public.behavior_reports for insert to authenticated
  with check (private.is_staff_for_student(student_id) and school_id = private.student_school(student_id)
              and created_by = (select auth.uid()));
create policy behavior_update on public.behavior_reports for update to authenticated
  using (private.is_director(school_id) or created_by = (select auth.uid()))
  with check (private.is_staff_for_student(student_id) and school_id = private.student_school(student_id));
create policy behavior_delete on public.behavior_reports for delete to authenticated
  using (private.is_director(school_id) or created_by = (select auth.uid()));

-- observations: solo personal.
create policy observations_select on public.observations for select to authenticated
  using (private.is_staff_for_student(student_id));
create policy observations_insert on public.observations for insert to authenticated
  with check (private.is_staff_for_student(student_id) and school_id = private.student_school(student_id)
              and created_by = (select auth.uid()));
create policy observations_modify on public.observations for update to authenticated
  using (private.is_director(school_id) or created_by = (select auth.uid()))
  with check (school_id = private.student_school(student_id));
create policy observations_delete on public.observations for delete to authenticated
  using (private.is_director(school_id) or created_by = (select auth.uid()));

-- sensitive_notes: director o quien la escribió.
create policy sensitive_select on public.sensitive_notes for select to authenticated
  using (private.is_director(school_id) or created_by = (select auth.uid()));
create policy sensitive_insert on public.sensitive_notes for insert to authenticated
  with check (private.is_staff_for_student(student_id) and school_id = private.student_school(student_id)
              and created_by = (select auth.uid()));
create policy sensitive_update on public.sensitive_notes for update to authenticated
  using (private.is_director(school_id) or created_by = (select auth.uid()))
  with check (school_id = private.student_school(student_id));
create policy sensitive_delete on public.sensitive_notes for delete to authenticated
  using (private.is_director(school_id) or created_by = (select auth.uid()));

-- monthly_goals: las crea el tutor; el personal las ve.
create policy goals_select on public.monthly_goals for select to authenticated
  using (private.can_view_student(student_id));
create policy goals_insert on public.monthly_goals for insert to authenticated
  with check (private.is_guardian_of(student_id) and school_id = private.student_school(student_id)
              and created_by = (select auth.uid()));
create policy goals_update on public.monthly_goals for update to authenticated
  using (private.is_guardian_of(student_id))
  with check (private.is_guardian_of(student_id) and school_id = private.student_school(student_id));
create policy goals_delete on public.monthly_goals for delete to authenticated
  using (private.is_guardian_of(student_id) and created_by = (select auth.uid()));

-- alert_rules
create policy alert_rules_select on public.alert_rules for select to authenticated using (private.is_staff(school_id));
create policy alert_rules_update on public.alert_rules for update to authenticated
  using (private.is_director(school_id)) with check (private.is_director(school_id));

-- alerts: las crea el sistema; el personal las atiende. Nunca las ve el papá.
create policy alerts_select on public.alerts for select to authenticated
  using (private.is_staff_for_student(student_id));
create policy alerts_update on public.alerts for update to authenticated
  using (private.is_staff_for_student(student_id))
  with check (private.is_staff_for_student(student_id) and school_id = private.student_school(student_id));

-- cases
create policy cases_select on public.cases for select to authenticated
  using (private.is_staff_for_student(student_id) or owner_id = (select auth.uid()));
create policy cases_insert on public.cases for insert to authenticated
  with check (private.is_staff_for_student(student_id) and school_id = private.student_school(student_id)
              and opened_by = (select auth.uid()));
create policy cases_update on public.cases for update to authenticated
  using (private.is_staff_for_student(student_id) or owner_id = (select auth.uid()))
  with check (school_id = private.student_school(student_id));

-- case_actions
create policy case_actions_select on public.case_actions for select to authenticated
  using (private.is_staff_for_student(private.case_student(case_id)) or assigned_to = (select auth.uid()));
create policy case_actions_insert on public.case_actions for insert to authenticated
  with check (private.is_staff_for_student(private.case_student(case_id))
              and school_id = private.student_school(private.case_student(case_id))
              and created_by = (select auth.uid()));
create policy case_actions_update on public.case_actions for update to authenticated
  using (private.is_director(school_id) or assigned_to = (select auth.uid()) or created_by = (select auth.uid()))
  with check (school_id = private.student_school(private.case_student(case_id)));

-- monthly_summaries: el papá solo ve los aprobados; el personal los revisa.
create policy summaries_select on public.monthly_summaries for select to authenticated
  using (private.is_staff_for_student(student_id) or (status = 'approved' and private.is_guardian_of(student_id)));
create policy summaries_update on public.monthly_summaries for update to authenticated
  using (private.is_staff_for_student(student_id))
  with check (private.is_staff_for_student(student_id) and school_id = private.student_school(student_id));

-- summary_drafts: solo personal, solo lectura (los escribe el sistema).
create policy drafts_select on public.summary_drafts for select to authenticated
  using (private.is_staff_for_student(student_id));

-- notifications: cada quien las suyas; solo puede marcarlas como leídas.
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- push_subscriptions
create policy push_all on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- consents
create policy consents_select on public.consents for select to authenticated
  using (user_id = (select auth.uid()) or private.is_director(school_id));
create policy consents_insert on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_member(school_id));

-- arco_requests
create policy arco_select on public.arco_requests for select to authenticated
  using (user_id = (select auth.uid()) or private.is_director(school_id));
create policy arco_insert on public.arco_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_member(school_id) and status = 'received');
create policy arco_update on public.arco_requests for update to authenticated
  using (private.is_director(school_id)) with check (private.is_director(school_id));

-- audit_log: solo lectura para el director.
create policy audit_select on public.audit_log for select to authenticated using (private.is_director(school_id));

-- imports
create policy imports_all on public.imports for all to authenticated
  using (private.is_director(school_id)) with check (private.is_director(school_id));

-- Privilegios: anon no toca nada de public.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage on all sequences in schema public to authenticated, service_role;
