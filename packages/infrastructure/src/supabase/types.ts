export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cardio_programs: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          duration_seconds: number
          hr_mode: string | null
          hr_zone: string | null
          id: string
          instructions: string | null
          max_bpm: number | null
          min_bpm: number | null
          name: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          duration_seconds: number
          hr_mode?: string | null
          hr_zone?: string | null
          id?: string
          instructions?: string | null
          max_bpm?: number | null
          min_bpm?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          duration_seconds?: number
          hr_mode?: string | null
          hr_zone?: string | null
          id?: string
          instructions?: string | null
          max_bpm?: number | null
          min_bpm?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_athletes: {
        Row: {
          athlete_id: string
          cancellation_policy_hours: number | null
          coach_id: string
          created_at: string
          default_session_duration: number
          ended_at: string | null
          id: string
          invited_at: string
          invited_by: string
          manual_approval_deadline_hours: number
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          cancellation_policy_hours?: number | null
          coach_id: string
          created_at?: string
          default_session_duration?: number
          ended_at?: string | null
          id?: string
          invited_at?: string
          invited_by: string
          manual_approval_deadline_hours?: number
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          cancellation_policy_hours?: number | null
          coach_id?: string
          created_at?: string
          default_session_duration?: number
          ended_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string
          manual_approval_deadline_hours?: number
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_availability: {
        Row: {
          coach_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_availability_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_availability_overrides: {
        Row: {
          coach_id: string
          created_at: string
          date: string
          end_time: string | null
          id: string
          is_available: boolean
          reason: string | null
          start_time: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_availability_overrides_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_gym_schedules: {
        Row: {
          created_at: string
          day_of_week: number | null
          gym_id: string
          id: string
          schedule_type: string
          specific_date: string | null
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          gym_id: string
          id?: string
          schedule_type: string
          specific_date?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          gym_id?: string
          id?: string
          schedule_type?: string
          specific_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_gym_schedules_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "coach_gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_gyms: {
        Row: {
          address: string
          city: string
          coach_id: string
          created_at: string
          google_place_id: string | null
          id: string
          location: unknown
          name: string
          state: string
        }
        Insert: {
          address: string
          city: string
          coach_id: string
          created_at?: string
          google_place_id?: string | null
          id?: string
          location: unknown
          name: string
          state: string
        }
        Update: {
          address?: string
          city?: string
          coach_id?: string
          created_at?: string
          google_place_id?: string | null
          id?: string
          location?: unknown
          name?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_gyms_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_recurring_schedule_exceptions: {
        Row: {
          created_at: string
          exception_date: string
          id: string
          schedule_id: string
        }
        Insert: {
          created_at?: string
          exception_date: string
          id?: string
          schedule_id: string
        }
        Update: {
          created_at?: string
          exception_date?: string
          id?: string
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_recurring_schedule_exceptions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "coach_recurring_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_recurring_schedules: {
        Row: {
          athlete_id: string | null
          coach_id: string
          created_at: string
          created_count: number
          cron_expression: string | null
          days_of_week: number[]
          duration_minutes: number
          effective_from: string
          effective_until: string | null
          end_count: number | null
          end_date: string | null
          end_type: string
          external_name: string | null
          id: string
          interval_weeks: number
          is_active: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          athlete_id?: string | null
          coach_id: string
          created_at?: string
          created_count?: number
          cron_expression?: string | null
          days_of_week?: number[]
          duration_minutes?: number
          effective_from: string
          effective_until?: string | null
          end_count?: number | null
          end_date?: string | null
          end_type?: string
          external_name?: string | null
          id?: string
          interval_weeks?: number
          is_active?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string | null
          coach_id?: string
          created_at?: string
          created_count?: number
          cron_expression?: string | null
          days_of_week?: number[]
          duration_minutes?: number
          effective_from?: string
          effective_until?: string | null
          end_count?: number | null
          end_date?: string | null
          end_type?: string
          external_name?: string | null
          id?: string
          interval_weeks?: number
          is_active?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_recurring_schedules_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_recurring_schedules_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_service_area_schedules: {
        Row: {
          created_at: string
          day_of_week: number | null
          id: string
          schedule_type: string
          service_area_id: string
          specific_date: string | null
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          id?: string
          schedule_type: string
          service_area_id: string
          specific_date?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          id?: string
          schedule_type?: string
          service_area_id?: string
          specific_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_service_area_schedules_service_area_id_fkey"
            columns: ["service_area_id"]
            isOneToOne: false
            referencedRelation: "coach_service_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_service_areas: {
        Row: {
          address: string
          center: unknown
          city: string
          coach_id: string
          created_at: string
          id: string
          radius_km: number
          state: string
        }
        Insert: {
          address: string
          center: unknown
          city: string
          coach_id: string
          created_at?: string
          id?: string
          radius_km: number
          state: string
        }
        Update: {
          address?: string
          center?: unknown
          city?: string
          coach_id?: string
          created_at?: string
          id?: string
          radius_km?: number
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_service_areas_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_service_types: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          service_type: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          service_type: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          service_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_service_types_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_session_disputes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          message: string
          resolution: string | null
          session_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          message: string
          resolution?: string | null
          session_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          message?: string
          resolution?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_session_disputes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_session_disputes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_sessions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          athlete_id: string | null
          canceled_at: string | null
          canceled_by: string | null
          cancellation_counts: boolean
          coach_id: string
          created_at: string
          duration_minutes: number
          external_name: string | null
          id: string
          notes: string | null
          recurring_schedule_id: string | null
          requested_by: string
          scheduled_at: string
          source: string
          status: string
          updated_at: string
          workout_log_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          athlete_id?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          cancellation_counts?: boolean
          coach_id: string
          created_at?: string
          duration_minutes?: number
          external_name?: string | null
          id?: string
          notes?: string | null
          recurring_schedule_id?: string | null
          requested_by: string
          scheduled_at: string
          source?: string
          status?: string
          updated_at?: string
          workout_log_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          athlete_id?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          cancellation_counts?: boolean
          coach_id?: string
          created_at?: string
          duration_minutes?: number
          external_name?: string | null
          id?: string
          notes?: string | null
          recurring_schedule_id?: string | null
          requested_by?: string
          scheduled_at?: string
          source?: string
          status?: string
          updated_at?: string
          workout_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_sessions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_sessions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_sessions_canceled_by_fkey"
            columns: ["canceled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_sessions_recurring_schedule_id_fkey"
            columns: ["recurring_schedule_id"]
            isOneToOne: false
            referencedRelation: "coach_recurring_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_sessions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_sessions_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_testimonials: {
        Row: {
          athlete_id: string
          coach_id: string
          content: string
          created_at: string
          id: string
          rating: number
          status: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          coach_id: string
          content: string
          created_at?: string
          id?: string
          rating: number
          status?: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          content?: string
          created_at?: string
          id?: string
          rating?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_testimonials_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_testimonials_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipments: {
        Row: {
          created_at: string
          id: string
          name: string
          preposition: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          preposition?: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          preposition?: string
          slug?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          exercise_type: string
          id: string
          name: string
          slug: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          exercise_type?: string
          id?: string
          name: string
          slug?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          exercise_type?: string
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feature_keys: {
        Row: {
          description: string
          key: string
        }
        Insert: {
          description: string
          key: string
        }
        Update: {
          description?: string
          key?: string
        }
        Relationships: []
      }
      muscles: {
        Row: {
          created_at: string
          id: string
          level: number
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "muscles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "muscles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_taken: string | null
          action_taken_at: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json
          read_at: string | null
          recipient_user_id: string
          sender_user_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          action_taken_at?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json
          read_at?: string | null
          recipient_user_id: string
          sender_user_id?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          action_taken_at?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json
          read_at?: string | null
          recipient_user_id?: string
          sender_user_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_sessions: {
        Row: {
          created_at: string
          id: string
          payment_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_sessions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "coach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          coach_id: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string
          payment_method: string
          updated_at: string
        }
        Insert: {
          amount: number
          coach_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at: string
          payment_method: string
          updated_at?: string
        }
        Update: {
          amount?: number
          coach_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      periodization_adjustments: {
        Row: {
          created_at: string
          cycle_end: number | null
          cycle_every: number | null
          cycle_start: number | null
          id: string
          payload: Json
          periodization_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_end?: number | null
          cycle_every?: number | null
          cycle_start?: number | null
          id?: string
          payload: Json
          periodization_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_end?: number | null
          cycle_every?: number | null
          cycle_start?: number | null
          id?: string
          payload?: Json
          periodization_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodization_adjustments_periodization_id_fkey"
            columns: ["periodization_id"]
            isOneToOne: false
            referencedRelation: "periodizations"
            referencedColumns: ["id"]
          },
        ]
      }
      periodization_occurrences: {
        Row: {
          cardio_program_id: string | null
          created_at: string
          cycle: number
          day_type: string
          executed_at: string | null
          id: string
          kind: string | null
          origin: string
          periodization_id: string
          planned_date: string
          position_in_day: number
          skipped_reason: string | null
          source_adjustment_id: string | null
          status: string
          template_activity_id: string | null
          template_day_id: string | null
          updated_at: string
          workout_id: string | null
          workout_log_id: string | null
        }
        Insert: {
          cardio_program_id?: string | null
          created_at?: string
          cycle: number
          day_type: string
          executed_at?: string | null
          id?: string
          kind?: string | null
          origin: string
          periodization_id: string
          planned_date: string
          position_in_day: number
          skipped_reason?: string | null
          source_adjustment_id?: string | null
          status?: string
          template_activity_id?: string | null
          template_day_id?: string | null
          updated_at?: string
          workout_id?: string | null
          workout_log_id?: string | null
        }
        Update: {
          cardio_program_id?: string | null
          created_at?: string
          cycle?: number
          day_type?: string
          executed_at?: string | null
          id?: string
          kind?: string | null
          origin?: string
          periodization_id?: string
          planned_date?: string
          position_in_day?: number
          skipped_reason?: string | null
          source_adjustment_id?: string | null
          status?: string
          template_activity_id?: string | null
          template_day_id?: string | null
          updated_at?: string
          workout_id?: string | null
          workout_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "periodization_occurrences_cardio_program_id_fkey"
            columns: ["cardio_program_id"]
            isOneToOne: false
            referencedRelation: "cardio_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_occurrences_periodization_id_fkey"
            columns: ["periodization_id"]
            isOneToOne: false
            referencedRelation: "periodizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_occurrences_source_adjustment_id_fkey"
            columns: ["source_adjustment_id"]
            isOneToOne: false
            referencedRelation: "periodization_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_occurrences_template_activity_id_fkey"
            columns: ["template_activity_id"]
            isOneToOne: false
            referencedRelation: "periodization_template_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_occurrences_template_day_id_fkey"
            columns: ["template_day_id"]
            isOneToOne: false
            referencedRelation: "periodization_template_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_occurrences_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_occurrences_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      periodization_template_activities: {
        Row: {
          cardio_program_id: string | null
          id: string
          kind: string
          position: number
          template_day_id: string
          workout_id: string | null
        }
        Insert: {
          cardio_program_id?: string | null
          id?: string
          kind: string
          position: number
          template_day_id: string
          workout_id?: string | null
        }
        Update: {
          cardio_program_id?: string | null
          id?: string
          kind?: string
          position?: number
          template_day_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "periodization_template_activities_cardio_program_id_fkey"
            columns: ["cardio_program_id"]
            isOneToOne: false
            referencedRelation: "cardio_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_template_activities_template_day_id_fkey"
            columns: ["template_day_id"]
            isOneToOne: false
            referencedRelation: "periodization_template_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_template_activities_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      periodization_template_days: {
        Row: {
          day_type: string
          id: string
          periodization_id: string
          position: number
        }
        Insert: {
          day_type: string
          id?: string
          periodization_id: string
          position: number
        }
        Update: {
          day_type?: string
          id?: string
          periodization_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "periodization_template_days_periodization_id_fkey"
            columns: ["periodization_id"]
            isOneToOne: false
            referencedRelation: "periodizations"
            referencedColumns: ["id"]
          },
        ]
      }
      periodizations: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string
          end_date: string
          id: string
          notification_days_before: number | null
          objective: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          notification_days_before?: number | null
          objective?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          notification_days_before?: number | null
          objective?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_feature_limits: {
        Row: {
          enabled: boolean
          feature_key: string
          id: string
          limit_value: number | null
          plan_id: string
        }
        Insert: {
          enabled?: boolean
          feature_key: string
          id?: string
          limit_value?: number | null
          plan_id: string
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          id?: string
          limit_value?: number | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_feature_limits_feature_key_fk"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "feature_keys"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "plan_feature_limits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_crop_meta: Json | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          contact_links: Json | null
          credentials: Json | null
          full_name: string | null
          gallery_urls: string[] | null
          id: string
          onboarding_completed: boolean
          profile_published: boolean
          role: Database["public"]["Enums"]["user_role"]
          sex: string | null
          slug: string | null
          specialties: string[] | null
          stripe_customer_id: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_crop_meta?: Json | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          contact_links?: Json | null
          credentials?: Json | null
          full_name?: string | null
          gallery_urls?: string[] | null
          id: string
          onboarding_completed?: boolean
          profile_published?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          sex?: string | null
          slug?: string | null
          specialties?: string[] | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_crop_meta?: Json | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          contact_links?: Json | null
          credentials?: Json | null
          full_name?: string | null
          gallery_urls?: string[] | null
          id?: string
          onboarding_completed?: boolean
          profile_published?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          sex?: string | null
          slug?: string | null
          specialties?: string[] | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string | null
          created_at: string
          device_token: string | null
          endpoint: string | null
          id: string
          p256dh_key: string | null
          platform: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key?: string | null
          created_at?: string
          device_token?: string | null
          endpoint?: string | null
          id?: string
          p256dh_key?: string | null
          platform?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string | null
          created_at?: string
          device_token?: string | null
          endpoint?: string | null
          id?: string
          p256dh_key?: string | null
          platform?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_favorites: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          notes: string | null
          target_user_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters: Json
          id?: string
          name: string
          notes?: string | null
          target_user_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          notes?: string | null
          target_user_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_variations: {
        Row: {
          created_at: string | null
          id: string
          owner_id: string
          shared_with_id: string
          variation_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          owner_id: string
          shared_with_id: string
          variation_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          owner_id?: string
          shared_with_id?: string
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_variations_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_variations_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      stripe_price_map: {
        Row: {
          active: boolean
          created_at: string
          lookup_key: string
          plan_code: string
          stripe_price_id: string
          stripe_product_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          lookup_key: string
          plan_code: string
          stripe_price_id: string
          stripe_product_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          lookup_key?: string
          plan_code?: string
          stripe_price_id?: string
          stripe_product_id?: string
        }
        Relationships: []
      }
      subscription_feature_overrides: {
        Row: {
          created_at: string
          enabled: boolean | null
          feature_key: string
          id: string
          limit_value: number | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          feature_key: string
          id?: string
          limit_value?: number | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          feature_key?: string
          id?: string
          limit_value?: number | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_feature_overrides_feature_key_fk"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "feature_keys"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "subscription_feature_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          expires_at: string | null
          granted_by: string | null
          id: string
          plan_id: string
          source: string
          started_at: string
          stripe_price_id: string | null
          stripe_status: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          plan_id: string
          source: string
          started_at?: string
          stripe_price_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          plan_id?: string
          source?: string
          started_at?: string
          stripe_price_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      variation_videos: {
        Row: {
          content_type: string
          duration_seconds: number
          last_dispatched_at: string | null
          object_key: string
          processing_attempts: number
          processing_error: string | null
          processing_started_at: string | null
          processing_status: string
          size_bytes: number
          thumbnail_key: string | null
          uploaded_at: string
          uploaded_by: string | null
          variation_id: string
        }
        Insert: {
          content_type: string
          duration_seconds: number
          last_dispatched_at?: string | null
          object_key: string
          processing_attempts?: number
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string
          size_bytes: number
          thumbnail_key?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          variation_id: string
        }
        Update: {
          content_type?: string
          duration_seconds?: number
          last_dispatched_at?: string | null
          object_key?: string
          processing_attempts?: number
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string
          size_bytes?: number
          thumbnail_key?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variation_videos_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: true
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variation_videos_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: true
            referencedRelation: "variations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      variations: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          equipment_id: string
          exercise_id: string
          id: string
          image_url: string | null
          muscle_id: string
          name: string | null
          secondary_muscle_id: string | null
          slug: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          equipment_id: string
          exercise_id: string
          id?: string
          image_url?: string | null
          muscle_id: string
          name?: string | null
          secondary_muscle_id?: string | null
          slug?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          equipment_id?: string
          exercise_id?: string
          id?: string
          image_url?: string | null
          muscle_id?: string
          name?: string | null
          secondary_muscle_id?: string | null
          slug?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variations_muscle_id_fkey"
            columns: ["muscle_id"]
            isOneToOne: false
            referencedRelation: "muscles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variations_secondary_muscle_id_fkey"
            columns: ["secondary_muscle_id"]
            isOneToOne: false
            referencedRelation: "muscles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercise_logs: {
        Row: {
          created_at: string
          exercise_name: string | null
          id: string
          note: string | null
          position: number
          rest_seconds: number | null
          superset_group_id: string | null
          updated_at: string
          variation_id: string | null
          variation_name: string | null
          workout_log_id: string
        }
        Insert: {
          created_at?: string
          exercise_name?: string | null
          id?: string
          note?: string | null
          position: number
          rest_seconds?: number | null
          superset_group_id?: string | null
          updated_at?: string
          variation_id?: string | null
          variation_name?: string | null
          workout_log_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string | null
          id?: string
          note?: string | null
          position?: number
          rest_seconds?: number | null
          superset_group_id?: string | null
          updated_at?: string
          variation_id?: string | null
          variation_name?: string | null
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercise_logs_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercise_logs_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercise_logs_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercise_set_logs: {
        Row: {
          created_at: string
          id: string
          reps: number | null
          reps_max: number | null
          reps_min: number | null
          set_order: number
          set_type: string
          updated_at: string
          weight_kg: number | null
          workout_exercise_log_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reps?: number | null
          reps_max?: number | null
          reps_min?: number | null
          set_order: number
          set_type: string
          updated_at?: string
          weight_kg?: number | null
          workout_exercise_log_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reps?: number | null
          reps_max?: number | null
          reps_min?: number | null
          set_order?: number
          set_type?: string
          updated_at?: string
          weight_kg?: number | null
          workout_exercise_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercise_set_logs_workout_exercise_log_id_fkey"
            columns: ["workout_exercise_log_id"]
            isOneToOne: false
            referencedRelation: "workout_exercise_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          created_at: string
          id: string
          note: string | null
          position: number
          rest_seconds: number | null
          superset_group_id: string
          superset_order: number
          updated_at: string
          variation_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          position: number
          rest_seconds?: number | null
          superset_group_id: string
          superset_order?: number
          updated_at?: string
          variation_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          position?: number
          rest_seconds?: number | null
          superset_group_id?: string
          superset_order?: number
          updated_at?: string
          variation_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_folders: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_log_summaries: {
        Row: {
          created_at: string
          id: string
          summary_snapshot: Json
          updated_at: string
          user_id: string
          workout_log_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          summary_snapshot: Json
          updated_at?: string
          user_id: string
          workout_log_id: string
        }
        Update: {
          created_at?: string
          id?: string
          summary_snapshot?: Json
          updated_at?: string
          user_id?: string
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_log_summaries_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: true
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          coach_session_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          finished_at: string
          id: string
          is_coached: boolean
          note: string | null
          started_at: string
          started_by: string
          updated_at: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          coach_session_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          finished_at: string
          id?: string
          is_coached?: boolean
          note?: string | null
          started_at: string
          started_by: string
          updated_at?: string
          user_id: string
          workout_id?: string | null
        }
        Update: {
          coach_session_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          finished_at?: string
          id?: string
          is_coached?: boolean
          note?: string | null
          started_at?: string
          started_by?: string
          updated_at?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_coach_session_id_fkey"
            columns: ["coach_session_id"]
            isOneToOne: false
            referencedRelation: "coach_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_preparatory_exercise_logs: {
        Row: {
          created_at: string
          duration_type: string
          exercise_name: string | null
          id: string
          note: string | null
          position: number
          updated_at: string
          variation_id: string | null
          variation_name: string | null
          workout_log_id: string
        }
        Insert: {
          created_at?: string
          duration_type: string
          exercise_name?: string | null
          id?: string
          note?: string | null
          position: number
          updated_at?: string
          variation_id?: string | null
          variation_name?: string | null
          workout_log_id: string
        }
        Update: {
          created_at?: string
          duration_type?: string
          exercise_name?: string | null
          id?: string
          note?: string | null
          position?: number
          updated_at?: string
          variation_id?: string | null
          variation_name?: string | null
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_preparatory_exercise_logs_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_preparatory_exercise_logs_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_preparatory_exercise_logs_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_preparatory_exercises: {
        Row: {
          created_at: string
          duration_type: string
          id: string
          note: string | null
          position: number
          updated_at: string
          variation_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          duration_type: string
          id?: string
          note?: string | null
          position: number
          updated_at?: string
          variation_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          duration_type?: string
          id?: string
          note?: string | null
          position?: number
          updated_at?: string
          variation_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_preparatory_exercises_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_preparatory_exercises_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_preparatory_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_preparatory_set_logs: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          reps: number | null
          set_order: number
          updated_at: string
          workout_preparatory_exercise_log_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          reps?: number | null
          set_order: number
          updated_at?: string
          workout_preparatory_exercise_log_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          reps?: number | null
          set_order?: number
          updated_at?: string
          workout_preparatory_exercise_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_preparatory_set_logs_workout_preparatory_exercise__fkey"
            columns: ["workout_preparatory_exercise_log_id"]
            isOneToOne: false
            referencedRelation: "workout_preparatory_exercise_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_preparatory_sets: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          reps: number | null
          set_order: number
          updated_at: string
          workout_preparatory_exercise_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          reps?: number | null
          set_order: number
          updated_at?: string
          workout_preparatory_exercise_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          reps?: number | null
          set_order?: number
          updated_at?: string
          workout_preparatory_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_preparatory_sets_workout_preparatory_exercise_id_fkey"
            columns: ["workout_preparatory_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_preparatory_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          created_at: string
          id: string
          linked_set_id: string | null
          load_percent_of_previous: number | null
          reps_max: number
          reps_min: number
          set_order: number
          set_type: string
          updated_at: string
          workout_exercise_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_set_id?: string | null
          load_percent_of_previous?: number | null
          reps_max: number
          reps_min: number
          set_order: number
          set_type: string
          updated_at?: string
          workout_exercise_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_set_id?: string | null
          load_percent_of_previous?: number | null
          reps_max?: number
          reps_min?: number
          set_order?: number
          set_type?: string
          updated_at?: string
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_linked_set_id_fkey"
            columns: ["linked_set_id"]
            isOneToOne: false
            referencedRelation: "workout_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_variation_records: {
        Row: {
          created_at: string
          id: string
          max_reps: number | null
          max_sets: number | null
          max_volume_kg: number | null
          max_weight_kg: number | null
          updated_at: string
          user_id: string
          variation_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_reps?: number | null
          max_sets?: number | null
          max_volume_kg?: number | null
          max_weight_kg?: number | null
          updated_at?: string
          user_id: string
          variation_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_reps?: number | null
          max_sets?: number | null
          max_volume_kg?: number | null
          max_weight_kg?: number | null
          updated_at?: string
          user_id?: string
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_variation_records_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_variation_records_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "variations_view"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          folder_id: string | null
          id: string
          name: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          name: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "workout_folders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      coach_athletes_with_profiles: {
        Row: {
          athlete_avatar_url: string | null
          athlete_full_name: string | null
          athlete_id: string | null
          cancellation_policy_hours: number | null
          coach_id: string | null
          default_session_duration: number | null
          ended_at: string | null
          invited_at: string | null
          manual_approval_deadline_hours: number | null
          relationship_id: string | null
          responded_at: string | null
          status: string | null
        }
        Relationships: []
      }
      variations_view: {
        Row: {
          deleted_at: string | null
          equipment_id: string | null
          equipment_name: string | null
          equipment_preposition: string | null
          equipment_slug: string | null
          exercise_id: string | null
          exercise_name: string | null
          exercise_slug: string | null
          exercise_type: string | null
          id: string | null
          image_url: string | null
          muscle_id: string | null
          muscle_level2_name: string | null
          muscle_level2_slug: string | null
          muscle_name: string | null
          muscle_slug: string | null
          name: string | null
          secondary_muscle_id: string | null
          secondary_muscle_name: string | null
          secondary_muscle_slug: string | null
          user_id: string | null
          variation_slug: string | null
          video_duration_seconds: number | null
          video_object_key: string | null
          video_processing_status: string | null
          video_thumbnail_key: string | null
          video_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variations_muscle_id_fkey"
            columns: ["muscle_id"]
            isOneToOne: false
            referencedRelation: "muscles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variations_secondary_muscle_id_fkey"
            columns: ["secondary_muscle_id"]
            isOneToOne: false
            referencedRelation: "muscles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_coach_invite_with_side_effects: {
        Args: { p_invite_id: string }
        Returns: Json
      }
      batch_update_summary_snapshots: {
        Args: { p_updates: Json }
        Returns: undefined
      }
      check_email_exists: { Args: { p_email: string }; Returns: boolean }
      claim_video_transcode: {
        Args: { p_max_attempts: number; p_variation_id: string }
        Returns: {
          content_type: string
          object_key: string
          processing_attempts: number
          variation_id: string
        }[]
      }
      copy_workout: {
        Args: { p_source_workout_id: string; p_target_user_id: string }
        Returns: string
      }
      create_email_invite_relationship: {
        Args: { p_athlete_id: string; p_coach_id: string }
        Returns: undefined
      }
      delete_exercise_variation:
        | {
            Args: { p_user_id: string; p_variation_id: string }
            Returns: undefined
          }
        | { Args: { p_variation_id: string }; Returns: undefined }
      delete_folder: {
        Args: { p_folder_id: string; p_mode: string }
        Returns: undefined
      }
      dispatch_variation_video_transcode: {
        Args: { p_variation_id: string }
        Returns: number
      }
      expand_muscle_ids: {
        Args: { p_muscle_ids: string[] }
        Returns: {
          id: string
        }[]
      }
      get_coach_athlete_metrics: {
        Args: { p_coach_id: string; p_days?: number }
        Returns: {
          avg_duration_seconds: number
          session_count: number
          session_dates: string[]
          user_id: string
        }[]
      }
      get_coach_occupied_slots: {
        Args: {
          p_coach_id: string
          p_end_date: string
          p_start_date: string
          p_timezone?: string
        }
        Returns: {
          duration_minutes: number
          scheduled_at: string
        }[]
      }
      get_coach_testimonial_stats: {
        Args: { p_coach_id: string }
        Returns: {
          average_rating: number
          testimonial_count: number
        }[]
      }
      get_previous_workout_log_for_summary: {
        Args: { p_user_id: string; p_workout_id: string }
        Returns: Json
      }
      get_previous_workout_sets: {
        Args: { p_user_id: string; p_variation_ids: string[] }
        Returns: {
          reps: number
          set_order: number
          set_type: string
          variation_id: string
          weight_kg: number
        }[]
      }
      get_summary_recalculation_context: {
        Args: { p_started_at: string; p_user_id: string }
        Returns: Json
      }
      get_variation_history: {
        Args: { p_user_id: string; p_variation_id: string }
        Returns: Json
      }
      get_variation_last: {
        Args: { p_user_id: string; p_variation_id?: string }
        Returns: Json
      }
      get_variation_progress: {
        Args: { p_user_id: string; p_variation_id?: string }
        Returns: Json
      }
      get_variation_records: {
        Args: { p_user_id: string; p_variation_id?: string }
        Returns: Json
      }
      get_variation_usage: {
        Args: { p_variation_id: string }
        Returns: {
          is_superset: boolean
          superset_partners: string[]
          workout_id: string
          workout_name: string
        }[]
      }
      get_workout: { Args: { p_workout_id: string }; Returns: Json }
      get_workout_log_summary: {
        Args: { p_workout_log_id: string }
        Returns: Json
      }
      get_workout_variation_records: {
        Args: { p_user_id: string; p_variation_ids: string[] }
        Returns: {
          max_reps: number
          max_sets: number
          max_volume_kg: number
          max_weight_kg: number
          variation_id: string
        }[]
      }
      insert_workout_log: { Args: { payload: Json }; Returns: string }
      insert_workout_log_with_summary: {
        Args: { payload: Json; summary_snapshot: Json }
        Returns: string
      }
      is_active_coach_of: {
        Args: { p_athlete_id: string; p_coach_id: string }
        Returns: boolean
      }
      list_periodizations: { Args: { p_created_by: string }; Returns: Json }
      list_workouts_with_summary: {
        Args: { p_folder_id?: string; p_user_id: string }
        Returns: Json
      }
      pgmq_archive: {
        Args: { msg_id: number; queue_name: string }
        Returns: boolean
      }
      pgmq_delete: {
        Args: { msg_id: number; queue_name: string }
        Returns: boolean
      }
      pgmq_read: {
        Args: { qty: number; queue_name: string; vt: number }
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "message_record"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      recalculate_variation_records: {
        Args: { p_user_id: string; p_variation_ids: string[] }
        Returns: undefined
      }
      recover_stuck_video_transcodes: {
        Args: {
          p_limit: number
          p_pending_after_minutes: number
          p_processing_after_minutes: number
        }
        Returns: {
          variation_id: string
        }[]
      }
      replace_future_occurrences: {
        Args: { p_from_date: string; p_periodization_id: string; p_rows: Json }
        Returns: undefined
      }
      resolve_all_feature_access: {
        Args: { p_user_id: string }
        Returns: {
          enabled: boolean
          feature_key: string
          limit_value: number
        }[]
      }
      resolve_feature_access: {
        Args: { p_feature_key: string; p_user_id: string }
        Returns: {
          enabled: boolean
          limit_value: number
        }[]
      }
      save_periodization_edit: {
        Args: {
          p_adjustments_delete: string[]
          p_adjustments_upsert: Json
          p_end_date: string
          p_occurrences_delete: string[]
          p_occurrences_insert: Json
          p_occurrences_update: Json
          p_periodization_id: string
          p_start_date: string
        }
        Returns: undefined
      }
      search_coaches_by_gym_location: {
        Args: { p_lat: number; p_lng: number; p_radius_meters: number }
        Returns: {
          coach_id: string
        }[]
      }
      search_coaches_by_service_area: {
        Args: { p_lat: number; p_lng: number }
        Returns: {
          coach_id: string
        }[]
      }
      search_workouts: {
        Args: { p_query: string; p_user_id: string }
        Returns: Json
      }
      upsert_exercise_variation: {
        Args: {
          p_equipment_id: string
          p_exercise_id: string
          p_exercise_type?: string
          p_image_url: string
          p_muscle_id: string
          p_name: string
          p_new_variation?: boolean
          p_secondary_muscle_id?: string
          p_user_id: string
          p_variation_id: string
          p_variation_name: string
          p_video_url: string
        }
        Returns: Json
      }
      upsert_periodization: { Args: { payload: Json }; Returns: string }
      upsert_push_subscription: {
        Args: {
          p_auth_key: string
          p_endpoint: string
          p_p256dh_key: string
          p_user_agent: string
          p_user_id: string
        }
        Returns: Json
      }
      upsert_workout: { Args: { payload: Json }; Returns: string }
      wt_create_user_exercise: {
        Args: {
          p_equipment_id: string
          p_exercise_name: string
          p_exercise_type: string
          p_muscle_id: string
          p_secondary_muscle_id?: string
          p_variation_id: string
          p_variation_name: string
          p_video_content_type?: string
          p_video_duration_secs?: number
          p_video_object_key?: string
          p_video_size_bytes?: number
          p_video_thumbnail_key?: string
          p_youtube_video_url?: string
        }
        Returns: number
      }
      wt_delete_user_exercises: {
        Args: { p_variation_ids: string[] }
        Returns: number
      }
      wt_get_exercise_history: {
        Args: { p_user_id: string; p_variation_id: string }
        Returns: Json
      }
      wt_list_exercises_summaries: {
        Args: {
          p_equipment_ids: string[]
          p_exercise_types: string[]
          p_muscle_ids: string[]
          p_user_id: string
          p_visibility: string
        }
        Returns: {
          equipment_id: string
          equipment_name: string
          equipment_preposition: string
          equipment_slug: string
          exercise_id: string
          exercise_name: string
          exercise_slug: string
          exercise_type: string
          id: string
          image_url: string
          muscle_id: string
          muscle_level2_name: string
          muscle_level2_slug: string
          muscle_name: string
          muscle_slug: string
          name: string
          secondary_muscle_id: string
          secondary_muscle_name: string
          secondary_muscle_slug: string
          user_id: string
          variation_slug: string
          video_duration_seconds: number
          video_object_key: string
          video_processing_status: string
          video_thumbnail_key: string
          video_url: string
        }[]
      }
      wt_update_user_exercise: {
        Args: {
          p_equipment_id: string
          p_exercise_name: string
          p_exercise_type: string
          p_muscle_id: string
          p_secondary_muscle_id?: string
          p_variation_id: string
          p_variation_name: string
          p_video_content_type?: string
          p_video_duration_secs?: number
          p_video_object_key?: string
          p_video_size_bytes?: number
          p_video_thumbnail_key?: string
          p_youtube_video_url?: string
        }
        Returns: number
      }
    }
    Enums: {
      user_role: "coach" | "athlete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: ["coach", "athlete"],
    },
  },
} as const

