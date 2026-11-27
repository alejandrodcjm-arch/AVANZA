-- Tablas principales. Toda tabla con datos de escuela lleva school_id (llave de aislamiento).

-- Escuelas y personas -------------------------------------------------------

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 200),
  cct text,
  timezone text not null default 'America/Mexico_City',
  privacy_notice_version text not null default '2026-11',
  privacy_notice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  unique (school_id, user_id, role)
);
create index memberships_user_idx on public.memberships (user_id);
create index memberships_school_idx on public.memberships (school_id);

-- Estructura académica -----------------------------------------------------

create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on),
  unique (school_id, name)
);
create unique index school_years_one_current on public.school_years (school_id) where is_current;

create table public.periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  school_year_id uuid not null references public.school_years (id) on delete cascade,
  name text not null,
  sort smallint not null,
  starts_on date not null,
  ends_on date not null,
  check (ends_on > starts_on),
  unique (school_year_id, sort)
);
create index periods_school_idx on public.periods (school_id);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  unique (school_id, name)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  school_year_id uuid not null references public.school_years (id) on delete cascade,
  grade smallint not null check (grade between 1 and 6),
  name text not null,
  created_at timestamptz not null default now(),
  unique (school_year_id, grade, name)
);
create index groups_school_idx on public.groups (school_id);

create table public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  is_homeroom boolean not null default false,
  unique (group_id, subject_id, teacher_id)
);
create index teaching_assignments_teacher_idx on public.teaching_assignments (teacher_id);
create index teaching_assignments_group_idx on public.teaching_assignments (group_id);

-- Alumnos y tutores --------------------------------------------------------

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  second_last_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index students_school_idx on public.students (school_id);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  school_year_id uuid not null references public.school_years (id) on delete cascade,
  unique (student_id, school_year_id)
);
create index enrollments_group_idx on public.enrollments (group_id);
create index enrollments_student_idx on public.enrollments (student_id);

create table public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  relationship text not null default 'tutor' check (relationship in ('madre', 'padre', 'tutor')),
  unique (student_id, guardian_id)
);
create index student_guardians_guardian_idx on public.student_guardians (guardian_id);
create index student_guardians_student_idx on public.student_guardians (student_id);

-- Invitaciones de tutores (se aceptan desde el servidor con la llave de servicio).
create table public.guardian_invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  full_name text not null default '',
  relationship text not null default 'tutor' check (relationship in ('madre', 'padre', 'tutor')),
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '14 days',
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (student_id, email)
);
create index guardian_invitations_school_idx on public.guardian_invitations (school_id);

-- Captura del maestro ------------------------------------------------------

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  date date not null,
  status public.attendance_status not null,
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, date)
);
create index attendance_group_date_idx on public.attendance (group_id, date);
create index attendance_school_idx on public.attendance (school_id);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  period_id uuid not null references public.periods (id) on delete cascade,
  score numeric(4, 2) not null check (score between 5 and 10),
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id, period_id)
);
create index grades_student_idx on public.grades (student_id);
create index grades_school_idx on public.grades (school_id);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  due_on date not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index assignments_group_idx on public.assignments (group_id);

-- Solo se registra lo NO entregado: capturar menos.
create table public.assignment_misses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index assignment_misses_student_idx on public.assignment_misses (student_id);

create table public.behavior_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  occurred_on date not null default current_date,
  severity public.behavior_severity not null default 'minor',
  description text not null check (length(description) between 1 and 2000),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index behavior_reports_student_idx on public.behavior_reports (student_id);

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index observations_student_idx on public.observations (student_id);

-- Nunca se envían a la IA ni las ven los papás.
create table public.sensitive_notes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index sensitive_notes_student_idx on public.sensitive_notes (student_id);

-- Meta del mes elegida por el papá con su hijo.
create table public.monthly_goals (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  goal text not null check (length(goal) between 3 and 300),
  achieved boolean,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (student_id, month)
);

-- Alertas y seguimiento ----------------------------------------------------

create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  indicator public.alert_indicator not null,
  threshold numeric not null check (threshold >= 0),
  window_days integer not null default 30 check (window_days between 7 and 365),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (school_id, indicator)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  indicator public.alert_indicator not null,
  detail jsonb not null default '{}'::jsonb,
  status public.alert_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id),
  resolution_note text
);
create unique index alerts_one_open_per_indicator on public.alerts (student_id, indicator) where status = 'open';
create index alerts_school_status_idx on public.alerts (school_id, status);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  alert_id uuid references public.alerts (id) on delete set null,
  owner_id uuid references public.profiles (id),
  status public.case_status not null default 'open',
  summary text not null default '',
  outcome text,
  opened_by uuid references public.profiles (id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
create index cases_school_status_idx on public.cases (school_id, status);
create index cases_student_idx on public.cases (student_id);

create table public.case_actions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  action_type text not null check (action_type in ('cita_papas', 'tutoria', 'platica_alumno', 'canalizacion', 'otra')),
  description text not null default '',
  assigned_to uuid references public.profiles (id),
  due_on date,
  status public.action_status not null default 'pending',
  result text,
  done_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index case_actions_case_idx on public.case_actions (case_id);

-- Resúmenes ----------------------------------------------------------------

-- Lo que ve el papá: solo el texto final aprobado.
create table public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  status public.summary_status not null default 'draft',
  final_text text,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, month),
  check (status <> 'approved' or (final_text is not null and approved_by is not null and approved_at is not null))
);
create index monthly_summaries_school_month_idx on public.monthly_summaries (school_id, month);

-- Lo que ve solo el personal: datos usados, borrador de la IA y resultado del validador.
create table public.summary_drafts (
  summary_id uuid primary key references public.monthly_summaries (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  data_snapshot jsonb not null,
  draft_text text,
  validation_errors jsonb not null default '[]'::jsonb,
  prompt_version text,
  model text,
  generated_at timestamptz not null default now()
);

-- Notificaciones -----------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid references public.students (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text not null,
  url text,
  urgent boolean not null default false,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Privacidad ---------------------------------------------------------------

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  notice_version text not null,
  accepted_at timestamptz not null default now(),
  unique (school_id, user_id, notice_version)
);

create table public.arco_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid references public.students (id) on delete set null,
  kind public.arco_kind not null,
  details text not null check (length(details) between 1 and 2000),
  status public.arco_status not null default 'received',
  response text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  school_id uuid references public.schools (id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_school_idx on public.audit_log (school_id, created_at desc);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  file_name text not null,
  status public.import_status not null default 'preview',
  summary jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
