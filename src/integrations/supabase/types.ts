export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      mock_exams: {
        Row: {
          completed_at: string | null
          id: string
          listening_band: number | null
          mode: string
          overall_band: number | null
          reading_band: number | null
          report: Json | null
          speaking_band: number | null
          started_at: string
          status: string
          user_id: string
          writing_band: number | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          listening_band?: number | null
          mode?: string
          overall_band?: number | null
          reading_band?: number | null
          report?: Json | null
          speaking_band?: number | null
          started_at?: string
          status?: string
          user_id: string
          writing_band?: number | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          listening_band?: number | null
          mode?: string
          overall_band?: number | null
          reading_band?: number | null
          report?: Json | null
          speaking_band?: number | null
          started_at?: string
          status?: string
          user_id?: string
          writing_band?: number | null
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          created_at: string
          difficulty: string | null
          duration_seconds: number | null
          estimated_band: number | null
          id: string
          marking: Json | null
          payload: Json | null
          question_type: string | null
          raw_score: number | null
          section: string
          topic: string | null
          user_answers: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          duration_seconds?: number | null
          estimated_band?: number | null
          id?: string
          marking?: Json | null
          payload?: Json | null
          question_type?: string | null
          raw_score?: number | null
          section: string
          topic?: string | null
          user_answers?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          duration_seconds?: number | null
          estimated_band?: number | null
          id?: string
          marking?: Json | null
          payload?: Json | null
          question_type?: string | null
          raw_score?: number | null
          section?: string
          topic?: string | null
          user_answers?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_band: number | null
          daily_minutes: number | null
          exam_date: string | null
          full_name: string | null
          id: string
          last_practice_date: string | null
          onboarded: boolean | null
          plan_length: number | null
          preferred_accent: string | null
          streak_days: number | null
          target_band: number | null
          theme: string | null
          updated_at: string
          weakest_skill: string | null
        }
        Insert: {
          created_at?: string
          current_band?: number | null
          daily_minutes?: number | null
          exam_date?: string | null
          full_name?: string | null
          id: string
          last_practice_date?: string | null
          onboarded?: boolean | null
          plan_length?: number | null
          preferred_accent?: string | null
          streak_days?: number | null
          target_band?: number | null
          theme?: string | null
          updated_at?: string
          weakest_skill?: string | null
        }
        Update: {
          created_at?: string
          current_band?: number | null
          daily_minutes?: number | null
          exam_date?: string | null
          full_name?: string | null
          id?: string
          last_practice_date?: string | null
          onboarded?: boolean | null
          plan_length?: number | null
          preferred_accent?: string | null
          streak_days?: number | null
          target_band?: number | null
          theme?: string | null
          updated_at?: string
          weakest_skill?: string | null
        }
        Relationships: []
      }
      saved_questions: {
        Row: {
          created_at: string
          difficulty: string | null
          id: string
          is_wrong: boolean | null
          payload: Json
          question_type: string | null
          section: string
          topic: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          id?: string
          is_wrong?: boolean | null
          payload: Json
          question_type?: string | null
          section: string
          topic?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          id?: string
          is_wrong?: boolean | null
          payload?: Json
          question_type?: string | null
          section?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      speaking_submissions: {
        Row: {
          created_at: string
          cue_card: Json | null
          duration_seconds: number | null
          estimated_band: number | null
          filler_count: number | null
          id: string
          marking: Json | null
          part: number
          question: string
          transcript: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cue_card?: Json | null
          duration_seconds?: number | null
          estimated_band?: number | null
          filler_count?: number | null
          id?: string
          marking?: Json | null
          part: number
          question: string
          transcript: string
          user_id: string
        }
        Update: {
          created_at?: string
          cue_card?: Json | null
          duration_seconds?: number | null
          estimated_band?: number | null
          filler_count?: number | null
          id?: string
          marking?: Json | null
          part?: number
          question?: string
          transcript?: string
          user_id?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          id: string
          length_days: number
          plan: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          length_days: number
          plan: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          length_days?: number
          plan?: Json
          user_id?: string
        }
        Relationships: []
      }
      writing_submissions: {
        Row: {
          bullet_points: Json | null
          created_at: string
          essay_type: string | null
          estimated_band: number | null
          id: string
          marking: Json | null
          prompt: string
          task_type: string
          user_answer: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          bullet_points?: Json | null
          created_at?: string
          essay_type?: string | null
          estimated_band?: number | null
          id?: string
          marking?: Json | null
          prompt: string
          task_type: string
          user_answer: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          bullet_points?: Json | null
          created_at?: string
          essay_type?: string | null
          estimated_band?: number | null
          id?: string
          marking?: Json | null
          prompt?: string
          task_type?: string
          user_answer?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
