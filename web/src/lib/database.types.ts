// Archivo generado por scripts/gen-types.mjs. No editar a mano.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      alert_rules: {
        Row: {
          id: string;
          school_id: string;
          indicator: Database["public"]["Enums"]["alert_indicator"];
          threshold: number;
          window_days: number;
          enabled: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          indicator: Database["public"]["Enums"]["alert_indicator"];
          threshold: number;
          window_days?: number;
          enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          indicator?: Database["public"]["Enums"]["alert_indicator"];
          threshold?: number;
          window_days?: number;
          enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alert_rules_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      alerts: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          indicator: Database["public"]["Enums"]["alert_indicator"];
          detail: Json;
          status: Database["public"]["Enums"]["alert_status"];
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
          resolution_note: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          indicator: Database["public"]["Enums"]["alert_indicator"];
          detail?: Json;
          status?: Database["public"]["Enums"]["alert_status"];
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution_note?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          indicator?: Database["public"]["Enums"]["alert_indicator"];
          detail?: Json;
          status?: Database["public"]["Enums"]["alert_status"];
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      arco_requests: {
        Row: {
          id: string;
          school_id: string;
          user_id: string;
          student_id: string | null;
          kind: Database["public"]["Enums"]["arco_kind"];
          details: string;
          status: Database["public"]["Enums"]["arco_status"];
          response: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          user_id: string;
          student_id?: string | null;
          kind: Database["public"]["Enums"]["arco_kind"];
          details: string;
          status?: Database["public"]["Enums"]["arco_status"];
          response?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          user_id?: string;
          student_id?: string | null;
          kind?: Database["public"]["Enums"]["arco_kind"];
          details?: string;
          status?: Database["public"]["Enums"]["arco_status"];
          response?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "arco_requests_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "arco_requests_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "arco_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_misses: {
        Row: {
          id: string;
          school_id: string;
          assignment_id: string;
          student_id: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          assignment_id: string;
          student_id: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          assignment_id?: string;
          student_id?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_misses_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignment_misses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignment_misses_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignment_misses_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          id: string;
          school_id: string;
          group_id: string;
          subject_id: string;
          title: string;
          due_on: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          group_id: string;
          subject_id: string;
          title: string;
          due_on: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          group_id?: string;
          subject_id?: string;
          title?: string;
          due_on?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          group_id: string;
          date: string;
          status: Database["public"]["Enums"]["attendance_status"];
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          group_id: string;
          date: string;
          status: Database["public"]["Enums"]["attendance_status"];
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          group_id?: string;
          date?: string;
          status?: Database["public"]["Enums"]["attendance_status"];
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          id: number;
          school_id: string | null;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          school_id?: string | null;
          actor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          school_id?: string | null;
          actor_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      behavior_reports: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          occurred_on: string;
          severity: Database["public"]["Enums"]["behavior_severity"];
          description: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          occurred_on?: string;
          severity?: Database["public"]["Enums"]["behavior_severity"];
          description: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          occurred_on?: string;
          severity?: Database["public"]["Enums"]["behavior_severity"];
          description?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "behavior_reports_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "behavior_reports_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "behavior_reports_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      case_actions: {
        Row: {
          id: string;
          school_id: string;
          case_id: string;
          action_type: string;
          description: string;
          assigned_to: string | null;
          due_on: string | null;
          status: Database["public"]["Enums"]["action_status"];
          result: string | null;
          done_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          case_id: string;
          action_type: string;
          description?: string;
          assigned_to?: string | null;
          due_on?: string | null;
          status?: Database["public"]["Enums"]["action_status"];
          result?: string | null;
          done_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          case_id?: string;
          action_type?: string;
          description?: string;
          assigned_to?: string | null;
          due_on?: string | null;
          status?: Database["public"]["Enums"]["action_status"];
          result?: string | null;
          done_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "case_actions_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_actions_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_actions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_actions_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      cases: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          alert_id: string | null;
          owner_id: string | null;
          status: Database["public"]["Enums"]["case_status"];
          summary: string;
          outcome: string | null;
          opened_by: string | null;
          opened_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          alert_id?: string | null;
          owner_id?: string | null;
          status?: Database["public"]["Enums"]["case_status"];
          summary?: string;
          outcome?: string | null;
          opened_by?: string | null;
          opened_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          alert_id?: string | null;
          owner_id?: string | null;
          status?: Database["public"]["Enums"]["case_status"];
          summary?: string;
          outcome?: string | null;
          opened_by?: string | null;
          opened_at?: string;
          closed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cases_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_opened_by_fkey";
            columns: ["opened_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      consents: {
        Row: {
          id: string;
          school_id: string;
          user_id: string;
          notice_version: string;
          accepted_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          user_id: string;
          notice_version: string;
          accepted_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          user_id?: string;
          notice_version?: string;
          accepted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consents_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "consents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          group_id: string;
          school_year_id: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          group_id: string;
          school_year_id: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          group_id?: string;
          school_year_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_school_year_id_fkey";
            columns: ["school_year_id"];
            isOneToOne: false;
            referencedRelation: "school_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      grades: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          subject_id: string;
          period_id: string;
          score: number;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          subject_id: string;
          period_id: string;
          score: number;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          subject_id?: string;
          period_id?: string;
          score?: number;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grades_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grades_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grades_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grades_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grades_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          id: string;
          school_id: string;
          school_year_id: string;
          grade: number;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          school_year_id: string;
          grade: number;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          school_year_id?: string;
          grade?: number;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "groups_school_year_id_fkey";
            columns: ["school_year_id"];
            isOneToOne: false;
            referencedRelation: "school_years";
            referencedColumns: ["id"];
          },
        ];
      };
      guardian_invitations: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          email: string;
          full_name: string;
          relationship: string;
          token_hash: string;
          expires_at: string;
          sent_at: string | null;
          accepted_at: string | null;
          accepted_by: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          email: string;
          full_name?: string;
          relationship?: string;
          token_hash: string;
          expires_at?: string;
          sent_at?: string | null;
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          email?: string;
          full_name?: string;
          relationship?: string;
          token_hash?: string;
          expires_at?: string;
          sent_at?: string | null;
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guardian_invitations_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guardian_invitations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guardian_invitations_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guardian_invitations_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      imports: {
        Row: {
          id: string;
          school_id: string;
          file_name: string;
          status: Database["public"]["Enums"]["import_status"];
          summary: Json;
          errors: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          file_name: string;
          status?: Database["public"]["Enums"]["import_status"];
          summary?: Json;
          errors?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          file_name?: string;
          status?: Database["public"]["Enums"]["import_status"];
          summary?: Json;
          errors?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "imports_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "imports_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          id: string;
          school_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["member_role"];
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["member_role"];
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_goals: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          month: string;
          goal: string;
          achieved: boolean | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          month: string;
          goal: string;
          achieved?: boolean | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          month?: string;
          goal?: string;
          achieved?: boolean | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_goals_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monthly_goals_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monthly_goals_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_summaries: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          month: string;
          status: Database["public"]["Enums"]["summary_status"];
          final_text: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          month: string;
          status?: Database["public"]["Enums"]["summary_status"];
          final_text?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          month?: string;
          status?: Database["public"]["Enums"]["summary_status"];
          final_text?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_summaries_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monthly_summaries_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monthly_summaries_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          school_id: string;
          user_id: string;
          student_id: string | null;
          kind: Database["public"]["Enums"]["notification_kind"];
          title: string;
          body: string;
          url: string | null;
          urgent: boolean;
          created_at: string;
          sent_at: string | null;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          user_id: string;
          student_id?: string | null;
          kind: Database["public"]["Enums"]["notification_kind"];
          title: string;
          body: string;
          url?: string | null;
          urgent?: boolean;
          created_at?: string;
          sent_at?: string | null;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          user_id?: string;
          student_id?: string | null;
          kind?: Database["public"]["Enums"]["notification_kind"];
          title?: string;
          body?: string;
          url?: string | null;
          urgent?: boolean;
          created_at?: string;
          sent_at?: string | null;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      observations: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          body: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          body: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          body?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "observations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "observations_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "observations_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      periods: {
        Row: {
          id: string;
          school_id: string;
          school_year_id: string;
          name: string;
          sort: number;
          starts_on: string;
          ends_on: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          school_year_id: string;
          name: string;
          sort: number;
          starts_on: string;
          ends_on: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          school_year_id?: string;
          name?: string;
          sort?: number;
          starts_on?: string;
          ends_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "periods_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "periods_school_year_id_fkey";
            columns: ["school_year_id"];
            isOneToOne: false;
            referencedRelation: "school_years";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      school_years: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          starts_on: string;
          ends_on: string;
          is_current: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          starts_on: string;
          ends_on: string;
          is_current?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          starts_on?: string;
          ends_on?: string;
          is_current?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "school_years_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      schools: {
        Row: {
          id: string;
          name: string;
          cct: string | null;
          timezone: string;
          privacy_notice_version: string;
          privacy_notice_url: string | null;
          created_at: string;
          updated_at: string;
          address: string | null;
          privacy_email: string | null;
          phone: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          cct?: string | null;
          timezone?: string;
          privacy_notice_version?: string;
          privacy_notice_url?: string | null;
          created_at?: string;
          updated_at?: string;
          address?: string | null;
          privacy_email?: string | null;
          phone?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          cct?: string | null;
          timezone?: string;
          privacy_notice_version?: string;
          privacy_notice_url?: string | null;
          created_at?: string;
          updated_at?: string;
          address?: string | null;
          privacy_email?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      sensitive_notes: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          body: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          body: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          body?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sensitive_notes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensitive_notes_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensitive_notes_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      student_guardians: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          guardian_id: string;
          relationship: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          guardian_id: string;
          relationship?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          guardian_id?: string;
          relationship?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_guardians_guardian_id_fkey";
            columns: ["guardian_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_guardians_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      students: {
        Row: {
          id: string;
          school_id: string;
          first_name: string;
          last_name: string;
          second_last_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          first_name: string;
          last_name: string;
          second_last_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          first_name?: string;
          last_name?: string;
          second_last_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      subjects: {
        Row: {
          id: string;
          school_id: string;
          name: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      summary_drafts: {
        Row: {
          summary_id: string;
          school_id: string;
          student_id: string;
          data_snapshot: Json;
          draft_text: string | null;
          validation_errors: Json;
          prompt_version: string | null;
          model: string | null;
          generated_at: string;
        };
        Insert: {
          summary_id: string;
          school_id: string;
          student_id: string;
          data_snapshot: Json;
          draft_text?: string | null;
          validation_errors?: Json;
          prompt_version?: string | null;
          model?: string | null;
          generated_at?: string;
        };
        Update: {
          summary_id?: string;
          school_id?: string;
          student_id?: string;
          data_snapshot?: Json;
          draft_text?: string | null;
          validation_errors?: Json;
          prompt_version?: string | null;
          model?: string | null;
          generated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "summary_drafts_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "summary_drafts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "summary_drafts_summary_id_fkey";
            columns: ["summary_id"];
            isOneToOne: true;
            referencedRelation: "monthly_summaries";
            referencedColumns: ["id"];
          },
        ];
      };
      teaching_assignments: {
        Row: {
          id: string;
          school_id: string;
          group_id: string;
          subject_id: string;
          teacher_id: string;
          is_homeroom: boolean;
        };
        Insert: {
          id?: string;
          school_id: string;
          group_id: string;
          subject_id: string;
          teacher_id: string;
          is_homeroom?: boolean;
        };
        Update: {
          id?: string;
          school_id?: string;
          group_id?: string;
          subject_id?: string;
          teacher_id?: string;
          is_homeroom?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "teaching_assignments_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teaching_assignments_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teaching_assignments_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teaching_assignments_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_student_grade_trend: {
        Row: {
          school_id: string | null;
          student_id: string | null;
          subject_id: string | null;
          subject_name: string | null;
          period_id: string | null;
          period_name: string | null;
          sort: number | null;
          score: number | null;
          previous_score: number | null;
          delta: number | null;
        };
        Relationships: [];
      };
      v_student_pending_work: {
        Row: {
          school_id: string | null;
          student_id: string | null;
          subject_id: string | null;
          subject_name: string | null;
          assignment_id: string | null;
          title: string | null;
          due_on: string | null;
        };
        Relationships: [];
      };
      v_student_period_attendance: {
        Row: {
          school_id: string | null;
          student_id: string | null;
          period_id: string | null;
          period_name: string | null;
          sort: number | null;
          absences: number | null;
          lates: number | null;
          excused: number | null;
          days_recorded: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_guardian_invitation: { Args: { p_token: string }; Returns: string };
      approve_summary: { Args: { p_summary: string; p_text: string }; Returns: undefined };
      build_summary_snapshot: { Args: { p_student: string; p_month: string }; Returns: Json };
      close_case: { Args: { p_case: string; p_outcome: string }; Returns: undefined };
      convert_alert_to_case: { Args: { p_alert: string; p_summary: string; p_owner?: string }; Returns: string };
      director_dashboard: { Args: { p_school: string; p_today?: string }; Returns: Json };
      dismiss_alert: { Args: { p_alert: string; p_note: string }; Returns: undefined };
      escalate_case: { Args: { p_case: string }; Returns: undefined };
      export_my_data: { Args: never; Returns: Json };
      import_roster: { Args: { p_school: string; p_rows: Json; p_file_name?: string }; Returns: Json };
      invitation_preview: { Args: { p_token: string }; Returns: Json };
      log_student_view: { Args: { p_student: string }; Returns: undefined };
      mark_invitations_sent: { Args: { p_ids: string[] }; Returns: undefined };
      renew_invitation: { Args: { p_invitation: string }; Returns: Json };
      save_attendance: { Args: { p_group: string; p_date: string; p_exceptions: Json }; Returns: number };
      save_grades: { Args: { p_subject: string; p_period: string; p_scores: Json }; Returns: number };
      save_summary_draft: { Args: { p_summary: string; p_text: string; p_errors: Json; p_prompt_version: string; p_model: string }; Returns: undefined };
      set_assignment_misses: { Args: { p_assignment: string; p_students: string[] }; Returns: number };
      student_overview: { Args: { p_student: string; p_today?: string }; Returns: Json };
    };
    Enums: {
      action_status: "pending" | "done" | "cancelled";
      alert_indicator: "attendance" | "behavior" | "grades" | "assignments";
      alert_status: "open" | "dismissed" | "converted";
      arco_kind: "access" | "rectification" | "cancellation" | "opposition";
      arco_status: "received" | "in_progress" | "resolved" | "rejected";
      attendance_status: "present" | "absent" | "late" | "excused";
      behavior_severity: "minor" | "moderate" | "serious";
      case_status: "open" | "escalated" | "closed";
      import_status: "preview" | "committed" | "failed";
      member_role: "director" | "teacher" | "guardian";
      notification_kind: "alert" | "weekly_digest" | "monthly_summary" | "case_update" | "system";
      summary_status: "draft" | "needs_manual" | "approved";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
