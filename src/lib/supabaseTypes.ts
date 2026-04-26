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
          assigned_branch_id: string | null
          assigned_instructor_id: string | null
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
    }
    Views: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
