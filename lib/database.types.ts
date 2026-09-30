// Generated from the Supabase project schema. Regenerate after every migration
// (CLAUDE.md §5). Do not edit by hand.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      conferences: {
        Row: { created_at: string; id: string; name: string; short_name: string; sort_order: number; tier: string }
        Insert: { created_at?: string; id: string; name: string; short_name: string; sort_order?: number; tier: string }
        Update: { created_at?: string; id?: string; name?: string; short_name?: string; sort_order?: number; tier?: string }
        Relationships: []
      }
      drop_tables: {
        Row: { created_at: string; enabled: boolean; entries: Json; id: string; name: string }
        Insert: { created_at?: string; enabled?: boolean; entries?: Json; id: string; name: string }
        Update: { created_at?: string; enabled?: boolean; entries?: Json; id?: string; name?: string }
        Relationships: []
      }
      facilities: {
        Row: { description: string; id: string; name: string; sort_order: number }
        Insert: { description: string; id: string; name: string; sort_order?: number }
        Update: { description?: string; id?: string; name?: string; sort_order?: number }
        Relationships: []
      }
      facility_levels: {
        Row: { cost: number; duration_seconds: number; facility_id: string; income_per_hour: number | null; level: number; power: number | null }
        Insert: { cost: number; duration_seconds: number; facility_id: string; income_per_hour?: number | null; level: number; power?: number | null }
        Update: { cost?: number; duration_seconds?: number; facility_id?: string; income_per_hour?: number | null; level?: number; power?: number | null }
        Relationships: [
          { foreignKeyName: "facility_levels_facility_id_fkey"; columns: ["facility_id"]; isOneToOne: false; referencedRelation: "facilities"; referencedColumns: ["id"] },
        ]
      }
      faction_messages: {
        Row: { body: string; created_at: string; faction_id: string; id: number; program_id: string }
        Insert: { body: string; created_at?: string; faction_id: string; id?: never; program_id: string }
        Update: { body?: string; created_at?: string; faction_id?: string; id?: never; program_id?: string }
        Relationships: [
          { foreignKeyName: "faction_messages_faction_id_fkey"; columns: ["faction_id"]; isOneToOne: false; referencedRelation: "factions"; referencedColumns: ["id"] },
          { foreignKeyName: "faction_messages_program_id_fkey"; columns: ["program_id"]; isOneToOne: false; referencedRelation: "programs"; referencedColumns: ["id"] },
        ]
      }
      factions: {
        Row: { created_at: string; id: string; league_id: string; name: string; school_id: string }
        Insert: { created_at?: string; id?: string; league_id: string; name: string; school_id: string }
        Update: { created_at?: string; id?: string; league_id?: string; name?: string; school_id?: string }
        Relationships: [
          { foreignKeyName: "factions_league_id_fkey"; columns: ["league_id"]; isOneToOne: false; referencedRelation: "leagues"; referencedColumns: ["id"] },
          { foreignKeyName: "factions_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] },
        ]
      }
      game_config: {
        Row: { description: string; key: string; updated_at: string; value: Json }
        Insert: { description: string; key: string; updated_at?: string; value: Json }
        Update: { description?: string; key?: string; updated_at?: string; value?: Json }
        Relationships: []
      }
      house_programs: {
        Row: { created_at: string; league_id: string; school_id: string }
        Insert: { created_at?: string; league_id: string; school_id: string }
        Update: { created_at?: string; league_id?: string; school_id?: string }
        Relationships: [
          { foreignKeyName: "house_programs_league_id_fkey"; columns: ["league_id"]; isOneToOne: false; referencedRelation: "leagues"; referencedColumns: ["id"] },
          { foreignKeyName: "house_programs_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] },
        ]
      }
      league_seats: {
        Row: { faction_id: string; joined_at: string; last_active_at: string; league_id: string; program_id: string; role: string; status: string }
        Insert: { faction_id: string; joined_at?: string; last_active_at?: string; league_id: string; program_id: string; role?: string; status?: string }
        Update: { faction_id?: string; joined_at?: string; last_active_at?: string; league_id?: string; program_id?: string; role?: string; status?: string }
        Relationships: [
          { foreignKeyName: "league_seats_faction_id_fkey"; columns: ["faction_id"]; isOneToOne: false; referencedRelation: "factions"; referencedColumns: ["id"] },
          { foreignKeyName: "league_seats_league_id_fkey"; columns: ["league_id"]; isOneToOne: false; referencedRelation: "leagues"; referencedColumns: ["id"] },
          { foreignKeyName: "league_seats_program_id_fkey"; columns: ["program_id"]; isOneToOne: false; referencedRelation: "programs"; referencedColumns: ["id"] },
        ]
      }
      leagues: {
        Row: { conference_id: string; id: string; number: number; opened_at: string; settled_at: string | null }
        Insert: { conference_id: string; id?: string; number: number; opened_at?: string; settled_at?: string | null }
        Update: { conference_id?: string; id?: string; number?: number; opened_at?: string; settled_at?: string | null }
        Relationships: [
          { foreignKeyName: "leagues_conference_id_fkey"; columns: ["conference_id"]; isOneToOne: false; referencedRelation: "conferences"; referencedColumns: ["id"] },
        ]
      }
      profiles: {
        Row: { created_at: string; date_of_birth: string | null; display_name: string | null; id: string; updated_at: string }
        Insert: { created_at?: string; date_of_birth?: string | null; display_name?: string | null; id: string; updated_at?: string }
        Update: { created_at?: string; date_of_birth?: string | null; display_name?: string | null; id?: string; updated_at?: string }
        Relationships: []
      }
      program_facilities: {
        Row: { facility_id: string; level: number; program_id: string; upgrade_completes_at: string | null; upgrade_started_at: string | null; upgrade_to: number | null }
        Insert: { facility_id: string; level?: number; program_id: string; upgrade_completes_at?: string | null; upgrade_started_at?: string | null; upgrade_to?: number | null }
        Update: { facility_id?: string; level?: number; program_id?: string; upgrade_completes_at?: string | null; upgrade_started_at?: string | null; upgrade_to?: number | null }
        Relationships: [
          { foreignKeyName: "program_facilities_facility_id_fkey"; columns: ["facility_id"]; isOneToOne: false; referencedRelation: "facilities"; referencedColumns: ["id"] },
          { foreignKeyName: "program_facilities_program_id_fkey"; columns: ["program_id"]; isOneToOne: false; referencedRelation: "programs"; referencedColumns: ["id"] },
        ]
      }
      program_treasury: {
        Row: { cash: number; last_collected_at: string; last_scouted_at: string | null; program_id: string; updated_at: string }
        Insert: { cash?: number; last_collected_at?: string; last_scouted_at?: string | null; program_id: string; updated_at?: string }
        Update: { cash?: number; last_collected_at?: string; last_scouted_at?: string | null; program_id?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: "program_treasury_program_id_fkey"; columns: ["program_id"]; isOneToOne: true; referencedRelation: "programs"; referencedColumns: ["id"] },
        ]
      }
      programs: {
        Row: { account_id: string | null; created_at: string; emphasis_id: string | null; id: string; name: string; school_id: string; share_code: string | null; updated_at: string }
        Insert: { account_id?: string | null; created_at?: string; emphasis_id?: string | null; id?: string; name: string; school_id: string; share_code?: string | null; updated_at?: string }
        Update: { account_id?: string | null; created_at?: string; emphasis_id?: string | null; id?: string; name?: string; school_id?: string; share_code?: string | null; updated_at?: string }
        Relationships: [
          { foreignKeyName: "programs_emphasis_id_fkey"; columns: ["emphasis_id"]; isOneToOne: false; referencedRelation: "emphases"; referencedColumns: ["id"] },
          { foreignKeyName: "programs_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] },
        ]
      }
      purchasables: {
        Row: { config: Json; created_at: string; currency: string; enabled: boolean; id: string; kind: string; name: string; price_cents: number }
        Insert: { config?: Json; created_at?: string; currency?: string; enabled?: boolean; id: string; kind: string; name: string; price_cents: number }
        Update: { config?: Json; created_at?: string; currency?: string; enabled?: boolean; id?: string; kind?: string; name?: string; price_cents?: number }
        Relationships: []
      }
      rivalry_pairings: {
        Row: { rank: number; rival_school_id: string; school_id: string }
        Insert: { rank: number; rival_school_id: string; school_id: string }
        Update: { rank?: number; rival_school_id?: string; school_id?: string }
        Relationships: [
          { foreignKeyName: "rivalry_pairings_rival_school_id_fkey"; columns: ["rival_school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] },
          { foreignKeyName: "rivalry_pairings_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] },
        ]
      }
      schools: {
        Row: { city: string | null; conference_id: string; created_at: string; full_name: string; id: string; name: string; nickname: string; state: string | null }
        Insert: { city?: string | null; conference_id: string; created_at?: string; full_name: string; id: string; name: string; nickname: string; state?: string | null }
        Update: { city?: string | null; conference_id?: string; created_at?: string; full_name?: string; id?: string; name?: string; nickname?: string; state?: string | null }
        Relationships: [
          { foreignKeyName: "schools_conference_id_fkey"; columns: ["conference_id"]; isOneToOne: false; referencedRelation: "conferences"; referencedColumns: ["id"] },
        ]
      }
      season_weeks: {
        Row: { kind: string; locks_at: string; season_id: string; starts_on: string; week_number: number }
        Insert: { kind: string; locks_at: string; season_id: string; starts_on: string; week_number: number }
        Update: { kind?: string; locks_at?: string; season_id?: string; starts_on?: string; week_number?: number }
        Relationships: [
          { foreignKeyName: "season_weeks_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] },
        ]
      }
      seasons: {
        Row: { created_at: string; ends_on: string; id: string; starts_on: string; status: string; year: number }
        Insert: { created_at?: string; ends_on: string; id: string; starts_on: string; status?: string; year: number }
        Update: { created_at?: string; ends_on?: string; id?: string; starts_on?: string; status?: string; year?: number }
        Relationships: []
      }
      emphases: {
        Row: { blurb: string; id: string; name: string; pass_defense: number; passing: number; run_defense: number; rushing: number; sort_order: number }
        Insert: { blurb: string; id: string; name: string; pass_defense?: number; passing?: number; run_defense?: number; rushing?: number; sort_order?: number }
        Update: { blurb?: string; id?: string; name?: string; pass_defense?: number; passing?: number; run_defense?: number; rushing?: number; sort_order?: number }
        Relationships: []
      }
      facility_facets: {
        Row: { facility_id: string; pass_defense: number; passing: number; run_defense: number; rushing: number }
        Insert: { facility_id: string; pass_defense: number; passing: number; run_defense: number; rushing: number }
        Update: { facility_id?: string; pass_defense?: number; passing?: number; run_defense?: number; rushing?: number }
        Relationships: [
          { foreignKeyName: "facility_facets_facility_id_fkey"; columns: ["facility_id"]; isOneToOne: true; referencedRelation: "facilities"; referencedColumns: ["id"] },
        ]
      }
      games: {
        Row: { away_program_id: string; created_at: string; home_program_id: string; id: string; inputs: Json | null; kind: string; league_id: string | null; locks_at: string; resolved_at: string | null; result: Json | null; season_id: string; seed: number | null; status: string; week_number: number }
        Insert: { away_program_id: string; created_at?: string; home_program_id: string; id?: string; inputs?: Json | null; kind: string; league_id?: string | null; locks_at: string; resolved_at?: string | null; result?: Json | null; season_id: string; seed?: number | null; status?: string; week_number: number }
        Update: { away_program_id?: string; created_at?: string; home_program_id?: string; id?: string; inputs?: Json | null; kind?: string; league_id?: string | null; locks_at?: string; resolved_at?: string | null; result?: Json | null; season_id?: string; seed?: number | null; status?: string; week_number?: number }
        Relationships: [
          { foreignKeyName: "games_away_program_id_fkey"; columns: ["away_program_id"]; isOneToOne: false; referencedRelation: "programs"; referencedColumns: ["id"] },
          { foreignKeyName: "games_home_program_id_fkey"; columns: ["home_program_id"]; isOneToOne: false; referencedRelation: "programs"; referencedColumns: ["id"] },
          { foreignKeyName: "games_league_id_fkey"; columns: ["league_id"]; isOneToOne: false; referencedRelation: "leagues"; referencedColumns: ["id"] },
          { foreignKeyName: "games_season_id_fkey"; columns: ["season_id"]; isOneToOne: false; referencedRelation: "seasons"; referencedColumns: ["id"] },
        ]
      }
      program_staff: {
        Row: { level: number; program_id: string; shards: number; staff_id: string; stars: number; updated_at: string }
        Insert: { level?: number; program_id: string; shards?: number; staff_id: string; stars?: number; updated_at?: string }
        Update: { level?: number; program_id?: string; shards?: number; staff_id?: string; stars?: number; updated_at?: string }
        Relationships: [
          { foreignKeyName: "program_staff_program_id_fkey"; columns: ["program_id"]; isOneToOne: false; referencedRelation: "programs"; referencedColumns: ["id"] },
          { foreignKeyName: "program_staff_staff_id_fkey"; columns: ["staff_id"]; isOneToOne: false; referencedRelation: "staff"; referencedColumns: ["id"] },
        ]
      }
      staff: {
        Row: { base_power: number; id: string; max_level: number; max_stars: number; name: string; pass_defense: number; passing: number; power_per_level: number; rarity: string; role: string; run_defense: number; rushing: number; sort_order: number; star_shards: number; unlock_shards: number }
        Insert: { base_power: number; id: string; max_level?: number; max_stars?: number; name: string; pass_defense: number; passing: number; power_per_level: number; rarity: string; role: string; run_defense: number; rushing: number; sort_order?: number; star_shards: number; unlock_shards: number }
        Update: { base_power?: number; id?: string; max_level?: number; max_stars?: number; name?: string; pass_defense?: number; passing?: number; power_per_level?: number; rarity?: string; role?: string; run_defense?: number; rushing?: number; sort_order?: number; star_shards?: number; unlock_shards?: number }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      challenge_by_code: { Args: { p_code: string }; Returns: string }
      current_week: { Args: never; Returns: { kind: string; locks_at: string; season_id: string; week_number: number }[] }
      effective_facets: { Args: { p_program_id: string }; Returns: { emphasis_id: string; pass_defense: number; passing: number; run_defense: number; rushing: number; total: number }[] }
      facet_powers: { Args: { p_program_id: string }; Returns: { pass_defense: number; passing: number; run_defense: number; rushing: number; total: number }[] }
      is_opponent: { Args: { p_program_id: string }; Returns: boolean }
      level_up_staff: { Args: { p_staff_id: string }; Returns: { cash: number; level: number; staff_id: string }[] }
      make_share_code: { Args: never; Returns: string }
      replay_game: { Args: { p_game_id: string }; Returns: { away_score: number; home_score: number; matches: boolean }[] }
      resolve_due_games: { Args: never; Returns: number }
      resolve_game: { Args: { p_game_id: string }; Returns: undefined }
      run_maintenance: { Args: never; Returns: { games_resolved: number; seats_swept: number }[] }
      scout: { Args: never; Returns: { next_scout_at: string; shards: number; shards_granted: number; staff_id: string }[] }
      set_emphasis: { Args: { p_emphasis_id: string }; Returns: undefined }
      staff_level_cost: { Args: { p_level: number }; Returns: number }
      staff_power: { Args: { p_base: number; p_level: number; p_per_level: number; p_stars: number }; Returns: number }
      star_up_staff: { Args: { p_staff_id: string }; Returns: { shards: number; staff_id: string; stars: number }[] }
      claim_upgrade: { Args: { p_facility_id: string }; Returns: { facility_id: string; level: number }[] }
      collect_income: { Args: never; Returns: { cash: number; collected: number; income_per_hour: number }[] }
      config_int: { Args: { p_default: number; p_key: string }; Returns: number }
      faction_roster: {
        Args: { p_faction_id: string }
        Returns: { display_name: string; is_me: boolean; joined_at: string; last_active_at: string; program_id: string; program_name: string; role: string }[]
      }
      is_faction_mate: { Args: { p_program_id: string }; Returns: boolean }
      is_faction_member: { Args: { p_faction_id: string }; Returns: boolean }
      is_minor: { Args: { dob: string }; Returns: boolean }
      my_program_id: { Args: never; Returns: string }
      place_my_program: { Args: never; Returns: string }
      place_program: { Args: { p_program_id: string }; Returns: string }
      program_power: { Args: { p_program_id: string }; Returns: number }
      start_upgrade: {
        Args: { p_facility_id: string }
        Returns: { cash: number; facility_id: string; upgrade_completes_at: string; upgrade_to: number }[]
      }
      sweep_dormant_seats: { Args: never; Returns: number }
      touch_activity: { Args: { p_program_id: string }; Returns: undefined }
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
    Enums: {},
  },
} as const
