-- Pruebas de permisos (docs/01-permisos.md). Escuela A con dos grupos, escuela B aparte.
begin;
set local search_path = public, extensions, tests;
select no_plan();

-- Escenario --------------------------------------------------------------
select tests.create_user('dir_a'), tests.create_user('maestra_a1'), tests.create_user('maestro_a2'),
       tests.create_user('papa_a'), tests.create_user('mama_sin_aviso'), tests.create_user('dir_b'),
       tests.create_user('papa_b'), tests.create_user('extrano');

insert into schools (id, name, privacy_notice_version) values
  ('00000000-0000-0000-0000-00000000000a', 'Escuela A', 'v1'),
  ('00000000-0000-0000-0000-00000000000b', 'Escuela B', 'v1');

insert into memberships (school_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', tests.uid('dir_a'), 'director'),
  ('00000000-0000-0000-0000-00000000000a', tests.uid('maestra_a1'), 'teacher'),
  ('00000000-0000-0000-0000-00000000000a', tests.uid('maestro_a2'), 'teacher'),
  ('00000000-0000-0000-0000-00000000000a', tests.uid('papa_a'), 'guardian'),
  ('00000000-0000-0000-0000-00000000000a', tests.uid('mama_sin_aviso'), 'guardian'),
  ('00000000-0000-0000-0000-00000000000b', tests.uid('dir_b'), 'director'),
  ('00000000-0000-0000-0000-00000000000b', tests.uid('papa_b'), 'guardian');

insert into school_years (id, school_id, name, starts_on, ends_on, is_current) values
  ('00000000-0000-0000-0000-00000000001a', '00000000-0000-0000-0000-00000000000a', '2026-2027', '2026-08-31', '2027-07-15', true),
  ('00000000-0000-0000-0000-00000000001b', '00000000-0000-0000-0000-00000000000b', '2026-2027', '2026-08-31', '2027-07-15', true);

insert into periods (id, school_id, school_year_id, name, sort, starts_on, ends_on) values
  ('00000000-0000-0000-0000-00000000002a', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000001a', 'Trimestre 1', 1, '2026-08-31', '2026-11-27'),
  ('00000000-0000-0000-0000-00000000002b', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000001b', 'Trimestre 1', 1, '2026-08-31', '2026-11-27');

insert into subjects (id, school_id, name) values
  ('00000000-0000-0000-0000-00000000003a', '00000000-0000-0000-0000-00000000000a', 'Matemáticas'),
  ('00000000-0000-0000-0000-00000000003b', '00000000-0000-0000-0000-00000000000a', 'Lenguajes'),
  ('00000000-0000-0000-0000-00000000003c', '00000000-0000-0000-0000-00000000000b', 'Matemáticas');

insert into groups (id, school_id, school_year_id, grade, name) values
  ('00000000-0000-0000-0000-00000000004a', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000001a', 3, 'A'),
  ('00000000-0000-0000-0000-00000000004b', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000001a', 3, 'B'),
  ('00000000-0000-0000-0000-00000000004c', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000001b', 3, 'A');

-- maestra_a1 da Matemáticas al 3A; maestro_a2 da Matemáticas y Lenguajes al 3B.
insert into teaching_assignments (school_id, group_id, subject_id, teacher_id, is_homeroom) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000004a', '00000000-0000-0000-0000-00000000003a', tests.uid('maestra_a1'), true),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000004b', '00000000-0000-0000-0000-00000000003a', tests.uid('maestro_a2'), true),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000004b', '00000000-0000-0000-0000-00000000003b', tests.uid('maestro_a2'), false);

insert into students (id, school_id, first_name, last_name) values
  ('00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-00000000000a', 'Sofía', 'Ramírez'),
  ('00000000-0000-0000-0000-00000000005b', '00000000-0000-0000-0000-00000000000a', 'Mateo', 'Hernández'),
  ('00000000-0000-0000-0000-00000000005c', '00000000-0000-0000-0000-00000000000a', 'Valeria', 'Soto'),
  ('00000000-0000-0000-0000-00000000005d', '00000000-0000-0000-0000-00000000000b', 'Diego', 'Luna');

insert into enrollments (school_id, student_id, group_id, school_year_id) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-00000000004a', '00000000-0000-0000-0000-00000000001a'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005b', '00000000-0000-0000-0000-00000000004a', '00000000-0000-0000-0000-00000000001a'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005c', '00000000-0000-0000-0000-00000000004b', '00000000-0000-0000-0000-00000000001a'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000005d', '00000000-0000-0000-0000-00000000004c', '00000000-0000-0000-0000-00000000001b');

insert into student_guardians (school_id, student_id, guardian_id, relationship) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a', tests.uid('papa_a'), 'padre'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005b', tests.uid('mama_sin_aviso'), 'madre'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000005d', tests.uid('papa_b'), 'padre');

insert into consents (school_id, user_id, notice_version) values
  ('00000000-0000-0000-0000-00000000000a', tests.uid('papa_a'), 'v1'),
  ('00000000-0000-0000-0000-00000000000b', tests.uid('papa_b'), 'v1');

insert into attendance (school_id, student_id, group_id, date, status) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-00000000004a', '2026-11-20', 'absent'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005c', '00000000-0000-0000-0000-00000000004b', '2026-11-20', 'present');

insert into grades (school_id, student_id, subject_id, period_id, score) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a', '00000000-0000-0000-0000-00000000003a', '00000000-0000-0000-0000-00000000002a', 7.5);

insert into sensitive_notes (school_id, student_id, body, created_by) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a', 'Nota sensible de prueba', tests.uid('maestra_a1'));
insert into observations (school_id, student_id, body, created_by) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a', 'Participa más en lectura', tests.uid('maestra_a1'));
insert into alerts (school_id, student_id, indicator, detail) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a', 'attendance', '{"pct": 12}');
insert into monthly_summaries (id, school_id, student_id, month, status) values
  ('00000000-0000-0000-0000-00000000006a', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a', '2026-11-01', 'draft');
insert into summary_drafts (summary_id, school_id, student_id, data_snapshot, draft_text) values
  ('00000000-0000-0000-0000-00000000006a', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a', '{"faltas": 1}', 'Borrador interno');

-- 0. Estructura ----------------------------------------------------------
select is((select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0,
  'RLS activo en todas las tablas de public');
select is((select count(*)::int from alert_rules where school_id = '00000000-0000-0000-0000-00000000000a'), 4,
  'cada escuela nueva recibe 4 reglas de alerta por defecto');

-- 1. Sin sesión ----------------------------------------------------------
select tests.login_anon();
select throws_ok('select count(*) from public.students', '42501', null, 'anon no puede leer alumnos');
select throws_ok('select count(*) from public.schools', '42501', null, 'anon no puede leer escuelas');
reset role;

-- 2. Director A ----------------------------------------------------------
select tests.login('dir_a');
select is((select count(*)::int from students), 3, 'director A ve los 3 alumnos de su escuela');
select is((select count(*)::int from students where school_id = '00000000-0000-0000-0000-00000000000b'), 0,
  'director A no ve alumnos de la escuela B');
select is((select count(*)::int from sensitive_notes), 1, 'director A ve notas sensibles de su escuela');
select is((select count(*)::int from audit_log), (select count(*)::int from audit_log), 'director A puede consultar la bitácora');
select is((select count(*)::int from alert_rules), 4, 'director A ve sus reglas de alerta');
reset role;

-- 3. Maestra del 3A ------------------------------------------------------
select tests.login('maestra_a1');
select is((select count(*)::int from students), 2, 'maestra del 3A ve solo a sus 2 alumnos');
select is((select count(*)::int from students where id = '00000000-0000-0000-0000-00000000005c'), 0,
  'maestra del 3A no ve a una alumna del 3B');
select lives_ok($$
  insert into attendance (school_id, student_id, group_id, date, status, recorded_by)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005b',
          '00000000-0000-0000-0000-00000000004a', '2026-11-20', 'present', auth.uid())
$$, 'maestra del 3A puede pasar lista en su grupo');
select throws_ok($$
  insert into attendance (school_id, student_id, group_id, date, status, recorded_by)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005c',
          '00000000-0000-0000-0000-00000000004b', '2026-11-21', 'absent', auth.uid())
$$, '42501', null, 'maestra del 3A no puede pasar lista en el 3B');
select throws_ok($$
  insert into attendance (school_id, student_id, group_id, date, status, recorded_by)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005c',
          '00000000-0000-0000-0000-00000000004a', '2026-11-21', 'absent', auth.uid())
$$, '42501', null, 'no se puede registrar asistencia de un alumno que no está inscrito en ese grupo');
select throws_ok($$
  insert into grades (school_id, student_id, subject_id, period_id, score, recorded_by)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005b',
          '00000000-0000-0000-0000-00000000003b', '00000000-0000-0000-0000-00000000002a', 8, auth.uid())
$$, '42501', null, 'maestra no puede calificar una materia que no imparte');
select lives_ok($$
  insert into grades (school_id, student_id, subject_id, period_id, score, recorded_by)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005b',
          '00000000-0000-0000-0000-00000000003a', '00000000-0000-0000-0000-00000000002a', 8, auth.uid())
$$, 'maestra puede calificar la materia que imparte');
select throws_ok($$
  insert into grades (school_id, student_id, subject_id, period_id, score, recorded_by)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a',
          '00000000-0000-0000-0000-00000000003a', '00000000-0000-0000-0000-00000000002a', 11, auth.uid())
$$, '23514', null, 'calificación fuera de 5 a 10 se rechaza');
select is((select count(*)::int from sensitive_notes), 1, 'maestra ve la nota sensible que ella escribió');
select is((select count(*)::int from alerts), 1, 'maestra ve las alertas de sus alumnos');
select is((select count(*)::int from summary_drafts), 1, 'maestra ve el borrador del resumen');
select throws_ok($$
  insert into alerts (school_id, student_id, indicator) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a', 'behavior')
$$, '42501', null, 'nadie crea alertas a mano desde la app');
reset role;

