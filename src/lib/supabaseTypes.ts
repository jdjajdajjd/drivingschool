export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          phone: string
          email: string
          address: string
          logo_url: string | null
          primary_color: string | null
          booking_limit_enabled: boolean
          max_active_bookings_per_student: number
          branch_selection_mode: 'student_choice' | 'fixed_first'
          max_slots_per_booking: number
          default_lesson_duration: number
          enabled_category_codes: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['schools']['Row']> & {
          id: string
          name: string
          slug: string
        }
        Update: Partial<Database['public']['Tables']['schools']['Row']>
        Relationships: []
      }
      branches: {
        Row: {
          id: string
          school_id: string
          name: string
          address: string
          phone: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['branches']['Row']> & {
          id: string
          school_id: string
          name: string
          address: string
        }
        Update: Partial<Database['public']['Tables']['branches']['Row']>
        Relationships: []
      }
      instructors: {
        Row: {
          id: string
          school_id: string
          branch_id: string
          name: string
          phone: string
          email: string
          token: string
          bio: string
          experience: number
          is_active: boolean
          categories: string[]
          avatar_initials: string
          avatar_color: string
          car: string | null
          transmission: 'manual' | 'auto' | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['instructors']['Row']> & {
          id: string
          school_id: string
          branch_id: string
          name: string
          token: string
        }
        Update: Partial<Database['public']['Tables']['instructors']['Row']>
        Relationships: []
      }
      students: {
        Row: {
          id: string
          school_id: string
          name: string
          phone: string
          normalized_phone: string
          email: string
          password_hash: string | null
          avatar_url: string | null
          assigned_branch_id: string | null
          assigned_instructor_id: string | null
          branch_change_requested_at: string | null
          branch_change_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['students']['Row']> & {
          id: string
          school_id: string
          name: string
          phone: string
          normalized_phone: string
        }
        Update: Partial<Database['public']['Tables']['students']['Row']>
        Relationships: []
      }
      slots: {
        Row: {
          id: string
          school_id: string
          instructor_id: string
          branch_id: string
          date: string
          time: string
          duration: number
          status: 'available' | 'booked' | 'cancelled'
          booking_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['slots']['Row']> & {
          id: string
          school_id: string
          instructor_id: string
          branch_id: string
          date: string
          time: string
        }
        Update: Partial<Database['public']['Tables']['slots']['Row']>
        Relationships: []
      }
      booking_groups: {
        Row: {
          id: string
          school_id: string
          student_id: string
          status: 'active' | 'partially_cancelled' | 'cancelled' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['booking_groups']['Row']> & {
          id: string
          school_id: string
          student_id: string
        }
        Update: Partial<Database['public']['Tables']['booking_groups']['Row']>
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          booking_group_id: string | null
          school_id: string
          slot_id: string
          instructor_id: string
          branch_id: string
          student_id: string
          student_name: string
          student_phone: string
          student_email: string
          status: 'active' | 'cancelled' | 'completed'
          notes: string | null
          comment: string | null
          rescheduled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['bookings']['Row']> & {
          id: string
          school_id: string
          slot_id: string
          instructor_id: string
          branch_id: string
          student_id: string
          student_name: string
          student_phone: string
        }
        Update: Partial<Database['public']['Tables']['bookings']['Row']>
        Relationships: []
      }
      slot_locks: {
        Row: {
          slot_id: string
          session_id: string
          expires_at: string
        }
        Insert: Database['public']['Tables']['slot_locks']['Row']
        Update: Partial<Database['public']['Tables']['slot_locks']['Row']>
        Relationships: []
      }
    }
    Functions: {
      public_create_booking: {
        Args: {
          p_school_id: string
          p_student_name: string
          p_student_phone: string
          p_slot_ids: string[]
        }
        Returns: Array<{
          booking_group_id: string
          booking_id: string
          slot_id: string
        }>
      }
      public_cancel_booking: {
        Args: {
          p_booking_id: string
          p_staff_password: string
        }
        Returns: Array<{
          booking_id: string
          slot_id: string
        }>
      }
      public_complete_booking: {
        Args: {
          p_booking_id: string
          p_staff_password: string
        }
        Returns: Array<{
          booking_id: string
        }>
      }
      public_reschedule_booking: {
        Args: {
          p_booking_id: string
          p_new_slot_id: string
          p_staff_password: string
        }
        Returns: Array<{
          booking_id: string
          previous_slot_id: string
          new_slot_id: string
        }>
      }
      public_update_school_settings: {
        Args: {
          p_school_id: string
          p_name: string
          p_slug: string
          p_description: string
          p_primary_color: string
          p_logo_url: string
          p_booking_limit_enabled: boolean
          p_max_active_bookings_per_student: number
          p_branch_selection_mode: 'student_choice' | 'fixed_first'
          p_max_slots_per_booking: number
          p_default_lesson_duration: number
          p_enabled_category_codes: string[]
          p_staff_password: string
        }
        Returns: Array<{
          school_id: string
        }>
      }
      public_create_slot: {
        Args: {
          p_slot_id: string
          p_school_id: string
          p_branch_id: string
          p_instructor_id: string
          p_date: string
          p_start_time: string
          p_duration: number
          p_staff_password: string
        }
        Returns: Array<{
          slot_id: string
        }>
      }
      public_update_slot_status: {
        Args: {
          p_slot_id: string
          p_status: 'available' | 'booked' | 'cancelled'
          p_staff_password: string
        }
        Returns: Array<{
          slot_id: string
        }>
      }
      public_delete_slot: {
        Args: {
          p_slot_id: string
          p_staff_password: string
        }
        Returns: Array<{
          slot_id: string
        }>
      }
      public_upsert_branch: {
        Args: {
          p_branch_id: string
          p_school_id: string
          p_name: string
          p_address: string
          p_phone: string
          p_is_active: boolean
          p_staff_password: string
        }
        Returns: Array<{
          branch_id: string
        }>
      }
      public_delete_branch: {
        Args: {
          p_branch_id: string
          p_staff_password: string
        }
        Returns: Array<{
          branch_id: string
        }>
      }
      public_upsert_instructor: {
        Args: {
          p_instructor_id: string
          p_school_id: string
          p_branch_id: string
          p_name: string
          p_phone: string
          p_email: string
          p_token: string
          p_bio: string
          p_is_active: boolean
          p_car: string
          p_transmission: 'manual' | 'auto' | null
          p_categories: string[]
          p_staff_password: string
        }
        Returns: Array<{
          instructor_id: string
        }>
      }
      public_update_instructor_active: {
        Args: {
          p_instructor_id: string
          p_is_active: boolean
          p_staff_password: string
        }
        Returns: Array<{
          instructor_id: string
        }>
      }
      public_update_student_profile: {
        Args: {
          p_school_id: string
          p_phone: string
          p_name: string
          p_email: string
          p_password: string
          p_avatar_url: string
        }
        Returns: Array<{
          student_id: string
          student_phone: string
          profile_ready: boolean
        }>
      }
      public_login_student: {
        Args: {
          p_school_id: string
          p_phone: string
          p_password: string
        }
        Returns: Array<{
          student_id: string
          name: string
          phone: string
          email: string
          avatar_url: string | null
          assigned_branch_id: string | null
        }>
      }
      public_request_branch_change: {
        Args: {
          p_school_id: string
          p_phone: string
          p_note: string
        }
        Returns: Array<{
          student_id: string
        }>
      }
    }
    Views: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
