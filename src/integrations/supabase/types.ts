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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          request_count: number
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          label: string
          last_used_at?: string | null
          request_count?: number
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          request_count?: number
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      buddy_alerts: {
        Row: {
          contacts_notified: Json
          id: string
          message: string
          report_id: string | null
          sent_at: string
          user_id: string
        }
        Insert: {
          contacts_notified?: Json
          id?: string
          message: string
          report_id?: string | null
          sent_at?: string
          user_id: string
        }
        Update: {
          contacts_notified?: Json
          id?: string
          message?: string
          report_id?: string | null
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buddy_alerts_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      community_submissions: {
        Row: {
          back_photo_url: string | null
          color: Database["public"]["Enums"]["pill_color"]
          created_at: string
          drug_name: string
          id: string
          imprint: string
          notes: string | null
          photo_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          shape: Database["public"]["Enums"]["pill_shape"]
          status: string
          user_id: string
        }
        Insert: {
          back_photo_url?: string | null
          color?: Database["public"]["Enums"]["pill_color"]
          created_at?: string
          drug_name: string
          id?: string
          imprint: string
          notes?: string | null
          photo_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          shape?: Database["public"]["Enums"]["pill_shape"]
          status?: string
          user_id: string
        }
        Update: {
          back_photo_url?: string | null
          color?: Database["public"]["Enums"]["pill_color"]
          created_at?: string
          drug_name?: string
          id?: string
          imprint?: string
          notes?: string | null
          photo_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          shape?: Database["public"]["Enums"]["pill_shape"]
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      counterfeit_reports: {
        Row: {
          city: string | null
          created_at: string
          drug_name: string | null
          id: string
          is_anonymous: boolean
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          photo_url: string | null
          report_id: string | null
          risk_level: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          drug_name?: string | null
          id?: string
          is_anonymous?: boolean
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          photo_url?: string | null
          report_id?: string | null
          risk_level?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          drug_name?: string | null
          id?: string
          is_anonymous?: boolean
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          photo_url?: string | null
          report_id?: string | null
          risk_level?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counterfeit_reports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_info_cache: {
        Row: {
          adverse_events_data: Json | null
          created_at: string
          drug_name: string
          fetched_at: string
          id: string
          label_data: Json | null
        }
        Insert: {
          adverse_events_data?: Json | null
          created_at?: string
          drug_name: string
          fetched_at?: string
          id?: string
          label_data?: Json | null
        }
        Update: {
          adverse_events_data?: Json | null
          created_at?: string
          drug_name?: string
          fetched_at?: string
          id?: string
          label_data?: Json | null
        }
        Relationships: []
      }
      education_posts: {
        Row: {
          body: string
          created_at: string
          id: string
          slug: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      match_feedback: {
        Row: {
          created_at: string
          helpful: boolean
          id: string
          match_id: string | null
          report_id: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          helpful: boolean
          id?: string
          match_id?: string | null
          report_id: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          helpful?: boolean
          id?: string
          match_id?: string | null
          report_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_feedback_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_feedback_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          drug_name: string
          explanation: string | null
          id: string
          match_reasons: string | null
          matched_color: Database["public"]["Enums"]["pill_color"] | null
          matched_imprint: string | null
          matched_shape: Database["public"]["Enums"]["pill_shape"] | null
          rank: number
          report_id: string
        }
        Insert: {
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          drug_name: string
          explanation?: string | null
          id?: string
          match_reasons?: string | null
          matched_color?: Database["public"]["Enums"]["pill_color"] | null
          matched_imprint?: string | null
          matched_shape?: Database["public"]["Enums"]["pill_shape"] | null
          rank: number
          report_id: string
        }
        Update: {
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          drug_name?: string
          explanation?: string | null
          id?: string
          match_reasons?: string | null
          matched_color?: Database["public"]["Enums"]["pill_color"] | null
          matched_imprint?: string | null
          matched_shape?: Database["public"]["Enums"]["pill_shape"] | null
          rank?: number
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      pill_reference: {
        Row: {
          color: Database["public"]["Enums"]["pill_color"]
          created_at: string
          drug_name: string
          external_id: string | null
          id: string
          imprint: string
          last_synced: string | null
          logo_description: string | null
          ndc_code: string | null
          notes: string | null
          requires_higher_confidence: boolean
          scoring: Database["public"]["Enums"]["pill_scoring"] | null
          shape: Database["public"]["Enums"]["pill_shape"]
          size_mm: number | null
          source: string | null
          thickness_mm: number | null
        }
        Insert: {
          color?: Database["public"]["Enums"]["pill_color"]
          created_at?: string
          drug_name: string
          external_id?: string | null
          id?: string
          imprint: string
          last_synced?: string | null
          logo_description?: string | null
          ndc_code?: string | null
          notes?: string | null
          requires_higher_confidence?: boolean
          scoring?: Database["public"]["Enums"]["pill_scoring"] | null
          shape?: Database["public"]["Enums"]["pill_shape"]
          size_mm?: number | null
          source?: string | null
          thickness_mm?: number | null
        }
        Update: {
          color?: Database["public"]["Enums"]["pill_color"]
          created_at?: string
          drug_name?: string
          external_id?: string | null
          id?: string
          imprint?: string
          last_synced?: string | null
          logo_description?: string | null
          ndc_code?: string | null
          notes?: string | null
          requires_higher_confidence?: boolean
          scoring?: Database["public"]["Enums"]["pill_scoring"] | null
          shape?: Database["public"]["Enums"]["pill_shape"]
          size_mm?: number | null
          source?: string | null
          thickness_mm?: number | null
        }
        Relationships: []
      }
      pill_reference_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          pill_reference_id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          pill_reference_id: string
          source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          pill_reference_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pill_reference_images_pill_reference_id_fkey"
            columns: ["pill_reference_id"]
            isOneToOne: false
            referencedRelation: "pill_reference"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          anomaly_reasons: string[] | null
          anomaly_score: number | null
          back_photo_url: string | null
          color: Database["public"]["Enums"]["pill_color"] | null
          created_at: string
          detected_logos: Json | null
          estimated_size_mm: number | null
          has_reference_object: boolean | null
          id: string
          image_quality: Database["public"]["Enums"]["image_quality"] | null
          imprint_text: string | null
          match_confidence:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          notes: string | null
          photo_url: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          risk_reasons: string[] | null
          scoring: Database["public"]["Enums"]["pill_scoring"] | null
          shape: Database["public"]["Enums"]["pill_shape"] | null
          shared: boolean
          user_id: string | null
        }
        Insert: {
          anomaly_reasons?: string[] | null
          anomaly_score?: number | null
          back_photo_url?: string | null
          color?: Database["public"]["Enums"]["pill_color"] | null
          created_at?: string
          detected_logos?: Json | null
          estimated_size_mm?: number | null
          has_reference_object?: boolean | null
          id?: string
          image_quality?: Database["public"]["Enums"]["image_quality"] | null
          imprint_text?: string | null
          match_confidence?:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          notes?: string | null
          photo_url?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          risk_reasons?: string[] | null
          scoring?: Database["public"]["Enums"]["pill_scoring"] | null
          shape?: Database["public"]["Enums"]["pill_shape"] | null
          shared?: boolean
          user_id?: string | null
        }
        Update: {
          anomaly_reasons?: string[] | null
          anomaly_score?: number | null
          back_photo_url?: string | null
          color?: Database["public"]["Enums"]["pill_color"] | null
          created_at?: string
          detected_logos?: Json | null
          estimated_size_mm?: number | null
          has_reference_object?: boolean | null
          id?: string
          image_quality?: Database["public"]["Enums"]["image_quality"] | null
          imprint_text?: string | null
          match_confidence?:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          notes?: string | null
          photo_url?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          risk_reasons?: string[] | null
          scoring?: Database["public"]["Enums"]["pill_scoring"] | null
          shape?: Database["public"]["Enums"]["pill_shape"] | null
          shared?: boolean
          user_id?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          delivered_at: string
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          status_code: number | null
          success: boolean
          webhook_id: string
        }
        Insert: {
          delivered_at?: string
          event_type: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          success?: boolean
          webhook_id: string
        }
        Update: {
          delivered_at?: string
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          success?: boolean
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          label: string
          secret: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          label?: string
          secret?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          label?: string
          secret?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fuzzy_imprint_search: {
        Args: {
          max_results?: number
          search_text: string
          similarity_threshold?: number
        }
        Returns: {
          color: Database["public"]["Enums"]["pill_color"]
          created_at: string
          drug_name: string
          external_id: string
          id: string
          imprint: string
          last_synced: string
          logo_description: string
          ndc_code: string
          notes: string
          scoring: Database["public"]["Enums"]["pill_scoring"]
          shape: Database["public"]["Enums"]["pill_shape"]
          similarity: number
          size_mm: number
          source: string
          thickness_mm: number
        }[]
      }
      get_feedback_stats: {
        Args: { days_back?: number }
        Returns: {
          drug_name: string
          helpful_count: number
          unhelpful_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      confidence_level: "low" | "medium" | "high"
      image_quality: "good" | "fair" | "poor"
      pill_color:
        | "white"
        | "blue"
        | "yellow"
        | "pink"
        | "green"
        | "orange"
        | "red"
        | "purple"
        | "gray"
        | "brown"
        | "tan"
        | "multicolor"
        | "other"
      pill_scoring: "none" | "single" | "double" | "quad" | "other"
      pill_shape:
        | "round"
        | "oval"
        | "capsule"
        | "diamond"
        | "triangle"
        | "hexagon"
        | "rectangle"
        | "other"
      risk_level: "low" | "medium" | "high"
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
      app_role: ["admin", "moderator", "user"],
      confidence_level: ["low", "medium", "high"],
      image_quality: ["good", "fair", "poor"],
      pill_color: [
        "white",
        "blue",
        "yellow",
        "pink",
        "green",
        "orange",
        "red",
        "purple",
        "gray",
        "brown",
        "tan",
        "multicolor",
        "other",
      ],
      pill_scoring: ["none", "single", "double", "quad", "other"],
      pill_shape: [
        "round",
        "oval",
        "capsule",
        "diamond",
        "triangle",
        "hexagon",
        "rectangle",
        "other",
      ],
      risk_level: ["low", "medium", "high"],
    },
  },
} as const