-- 4. Maestro del 3B ------------------------------------------------------
select tests.login('maestro_a2');
select is((select count(*)::int from students), 1, 'maestro del 3B ve solo a su alumna');
select is((select count(*)::int from sensitive_notes), 0, 'maestro del 3B no ve notas sensibles ajenas');
select is((select count(*)::int from observations), 0, 'maestro del 3B no ve observaciones de alumnos ajenos');
select is(tests.rows_affected($$update students set first_name = 'X'$$), 0,
  'un maestro no puede editar alumnos');
reset role;

-- 5. Papá con aviso aceptado ---------------------------------------------
select tests.login('papa_a');
select is((select count(*)::int from students), 1, 'papá ve solo a su hijo');
select is((select first_name from students), 'Sofía', 'el hijo que ve es el correcto');
select is((select count(*)::int from attendance), 1, 'papá ve la asistencia de su hijo');
select is((select count(*)::int from grades), 1, 'papá ve las calificaciones de su hijo');
select is((select count(*)::int from alerts), 0, 'papá no ve la señal de riesgo');
select is((select count(*)::int from observations), 0, 'papá no ve observaciones internas');
select is((select count(*)::int from sensitive_notes), 0, 'papá no ve notas sensibles');
select is((select count(*)::int from summary_drafts), 0, 'papá no ve borradores');
select is((select count(*)::int from monthly_summaries), 0, 'papá no ve resúmenes sin aprobar');
select is((select count(*)::int from memberships), 1, 'papá solo ve su propia membresía');
select is((select count(*)::int from profiles where id = tests.uid('mama_sin_aviso')), 0,
  'papá no ve el perfil de otros papás');
