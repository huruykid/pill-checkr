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
          evidence_tier: string
          hex_cell: string | null
          hex_res: number | null
          hidden: boolean
          id: string
          imprint: string | null
          is_anonymous: boolean
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          occurred_on: string | null
          photo_url: string | null
          report_id: string | null
          report_type: string
          risk_level: string | null
          source: string | null
          state: string | null
          strip_result: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          drug_name?: string | null
          evidence_tier?: string
          hex_cell?: string | null
          hex_res?: number | null
          hidden?: boolean
          id?: string
          imprint?: string | null
          is_anonymous?: boolean
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          occurred_on?: string | null
          photo_url?: string | null
          report_id?: string | null
          report_type?: string
          risk_level?: string | null
          source?: string | null
          state?: string | null
          strip_result?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          drug_name?: string | null
          evidence_tier?: string
          hex_cell?: string | null
          hex_res?: number | null
          hidden?: boolean
          id?: string
          imprint?: string | null
          is_anonymous?: boolean
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          occurred_on?: string | null
          photo_url?: string | null
          report_id?: string | null
          report_type?: string
          risk_level?: string | null
          source?: string | null
          state?: string | null
          strip_result?: string | null
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
      county_centroids: {
        Row: {
          fips: string
          lat: number
          lon: number
        }
        Insert: {
          fips: string
          lat: number
          lon: number
        }
        Update: {
          fips?: string
          lat?: number
          lon?: number
        }
        Relationships: []
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
      external_reports: {
        Row: {
          collected_on: string | null
          completed_on: string | null
          county: string | null
          geo_precision: string
          id: string
          image_url: string | null
          is_pill: boolean
          lab_flags: Json
          lat: number | null
          lon: number | null
          raw: Json
          sample_type: string | null
          shape_version: number
          source_id: string
          source_record_id: string
          state: string | null
          substance_expected: string | null
          substances_detected: string[]
          synced_at: string
        }
        Insert: {
          collected_on?: string | null
          completed_on?: string | null
          county?: string | null
          geo_precision?: string
          id?: string
          image_url?: string | null
          is_pill?: boolean
          lab_flags?: Json
          lat?: number | null
          lon?: number | null
          raw?: Json
          sample_type?: string | null
          shape_version?: number
          source_id: string
          source_record_id: string
          state?: string | null
          substance_expected?: string | null
          substances_detected?: string[]
          synced_at?: string
        }
        Update: {
          collected_on?: string | null
          completed_on?: string | null
          county?: string | null
          geo_precision?: string
          id?: string
          image_url?: string | null
          is_pill?: boolean
          lab_flags?: Json
          lat?: number | null
          lon?: number | null
          raw?: Json
          sample_type?: string | null
          shape_version?: number
          source_id?: string
          source_record_id?: string
          state?: string | null
          substance_expected?: string | null
          substances_detected?: string[]
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_reports_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "external_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      external_sources: {
        Row: {
          attribution_text: string
          created_at: string
          data_url: string
          description: string
          enabled: boolean
          homepage_url: string
          id: string
          last_synced_at: string | null
          license_note: string
          name: string
          organization: string
        }
        Insert: {
          attribution_text: string
          created_at?: string
          data_url: string
          description: string
          enabled?: boolean
          homepage_url: string
          id: string
          last_synced_at?: string | null
          license_note: string
          name: string
          organization: string
        }
        Update: {
          attribution_text?: string
          created_at?: string
          data_url?: string
          description?: string
          enabled?: boolean
          homepage_url?: string
          id?: string
          last_synced_at?: string | null
          license_note?: string
          name?: string
          organization?: string
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
      overdose_county_periods: {
        Row: {
          county: string | null
          data_as_of: string | null
          deaths: number | null
          fips: string
          footnote: string | null
          pct_pending: number | null
          period_end: string
          state: string | null
          synced_at: string
        }
        Insert: {
          county?: string | null
          data_as_of?: string | null
          deaths?: number | null
          fips: string
          footnote?: string | null
          pct_pending?: number | null
          period_end: string
          state?: string | null
          synced_at?: string
        }
        Update: {
          county?: string | null
          data_as_of?: string | null
          deaths?: number | null
          fips?: string
          footnote?: string | null
          pct_pending?: number | null
          period_end?: string
          state?: string | null
          synced_at?: string
        }
        Relationships: []
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
      report_locations: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          place_type: string | null
          precision: string
          report_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          place_type?: string | null
          precision?: string
          report_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          place_type?: string | null
          precision?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_locations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "counterfeit_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_locations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "counterfeit_reports_public"
            referencedColumns: ["id"]
          },
        ]
      }
      report_throttle: {
        Row: {
          created_at: string
          id: number
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: never
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: never
          ip_hash?: string
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
      test_strip_results: {
        Row: {
          created_at: string
          id: string
          report_id: string
          result: string
          session_id: string | null
          strip_brand: string | null
          test_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          report_id: string
          result: string
          session_id?: string | null
          strip_brand?: string | null
          test_type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          report_id?: string
          result?: string
          session_id?: string | null
          strip_brand?: string | null
          test_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_strip_results_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks_safe"
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
      counterfeit_reports_public: {
        Row: {
          city: string | null
          created_at: string | null
          drug_name: string | null
          evidence_tier: string | null
          hex_cell: string | null
          id: string | null
          imprint: string | null
          occurred_on: string | null
          report_type: string | null
          risk_level: string | null
          state: string | null
          strip_result: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          drug_name?: string | null
          evidence_tier?: string | null
          hex_cell?: string | null
          id?: string | null
          imprint?: string | null
          occurred_on?: string | null
          report_type?: string | null
          risk_level?: string | null
          state?: string | null
          strip_result?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          drug_name?: string | null
          evidence_tier?: string | null
          hex_cell?: string | null
          id?: string | null
          imprint?: string | null
          occurred_on?: string | null
          report_type?: string | null
          risk_level?: string | null
          state?: string | null
          strip_result?: string | null
        }
        Relationships: []
      }
      external_reports_public: {
        Row: {
          collected_on: string | null
          county: string | null
          geo_precision: string | null
          id: string | null
          image_url: string | null
          is_pill: boolean | null
          lab_flags: Json | null
          lat: number | null
          lon: number | null
          sample_type: string | null
          source_id: string | null
          state: string | null
          substance_expected: string | null
          substances_detected: string[] | null
        }
        Insert: {
          collected_on?: string | null
          county?: string | null
          geo_precision?: string | null
          id?: string | null
          image_url?: string | null
          is_pill?: boolean | null
          lab_flags?: Json | null
          lat?: number | null
          lon?: number | null
          sample_type?: string | null
          source_id?: string | null
          state?: string | null
          substance_expected?: string | null
          substances_detected?: string[] | null
        }
        Update: {
          collected_on?: string | null
          county?: string | null
          geo_precision?: string | null
          id?: string | null
          image_url?: string | null
          is_pill?: boolean | null
          lab_flags?: Json | null
          lat?: number | null
          lon?: number | null
          sample_type?: string | null
          source_id?: string | null
          state?: string | null
          substance_expected?: string | null
          substances_detected?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "external_reports_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "external_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      external_reports_state_counts: {
        Row: {
          n: number | null
          state: string | null
        }
        Relationships: []
      }
      overdose_county_latest: {
        Row: {
          county: string | null
          data_as_of: string | null
          deaths: number | null
          deaths_prior: number | null
          fips: string | null
          footnote: string | null
          lat: number | null
          lon: number | null
          pct_pending: number | null
          period_end: string | null
          state: string | null
        }
        Relationships: []
      }
      report_map_public: {
        Row: {
          evidence_tier: string | null
          hex_cell: string | null
          hex_res: number | null
          last_reported_on: string | null
          report_count: number | null
          report_type: string | null
          state: string | null
          strip_result: string | null
        }
        Relationships: []
      }
      webhooks_safe: {
        Row: {
          created_at: string | null
          events: string[] | null
          id: string | null
          is_active: boolean | null
          label: string | null
          updated_at: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          events?: string[] | null
          id?: string | null
          is_active?: boolean | null
          label?: string | null
          updated_at?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          events?: string[] | null
          id?: string | null
          is_active?: boolean | null
          label?: string | null
          updated_at?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      purge_expired_report_locations: { Args: never; Returns: number }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
