-- Tipos y esquema privado para funciones auxiliares de permisos.

create schema if not exists private;

create type public.member_role as enum ('director', 'teacher', 'guardian');
create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');
create type public.alert_indicator as enum ('attendance', 'behavior', 'grades', 'assignments');
create type public.alert_status as enum ('open', 'dismissed', 'converted');
create type public.case_status as enum ('open', 'escalated', 'closed');
create type public.action_status as enum ('pending', 'done', 'cancelled');
create type public.summary_status as enum ('draft', 'needs_manual', 'approved');
create type public.behavior_severity as enum ('minor', 'moderate', 'serious');
create type public.arco_kind as enum ('access', 'rectification', 'cancellation', 'opposition');
create type public.arco_status as enum ('received', 'in_progress', 'resolved', 'rejected');
create type public.import_status as enum ('preview', 'committed', 'failed');
create type public.notification_kind as enum ('alert', 'weekly_digest', 'monthly_summary', 'case_update', 'system');