select is((select count(*)::int from profiles where id = tests.uid('maestra_a1')), 1,
  'papá sí ve el perfil de la maestra');
select throws_ok($$
  insert into attendance (school_id, student_id, group_id, date, status, recorded_by)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a',
          '00000000-0000-0000-0000-00000000004a', '2026-11-23', 'present', auth.uid())
$$, '42501', null, 'papá no puede capturar asistencia');
select lives_ok($$
  insert into monthly_goals (school_id, student_id, month, goal, created_by)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005a', '2026-12-01',
          'Leer 15 minutos diarios', auth.uid())
$$, 'papá puede fijar la meta del mes de su hijo');
select throws_ok($$
  insert into monthly_goals (school_id, student_id, month, goal, created_by)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005b', '2026-12-01',
          'Meta ajena', auth.uid())
$$, '42501', null, 'papá no puede fijar metas a otro niño');
reset role;

-- 6. Al aprobar el resumen, el papá lo ve --------------------------------
select tests.login('maestra_a1');
select is(tests.rows_affected($$
  update monthly_summaries set status = 'approved', final_text = 'Texto final', approved_by = auth.uid(), approved_at = now()
  where id = '00000000-0000-0000-0000-00000000006a'$$), 1,
  'la maestra aprueba el resumen');
reset role;
select tests.login('papa_a');
select is((select final_text from monthly_summaries), 'Texto final', 'papá ve el resumen aprobado');
select is((select count(*)::int from summary_drafts), 0, 'papá sigue sin ver el borrador ni los datos internos');
reset role;

