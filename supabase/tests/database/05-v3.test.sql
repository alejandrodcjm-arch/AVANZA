-- Versión 3: calendario, horarios, colegiaturas y calendario suscrito.
begin;
set local search_path = public, extensions, tests;
select no_plan();

select tests.create_user('dir_c'), tests.create_user('maestra_c'), tests.create_user('maestro_b'),
       tests.create_user('papa_c'), tests.create_user('mama_c'), tests.create_user('dir_otra_c');

insert into schools (id, name, privacy_notice_version) values
  ('00000000-0000-0000-0000-0000000003a0', 'Escuela V3', 'v1'), ('00000000-0000-0000-0000-0000000003b0', 'Otra V3', 'v1');
insert into memberships (school_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000003a0', tests.uid('dir_c'), 'director'),
  ('00000000-0000-0000-0000-0000000003a0', tests.uid('maestra_c'), 'teacher'),
  ('00000000-0000-0000-0000-0000000003a0', tests.uid('maestro_b'), 'teacher'),
  ('00000000-0000-0000-0000-0000000003a0', tests.uid('papa_c'), 'guardian'),
  ('00000000-0000-0000-0000-0000000003a0', tests.uid('mama_c'), 'guardian'),
  ('00000000-0000-0000-0000-0000000003b0', tests.uid('dir_otra_c'), 'director');
insert into school_years (id, school_id, name, starts_on, ends_on, is_current) values
  ('00000000-0000-0000-0000-0000000003a1', '00000000-0000-0000-0000-0000000003a0', '2026-2027', '2026-08-31', '2027-07-15', true),
  ('00000000-0000-0000-0000-0000000003b1', '00000000-0000-0000-0000-0000000003b0', '2026-2027', '2026-08-31', '2027-07-15', true);
insert into subjects (id, school_id, name) values
  ('00000000-0000-0000-0000-0000000003a3', '00000000-0000-0000-0000-0000000003a0', 'Matemáticas'),
  ('00000000-0000-0000-0000-0000000003a4', '00000000-0000-0000-0000-0000000003a0', 'Español'),
  ('00000000-0000-0000-0000-0000000003b3', '00000000-0000-0000-0000-0000000003b0', 'Matemáticas');
insert into groups (id, school_id, school_year_id, grade, name) values
  ('00000000-0000-0000-0000-0000000003a5', '00000000-0000-0000-0000-0000000003a0', '00000000-0000-0000-0000-0000000003a1', 5, 'A'),
  ('00000000-0000-0000-0000-0000000003a6', '00000000-0000-0000-0000-0000000003a0', '00000000-0000-0000-0000-0000000003a1', 5, 'B');
insert into teaching_assignments (school_id, group_id, subject_id, teacher_id, is_homeroom) values
  ('00000000-0000-0000-0000-0000000003a0', '00000000-0000-0000-0000-0000000003a5', '00000000-0000-0000-0000-0000000003a3', tests.uid('maestra_c'), true),
  ('00000000-0000-0000-0000-0000000003a0', '00000000-0000-0000-0000-0000000003a6', '00000000-0000-0000-0000-0000000003a3', tests.uid('maestro_b'), true);
insert into students (id, school_id, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000003c1', '00000000-0000-0000-0000-0000000003a0', 'Pablo', 'Ríos'),
  ('00000000-0000-0000-0000-0000000003c2', '00000000-0000-0000-0000-0000000003a0', 'Rosa', 'León'),
  ('00000000-0000-0000-0000-0000000003c3', '00000000-0000-0000-0000-0000000003a0', 'Teo', 'Mar'),
  ('00000000-0000-0000-0000-0000000003d1', '00000000-0000-0000-0000-0000000003b0', 'Ajeno', 'Otro');
insert into enrollments (school_id, student_id, group_id, school_year_id) values
  ('00000000-0000-0000-0000-0000000003a0', '00000000-0000-0000-0000-0000000003c1', '00000000-0000-0000-0000-0000000003a5', '00000000-0000-0000-0000-0000000003a1'),
  ('00000000-0000-0000-0000-0000000003a0', '00000000-0000-0000-0000-0000000003c2', '00000000-0000-0000-0000-0000000003a5', '00000000-0000-0000-0000-0000000003a1'),
  ('00000000-0000-0000-0000-0000000003a0', '00000000-0000-0000-0000-0000000003c3', '00000000-0000-0000-0000-0000000003a6', '00000000-0000-0000-0000-0000000003a1');
insert into student_guardians (school_id, student_id, guardian_id, relationship) values
  ('00000000-0000-0000-0000-0000000003a0', '00000000-0000-0000-0000-0000000003c1', tests.uid('papa_c'), 'padre'),
  ('00000000-0000-0000-0000-0000000003a0', '00000000-0000-0000-0000-0000000003c2', tests.uid('mama_c'), 'madre');
insert into consents (school_id, user_id, notice_version) values ('00000000-0000-0000-0000-0000000003a0', tests.uid('papa_c'), 'v1');

-- Calendario --------------------------------------------------------------------------------
select tests.login('dir_c');
select is(load_sep_calendar('00000000-0000-0000-0000-0000000003a0'), 23, 'dirección carga el calendario SEP 2026-2027');
select is(load_sep_calendar('00000000-0000-0000-0000-0000000003a0'), 0, 'cargarlo otra vez no duplica');
insert into calendar_events (school_id, group_id, kind, title, starts_on, ends_on, created_by) values
  ('00000000-0000-0000-0000-0000000003a0', '00000000-0000-0000-0000-0000000003a6', 'evento', 'Excursión 5B', '2026-12-10', '2026-12-10', tests.uid('dir_c'));
select tests.logout();

select tests.login('dir_otra_c');
select throws_ok($$ select load_sep_calendar('00000000-0000-0000-0000-0000000003a0') $$, '42501', null, 'otra escuela no puede cargar calendario ajeno');
select is((select count(*) from calendar_events where school_id = '00000000-0000-0000-0000-0000000003a0')::int, 0, 'otra escuela no ve eventos ajenos');
select tests.logout();

select tests.login('maestra_c');
select lives_ok($$ insert into calendar_events (school_id, group_id, subject_id, kind, title, starts_on, ends_on, created_by)
  values ('00000000-0000-0000-0000-0000000003a0', '00000000-0000-0000-0000-0000000003a5', '00000000-0000-0000-0000-0000000003a3',
          'examen', 'Examen de fracciones', '2026-12-08', '2026-12-08', tests.uid('maestra_c')) $$, 'la maestra agenda un examen de su grupo');
select throws_ok($$ insert into calendar_events (school_id, group_id, kind, title, starts_on, ends_on, created_by)
  values ('00000000-0000-0000-0000-0000000003a0', null, 'sin_clases', 'Puente inventado', '2026-12-09', '2026-12-09', tests.uid('maestra_c')) $$,
  '42501', null, 'la maestra no puede suspender clases de toda la escuela');
select throws_ok($$ insert into calendar_events (school_id, group_id, kind, title, starts_on, ends_on, created_by)
  values ('00000000-0000-0000-0000-0000000003a0', '00000000-0000-0000-0000-0000000003a6', 'examen', 'Examen ajeno', '2026-12-09', '2026-12-09', tests.uid('maestra_c')) $$,
  '42501', null, 'ni agendar en un grupo que no tiene');
select ok((select count(*) from calendar_events where staff_only) = 3, 'el personal ve las fechas internas (registro de calificaciones)');
select is((select count(*) from calendar_events where title = 'Excursión 5B')::int, 0, 'no ve eventos de otro grupo');
delete from calendar_events where source = 'sep';
select tests.logout();
select is((select count(*) from calendar_events where source = 'sep' and school_id = '00000000-0000-0000-0000-0000000003a0')::int, 23,
          'la maestra no puede borrar el calendario oficial');

select tests.login('papa_c');
select is((select count(*) from calendar_events where staff_only)::int, 0, 'la familia no ve fechas internas');
select is((select count(*) from calendar_events where title = 'Examen de fracciones')::int, 1, 'la familia ve el examen del grupo de su hijo');
select is((select count(*) from calendar_events where title = 'Excursión 5B')::int, 0, 'y no los de otros grupos');
select ok((select count(*) from calendar_events where group_id is null) >= 18, 've el calendario general');
select tests.logout();

select tests.login('mama_c');
select is((select count(*) from calendar_events)::int, 0, 'sin aviso de privacidad aceptado no ve el calendario');
select tests.logout();

-- Avisar a las familias -----------------------------------------------------------------
create temp table exam on commit drop as select id from calendar_events where title = 'Examen de fracciones' and school_id = '00000000-0000-0000-0000-0000000003a0';
grant select on exam to authenticated;
select tests.login('maestro_b');
select throws_ok($$ select announce_event((select id from exam)) $$, '42501', null,
  'un maestro no avisa eventos de grupos ajenos');
select tests.logout();
select tests.login('maestra_c');
select is(announce_event((select id from exam)), 1, 'la maestra avisa a las familias de su grupo con aviso aceptado');
select throws_ok($$ select announce_event((select id from exam)) $$, '22023', null, 'solo se avisa una vez');
select tests.logout();
select is((select body from notifications where user_id = tests.uid('papa_c') and title = 'Examen de fracciones'), 'Fecha: 08/12.', 'el aviso dice la fecha');
delete from notifications where user_id = tests.uid('papa_c');

-- Horarios ----------------------------------------------------------------------------------
select tests.login('dir_c');
select is(replace_schedule('00000000-0000-0000-0000-0000000003a5', $$[
  {"weekday":1,"starts_at":"08:00","ends_at":"09:00","subject_id":"00000000-0000-0000-0000-0000000003a3"},
  {"weekday":1,"starts_at":"09:00","ends_at":"09:30","label":"Recreo"},
  {"weekday":2,"starts_at":"08:00","ends_at":"09:00","subject_id":"00000000-0000-0000-0000-0000000003a4","room":"Aula 3"}]$$::jsonb), 3,
  'dirección guarda el horario de 5A');
select throws_ok($$ select replace_schedule('00000000-0000-0000-0000-0000000003a5', '[
  {"weekday":1,"starts_at":"08:00","ends_at":"09:00","label":"A"},{"weekday":1,"starts_at":"08:30","ends_at":"09:30","label":"B"}]'::jsonb) $$,
  '22023', null, 'no acepta clases encimadas');
select throws_ok($$ select replace_schedule('00000000-0000-0000-0000-0000000003a5', '[
  {"weekday":1,"starts_at":"08:00","ends_at":"09:00","subject_id":"00000000-0000-0000-0000-0000000003b3"}]'::jsonb) $$,
  '42501', null, 'ni materias de otra escuela');
select is((select count(*) from schedule_blocks where group_id = '00000000-0000-0000-0000-0000000003a5')::int, 3, 'un error no borra el horario anterior');
select replace_schedule('00000000-0000-0000-0000-0000000003a6', '[{"weekday":3,"starts_at":"08:00","ends_at":"09:00","subject_id":"00000000-0000-0000-0000-0000000003a3"}]'::jsonb);
select tests.logout();

select tests.login('maestra_c');
select throws_ok($$ select replace_schedule('00000000-0000-0000-0000-0000000003a5', '[]'::jsonb) $$, '42501', null, 'la maestra no cambia horarios');
select is((select count(*) from schedule_blocks where group_id = '00000000-0000-0000-0000-0000000003a5')::int, 3, 'pero ve el de su grupo');
select tests.logout();

select tests.login('papa_c');
select is((select count(*) from schedule_blocks)::int, 3, 'la familia ve solo el horario del grupo de su hijo');
select tests.logout();
select tests.login('mama_c');
select is((select count(*) from schedule_blocks)::int, 0, 'sin aviso aceptado no ve horarios');
select tests.logout();

-- Colegiaturas ------------------------------------------------------------------------------
select tests.login('dir_c');
select is(import_tuition('00000000-0000-0000-0000-0000000003a0', jsonb_build_array(
    jsonb_build_object('student_id', '00000000-0000-0000-0000-0000000003c1', 'concept', 'Colegiatura diciembre', 'amount', 3500, 'paid', 0, 'due_on', current_date + 2),
    jsonb_build_object('student_id', '00000000-0000-0000-0000-0000000003c1', 'concept', 'Colegiatura noviembre', 'amount', 3500, 'paid', 0, 'due_on', current_date - 6),
    jsonb_build_object('student_id', '00000000-0000-0000-0000-0000000003c2', 'concept', 'Colegiatura diciembre', 'amount', 3500, 'paid', 0, 'due_on', current_date + 2),
    jsonb_build_object('student_id', '00000000-0000-0000-0000-0000000003c3', 'concept', 'Colegiatura diciembre', 'amount', 3500, 'paid', 3500, 'due_on', current_date + 2))),
  '{"created": 4, "updated": 0}'::jsonb, 'dirección importa el estado de cuenta');
select is(import_tuition('00000000-0000-0000-0000-0000000003a0', jsonb_build_array(
    jsonb_build_object('student_id', '00000000-0000-0000-0000-0000000003c3', 'concept', 'Colegiatura diciembre', 'amount', 3500, 'paid', 3500, 'due_on', current_date + 2))),
  '{"created": 0, "updated": 1}'::jsonb, 'volver a subir el archivo actualiza sin duplicar');
select is((select paid_on from tuition_charges where student_id = '00000000-0000-0000-0000-0000000003c3'), current_date, 'lo pagado completo queda con fecha de pago');
select throws_ok($$ select import_tuition('00000000-0000-0000-0000-0000000003a0', jsonb_build_array(
    jsonb_build_object('student_id', '00000000-0000-0000-0000-0000000003d1', 'concept', 'X', 'amount', 10, 'due_on', current_date))) $$,
  '42501', null, 'no acepta alumnos de otra escuela');

select is((tuition_report('00000000-0000-0000-0000-0000000003a0') ->> 'overdue_students')::int, 1, 'dirección ve cuántas familias tienen pagos vencidos');
select is((tuition_report('00000000-0000-0000-0000-0000000003a0') -> 'overdue' -> 0 ->> 'owed')::numeric, 3500::numeric, 'y cuánto deben, solo en su reporte privado');
select tests.logout();
select tests.login('maestra_c');
select throws_ok($$ select tuition_report('00000000-0000-0000-0000-0000000003a0') $$, '42501', null, 'los maestros no ven el reporte de cobranza');
select is((select count(*) from tuition_charges)::int, 0, 'los maestros no ven pagos');
select throws_ok($$ select import_tuition('00000000-0000-0000-0000-0000000003a0', '[]'::jsonb) $$, '42501', null, 'ni pueden importarlos');
select tests.logout();

select tests.login('papa_c');
select is((select count(*) from tuition_charges)::int, 2, 'la familia ve solo los cargos de su hijo');
update tuition_charges set paid = amount;
select tests.logout();
select is((select sum(paid) from tuition_charges where student_id = '00000000-0000-0000-0000-0000000003c1')::int, 0, 'la familia no puede marcarse como pagada');

select tests.login('mama_c');
select is((select count(*) from tuition_charges)::int, 0, 'sin aviso aceptado no ve pagos');
select tests.logout();

select ok(private.tuition_reminders(current_date) >= 3, 'corre el recordatorio diario');
select is((select count(*) from tuition_charges where school_id = '00000000-0000-0000-0000-0000000003a0'
           and (reminded_at is not null or overdue_notified_at is not null))::int, 3, 'recordatorios: 2 próximos y 1 vencido (lo pagado no se recuerda)');
select is((select count(*) from notifications where user_id = tests.uid('papa_c') and title like 'Próximo pago:%')::int, 1, 'la familia recibe el recordatorio');
select is((select count(*) from notifications where user_id = tests.uid('papa_c') and title like 'Pago pendiente:%')::int, 1, 'y un solo aviso del pago vencido');
select is((select count(*) from notifications where user_id = tests.uid('papa_c') and (body ~ '\$|3500|3,500'))::int, 0, 'sin montos en la notificación');
select is((select count(*) from notifications where user_id = tests.uid('mama_c'))::int, 0, 'sin aviso aceptado no se le notifica');
select private.tuition_reminders(current_date);
select is((select count(*) from notifications where user_id = tests.uid('papa_c'))::int, 2, 'no se repite el recordatorio');

-- Calendario suscrito -----------------------------------------------------------------------
select tests.login('papa_c');
select is(length(rotate_calendar_feed()), 64, 'cada persona tiene su enlace secreto');
select is((select count(*) from calendar_feeds)::int, 1, 'y solo ve el suyo');
select throws_ok($$ select calendar_feed((select token from calendar_feeds)) $$, '42501', null, 'la app no puede leer el calendario con la sesión de usuario');
create temp table papa_token on commit drop as select token from calendar_feeds;
select tests.logout();

insert into calendar_events (school_id, kind, title, starts_on, ends_on) values
  ('00000000-0000-0000-0000-0000000003a0', 'junta', 'Junta próxima', current_date + 10, current_date + 10);
select is((select count(*) from jsonb_array_elements(calendar_feed((select token from papa_token)) -> 'events') e
           where e ->> 'title' = 'Junta próxima')::int, 1, 'el calendario suscrito trae los eventos de la escuela');
select is((select count(*) from jsonb_array_elements(calendar_feed((select token from papa_token)) -> 'events') e
           where e ->> 'title' in ('Excursión 5B', 'Registro de calificaciones (SEP)'))::int, 0, 'sin eventos de otros grupos ni fechas internas');
select is(jsonb_array_length(calendar_feed((select token from papa_token)) -> 'payments'), 2, 'con las fechas de pago de su hijo');
select is((select count(*) from jsonb_array_elements(calendar_feed((select token from papa_token)) -> 'payments') p where p ? 'amount' or p ? 'paid')::int, 0,
          'sin montos ni estado de pago');
select is(jsonb_array_length(calendar_feed((select token from papa_token)) -> 'classes'), 0, 'la familia no recibe el horario de clases como eventos');
select is(calendar_feed('no-existe'), null, 'un enlace inválido no trae nada');

select tests.login('maestra_c');
create temp table maestra_token on commit drop as select rotate_calendar_feed() as token;
select tests.logout();
select is(jsonb_array_length(calendar_feed((select token from maestra_token)) -> 'classes'), 1, 'la maestra recibe sus clases');
select ok((select count(*) from jsonb_array_elements(calendar_feed((select token from maestra_token)) -> 'events') e where e ->> 'title' like 'Registro de%') = 3,
          'y las fechas internas');
select is(calendar_feed((select token from maestra_token)) ->> 'year_end', '2027-07-15', 'las clases se repiten hasta el fin de ciclo');

select tests.login('papa_c');
select rotate_calendar_feed();
select tests.logout();
select is(calendar_feed((select token from papa_token)), null, 'generar un enlace nuevo invalida el anterior');

select * from finish();
rollback;
