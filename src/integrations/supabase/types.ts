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
      matches: {
        Row: {
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          drug_name: string
          explanation: string | null
          id: string
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
          id: string
          imprint: string
          notes: string | null
          shape: Database["public"]["Enums"]["pill_shape"]
        }
        Insert: {
          color?: Database["public"]["Enums"]["pill_color"]
          created_at?: string
          drug_name: string
          id?: string
          imprint: string
          notes?: string | null
          shape?: Database["public"]["Enums"]["pill_shape"]
        }
        Update: {
          color?: Database["public"]["Enums"]["pill_color"]
          created_at?: string
          drug_name?: string
          id?: string
          imprint?: string
          notes?: string | null
          shape?: Database["public"]["Enums"]["pill_shape"]
        }
        Relationships: []
      }
      reports: {
        Row: {
          color: Database["public"]["Enums"]["pill_color"] | null
          created_at: string
          has_reference_object: boolean | null
          id: string
          image_quality: Database["public"]["Enums"]["image_quality"] | null
          imprint_text: string | null
          notes: string | null
          photo_url: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          shape: Database["public"]["Enums"]["pill_shape"] | null
          user_id: string | null
        }
        Insert: {
          color?: Database["public"]["Enums"]["pill_color"] | null
          created_at?: string
          has_reference_object?: boolean | null
          id?: string
          image_quality?: Database["public"]["Enums"]["image_quality"] | null
          imprint_text?: string | null
          notes?: string | null
          photo_url?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          shape?: Database["public"]["Enums"]["pill_shape"] | null
          user_id?: string | null
        }
        Update: {
          color?: Database["public"]["Enums"]["pill_color"] | null
          created_at?: string
          has_reference_object?: boolean | null
          id?: string
          image_quality?: Database["public"]["Enums"]["image_quality"] | null
          imprint_text?: string | null
          notes?: string | null
          photo_url?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          shape?: Database["public"]["Enums"]["pill_shape"] | null
          user_id?: string | null
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