-- 7. Mamá sin aviso de privacidad aceptado -------------------------------
select tests.login('mama_sin_aviso');
select is((select count(*)::int from students), 0, 'sin consentimiento no ve a su hijo');
select is((select count(*)::int from attendance), 0, 'sin consentimiento no ve asistencia');
select lives_ok($$
  insert into consents (school_id, user_id, notice_version)
  values ('00000000-0000-0000-0000-00000000000a', auth.uid(), 'v1')
$$, 'puede aceptar el aviso de privacidad');
select is((select count(*)::int from students), 1, 'al aceptar el aviso ya ve a su hijo');
select throws_ok($$
  insert into consents (school_id, user_id, notice_version)
  values ('00000000-0000-0000-0000-00000000000b', auth.uid(), 'v1')
$$, '42501', null, 'no puede registrar consentimiento en una escuela ajena');
reset role;

-- 8. Nuevo aviso: el consentimiento anterior deja de valer ----------------
update schools set privacy_notice_version = 'v2' where id = '00000000-0000-0000-0000-00000000000a';
select tests.login('papa_a');
select is((select count(*)::int from students), 0, 'con aviso nuevo, el papá debe aceptarlo otra vez');
reset role;
update schools set privacy_notice_version = 'v1' where id = '00000000-0000-0000-0000-00000000000a';

-- 9. Escuela B -----------------------------------------------------------
select tests.login('dir_b');
select is((select count(*)::int from students), 1, 'director B ve solo su alumno');
select is((select count(*)::int from attendance), 0, 'director B no ve asistencia de la escuela A');
select is((select count(*)::int from schools), 1, 'director B solo ve su escuela');
select throws_ok($$
  insert into students (school_id, first_name, last_name)
  values ('00000000-0000-0000-0000-00000000000a', 'Intruso', 'X')
$$, '42501', null, 'director B no puede crear alumnos en la escuela A');
reset role;

-- 10. Usuario sin escuela ------------------------------------------------
select tests.login('extrano');
select is((select count(*)::int from students), 0, 'un usuario sin escuela no ve alumnos');
select is((select count(*)::int from schools), 0, 'un usuario sin escuela no ve escuelas');
reset role;

-- 11. Invitación de tutor -------------------------------------------------
select tests.create_user('tia_invitada');
insert into guardian_invitations (school_id, student_id, email, full_name, relationship, token_hash) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000005c', 'tia_invitada@test.mx', 'Tía Invitada', 'tutor',
   encode(extensions.digest('token-correcto', 'sha256'), 'hex'));
select tests.login('extrano');
select throws_ok($$ select accept_guardian_invitation('token-correcto') $$, '42501', null,
  'una invitación no se puede usar con otro correo');
reset role;
select tests.login('tia_invitada');
select throws_ok($$ select accept_guardian_invitation('token-falso') $$, 'P0002', null, 'token inválido se rechaza');
select is(accept_guardian_invitation('token-correcto'), '00000000-0000-0000-0000-00000000000a'::uuid,
  'la tutora invitada acepta su invitación');
select throws_ok($$ select accept_guardian_invitation('token-correcto') $$, 'P0001', null, 'una invitación no se usa dos veces');
select is((select count(*)::int from students), 0, 'aún sin aviso aceptado no ve al alumno');
insert into consents (school_id, user_id, notice_version) values ('00000000-0000-0000-0000-00000000000a', auth.uid(), 'v1');
select is((select count(*)::int from students), 1, 'tras aceptar el aviso ve al alumno de su invitación');
reset role;

-- 12. Bitácora -----------------------------------------------------------
select ok((select count(*) from audit_log where entity = 'grades' and action = 'insert') >= 2,
  'cada calificación capturada queda en la bitácora');
select is((select count(*)::int from audit_log where entity = 'sensitive_notes' and metadata::text like '%Nota sensible%'), 0,
  'la bitácora nunca copia el texto de notas sensibles');

select * from finish();
rollback;
