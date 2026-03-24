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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      discussion_replies: {
        Row: {
          body: string
          created_at: string
          discussion_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          discussion_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          discussion_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          body: string
          created_at: string
          id: string
          locked: boolean
          pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          locked?: boolean
          pinned?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          locked?: boolean
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      elo_history: {
        Row: {
          created_at: string
          elo_after: number
          elo_before: number
          id: string
          tournament_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          elo_after: number
          elo_before: number
          id?: string
          tournament_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          elo_after?: number
          elo_before?: number
          id?: string
          tournament_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elo_history_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_permissions: {
        Row: {
          can_create_problems: boolean
          can_create_tournaments: boolean
          can_delete_problems: boolean
          can_edit_problems: boolean
          can_edit_tournaments: boolean
          can_manage_users: boolean
          can_moderate_discussions: boolean
          can_view_discussions: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create_problems?: boolean
          can_create_tournaments?: boolean
          can_delete_problems?: boolean
          can_edit_problems?: boolean
          can_edit_tournaments?: boolean
          can_manage_users?: boolean
          can_moderate_discussions?: boolean
          can_view_discussions?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create_problems?: boolean
          can_create_tournaments?: boolean
          can_delete_problems?: boolean
          can_edit_problems?: boolean
          can_edit_tournaments?: boolean
          can_manage_users?: boolean
          can_moderate_discussions?: boolean
          can_view_discussions?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      penalty_logs: {
        Row: {
          created_at: string
          id: string
          penalty_type: Database["public"]["Enums"]["penalty_type"]
          tournament_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          penalty_type: Database["public"]["Enums"]["penalty_type"]
          tournament_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          penalty_type?: Database["public"]["Enums"]["penalty_type"]
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalty_logs_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          elo_rating: number
          email: string | null
          global_rank: number | null
          id: string
          penalty_strikes: number
          updated_at: string
          username: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          elo_rating?: number
          email?: string | null
          global_rank?: number | null
          id: string
          penalty_strikes?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          elo_rating?: number
          email?: string | null
          global_rank?: number | null
          id?: string
          penalty_strikes?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          answer_type: Database["public"]["Enums"]["answer_type"]
          category: Database["public"]["Enums"]["question_category"]
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty_weight: number
          id: string
          multiple_choice_options: Json | null
          problem_image_url: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["question_visibility"]
        }
        Insert: {
          answer_type?: Database["public"]["Enums"]["answer_type"]
          category?: Database["public"]["Enums"]["question_category"]
          correct_answer: string
          created_at?: string
          created_by?: string | null
          difficulty_weight?: number
          id?: string
          multiple_choice_options?: Json | null
          problem_image_url?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["question_visibility"]
        }
        Update: {
          answer_type?: Database["public"]["Enums"]["answer_type"]
          category?: Database["public"]["Enums"]["question_category"]
          correct_answer?: string
          created_at?: string
          created_by?: string | null
          difficulty_weight?: number
          id?: string
          multiple_choice_options?: Json | null
          problem_image_url?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["question_visibility"]
        }
        Relationships: []
      }
      submissions: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          submitted_answer: string | null
          time_taken_seconds: number | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          submitted_answer?: string | null
          time_taken_seconds?: number | null
          tournament_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          submitted_answer?: string | null
          time_taken_seconds?: number | null
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          id: string
          registered_at: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          registered_at?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          registered_at?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_questions: {
        Row: {
          id: string
          question_id: string
          question_order: number
          tournament_id: string
        }
        Insert: {
          id?: string
          question_id: string
          question_order?: number
          tournament_id: string
        }
        Update: {
          id?: string
          question_id?: string
          question_order?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_questions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          allowed_roles: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          end_timestamp: string
          id: string
          start_timestamp: string
          status: Database["public"]["Enums"]["tournament_status"]
          telegram_link: string | null
          time_limit_minutes: number
          title: string
          tournament_type: Database["public"]["Enums"]["tournament_type"]
          updated_at: string
        }
        Insert: {
          allowed_roles?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_timestamp: string
          id?: string
          start_timestamp: string
          status?: Database["public"]["Enums"]["tournament_status"]
          telegram_link?: string | null
          time_limit_minutes?: number
          title: string
          tournament_type?: Database["public"]["Enums"]["tournament_type"]
          updated_at?: string
        }
        Update: {
          allowed_roles?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_timestamp?: string
          id?: string
          start_timestamp?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          telegram_link?: string | null
          time_limit_minutes?: number
          title?: string
          tournament_type?: Database["public"]["Enums"]["tournament_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_elo_changes: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_moderator: { Args: { _user_id: string }; Returns: boolean }
      update_global_ranks: { Args: never; Returns: undefined }
    }
    Enums: {
      account_status: "active" | "suspended"
      answer_type: "text" | "multiple_choice"
      app_role: "admin" | "moderator" | "competitor"
      penalty_type: "fullscreen_exit" | "tab_switch" | "devtools"
      question_category:
        | "number_theory"
        | "algebra"
        | "combinatorics"
        | "geometry"
      question_visibility: "draft" | "published"
      tournament_status: "upcoming" | "active" | "completed"
      tournament_type: "tournament" | "olympiad" | "jee"
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
    Enums: {
      account_status: ["active", "suspended"],
      answer_type: ["text", "multiple_choice"],
      app_role: ["admin", "moderator", "competitor"],
      penalty_type: ["fullscreen_exit", "tab_switch", "devtools"],
      question_category: [
        "number_theory",
        "algebra",
        "combinatorics",
        "geometry",
      ],
      question_visibility: ["draft", "published"],
      tournament_status: ["upcoming", "active", "completed"],
      tournament_type: ["tournament", "olympiad", "jee"],
    },
  },
} as const
