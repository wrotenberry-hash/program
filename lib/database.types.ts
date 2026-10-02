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
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_tokens: {
        Row: {
          created_at: string
          purpose: string
          token_sha256: string
        }
        Insert: {
          created_at?: string
          purpose: string
          token_sha256: string
        }
        Update: {
          created_at?: string
          purpose?: string
          token_sha256?: string
        }
        Relationships: []
      }
      conferences: {
        Row: {
          created_at: string
          id: string
          name: string
          short_name: string
          sort_order: number
          tier: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          short_name: string
          sort_order?: number
          tier: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          short_name?: string
          sort_order?: number
          tier?: string
        }
        Relationships: []
      }
      daily_task_types: {
        Row: {
          detector: string
          enabled: boolean
          id: string
          label: string
          reward_cash: number
          sort_order: number
        }
        Insert: {
          detector: string
          enabled?: boolean
          id: string
          label: string
          reward_cash: number
          sort_order?: number
        }
        Update: {
          detector?: string
          enabled?: boolean
          id?: string
          label?: string
          reward_cash?: number
          sort_order?: number
        }
        Relationships: []
      }
      drop_tables: {
        Row: {
          created_at: string
          enabled: boolean
          entries: Json
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          entries?: Json
          id: string
          name: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          entries?: Json
          id?: string
          name?: string
        }
        Relationships: []
      }
      emphases: {
        Row: {
          blurb: string
          id: string
          name: string
          pass_defense: number
          passing: number
          run_defense: number
          rushing: number
          sort_order: number
        }
        Insert: {
          blurb: string
          id: string
          name: string
          pass_defense?: number
          passing?: number
          run_defense?: number
          rushing?: number
          sort_order?: number
        }
        Update: {
          blurb?: string
          id?: string
          name?: string
          pass_defense?: number
          passing?: number
          run_defense?: number
          rushing?: number
          sort_order?: number
        }
        Relationships: []
      }
      facilities: {
        Row: {
          description: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          description: string
          id: string
          name: string
          sort_order?: number
        }
        Update: {
          description?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      facility_facets: {
        Row: {
          facility_id: string
          pass_defense: number
          passing: number
          run_defense: number
          rushing: number
        }
        Insert: {
          facility_id: string
          pass_defense: number
          passing: number
          run_defense: number
          rushing: number
        }
        Update: {
          facility_id?: string
          pass_defense?: number
          passing?: number
          run_defense?: number
          rushing?: number
        }
        Relationships: [
          {
            foreignKeyName: "facility_facets_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_levels: {
        Row: {
          cost: number
          duration_seconds: number
          facility_id: string
          income_per_hour: number | null
          level: number
          power: number | null
        }
        Insert: {
          cost: number
          duration_seconds: number
          facility_id: string
          income_per_hour?: number | null
          level: number
          power?: number | null
        }
        Update: {
          cost?: number
          duration_seconds?: number
          facility_id?: string
          income_per_hour?: number | null
          level?: number
          power?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_levels_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_goal_claims: {
        Row: {
          claimed_at: string
          faction_id: string
          program_id: string
          reward: number
          season_id: string
          week_number: number
        }
        Insert: {
          claimed_at?: string
          faction_id: string
          program_id: string
          reward: number
          season_id: string
          week_number: number
        }
        Update: {
          claimed_at?: string
          faction_id?: string
          program_id?: string
          reward?: number
          season_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "faction_goal_claims_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_goal_claims_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_goal_claims_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_goal_types: {
        Row: {
          blurb: string
          enabled: boolean
          id: string
          label: string
          metric: string
          min_target: number
          per_member: number
          reward_cash: number
          sort_order: number
        }
        Insert: {
          blurb: string
          enabled?: boolean
          id: string
          label: string
          metric: string
          min_target: number
          per_member: number
          reward_cash: number
          sort_order?: number
        }
        Update: {
          blurb?: string
          enabled?: boolean
          id?: string
          label?: string
          metric?: string
          min_target?: number
          per_member?: number
          reward_cash?: number
          sort_order?: number
        }
        Relationships: []
      }
      faction_messages: {
        Row: {
          body: string
          created_at: string
          faction_id: string
          id: number
          program_id: string
        }
        Insert: {
          body: string
          created_at?: string
          faction_id: string
          id?: never
          program_id: string
        }
        Update: {
          body?: string
          created_at?: string
          faction_id?: string
          id?: never
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faction_messages_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_messages_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_season_finishes: {
        Row: {
          faction_id: string
          league_id: string
          losses: number
          place: number
          points: number
          recorded_at: string
          season_id: string
          wins: number
        }
        Insert: {
          faction_id: string
          league_id: string
          losses: number
          place: number
          points: number
          recorded_at?: string
          season_id: string
          wins: number
        }
        Update: {
          faction_id?: string
          league_id?: string
          losses?: number
          place?: number
          points?: number
          recorded_at?: string
          season_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "faction_season_finishes_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_season_finishes_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_season_finishes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_standings: {
        Row: {
          faction_id: string
          league_id: string
          losses: number
          points: number
          season_id: string
          updated_at: string
          wins: number
        }
        Insert: {
          faction_id: string
          league_id: string
          losses?: number
          points?: number
          season_id: string
          updated_at?: string
          wins?: number
        }
        Update: {
          faction_id?: string
          league_id?: string
          losses?: number
          points?: number
          season_id?: string
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "faction_standings_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_standings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_trophies: {
        Row: {
          awarded_at: string
          faction_id: string
          faction_points: number
          id: string
          kind: string
          opponent_faction_id: string | null
          opponent_points: number
          season_id: string
          week_number: number
        }
        Insert: {
          awarded_at?: string
          faction_id: string
          faction_points: number
          id?: string
          kind: string
          opponent_faction_id?: string | null
          opponent_points: number
          season_id: string
          week_number: number
        }
        Update: {
          awarded_at?: string
          faction_id?: string
          faction_points?: number
          id?: string
          kind?: string
          opponent_faction_id?: string | null
          opponent_points?: number
          season_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "faction_trophies_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_trophies_opponent_faction_id_fkey"
            columns: ["opponent_faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_trophies_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_weekly_goals: {
        Row: {
          faction_id: string
          goal_type_id: string
          season_id: string
          set_at: string
          set_by: string | null
          target: number
          week_number: number
        }
        Insert: {
          faction_id: string
          goal_type_id: string
          season_id: string
          set_at?: string
          set_by?: string | null
          target: number
          week_number: number
        }
        Update: {
          faction_id?: string
          goal_type_id?: string
          season_id?: string
          set_at?: string
          set_by?: string | null
          target?: number
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "faction_weekly_goals_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_weekly_goals_goal_type_id_fkey"
            columns: ["goal_type_id"]
            isOneToOne: false
            referencedRelation: "faction_goal_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_weekly_goals_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_weekly_goals_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      factions: {
        Row: {
          created_at: string
          id: string
          league_id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          account_id: string | null
          created_at: string
          display_name: string | null
          id: number
          note: string
          program_id: string | null
          screen: string
          user_agent: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: never
          note: string
          program_id?: string | null
          screen: string
          user_agent?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: never
          note?: string
          program_id?: string | null
          screen?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      game_config: {
        Row: {
          description: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      games: {
        Row: {
          away_faction_id: string | null
          away_program_id: string
          created_at: string
          home_faction_id: string | null
          home_program_id: string
          id: string
          inputs: Json | null
          kind: string
          league_id: string | null
          locks_at: string
          resolved_at: string | null
          result: Json | null
          season_id: string
          seed: number | null
          status: string
          void_reason: string | null
          voided_at: string | null
          week_number: number
        }
        Insert: {
          away_faction_id?: string | null
          away_program_id: string
          created_at?: string
          home_faction_id?: string | null
          home_program_id: string
          id?: string
          inputs?: Json | null
          kind: string
          league_id?: string | null
          locks_at: string
          resolved_at?: string | null
          result?: Json | null
          season_id: string
          seed?: number | null
          status?: string
          void_reason?: string | null
          voided_at?: string | null
          week_number: number
        }
        Update: {
          away_faction_id?: string | null
          away_program_id?: string
          created_at?: string
          home_faction_id?: string | null
          home_program_id?: string
          id?: string
          inputs?: Json | null
          kind?: string
          league_id?: string | null
          locks_at?: string
          resolved_at?: string | null
          result?: Json | null
          season_id?: string
          seed?: number | null
          status?: string
          void_reason?: string | null
          voided_at?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "games_away_faction_id_fkey"
            columns: ["away_faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_away_program_id_fkey"
            columns: ["away_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_faction_id_fkey"
            columns: ["home_faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_program_id_fkey"
            columns: ["home_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      house_programs: {
        Row: {
          created_at: string
          league_id: string
          program_id: string | null
          school_id: string
        }
        Insert: {
          created_at?: string
          league_id: string
          program_id?: string | null
          school_id: string
        }
        Update: {
          created_at?: string
          league_id?: string
          program_id?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_programs_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_programs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      league_seats: {
        Row: {
          faction_id: string
          joined_at: string
          last_active_at: string
          league_id: string
          program_id: string
          role: string
          status: string
        }
        Insert: {
          faction_id: string
          joined_at?: string
          last_active_at?: string
          league_id: string
          program_id: string
          role?: string
          status?: string
        }
        Update: {
          faction_id?: string
          joined_at?: string
          last_active_at?: string
          league_id?: string
          program_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_seats_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_seats_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_seats_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          conference_id: string
          id: string
          number: number
          opened_at: string
          settled_at: string | null
        }
        Insert: {
          conference_id: string
          id?: string
          number: number
          opened_at?: string
          settled_at?: string | null
        }
        Update: {
          conference_id?: string
          id?: string
          number?: number
          opened_at?: string
          settled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leagues_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      nation_ledger: {
        Row: {
          losses: number
          points: number
          school_id: string
          season_id: string
          week_number: number
          wins: number
        }
        Insert: {
          losses?: number
          points?: number
          school_id: string
          season_id: string
          week_number: number
          wins?: number
        }
        Update: {
          losses?: number
          points?: number
          school_id?: string
          season_id?: string
          week_number?: number
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "nation_ledger_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nation_ledger_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_daily_checkins: {
        Row: {
          claimed_at: string
          day: string
          program_id: string
          reward: number
          streak: number
        }
        Insert: {
          claimed_at?: string
          day: string
          program_id: string
          reward: number
          streak: number
        }
        Update: {
          claimed_at?: string
          day?: string
          program_id?: string
          reward?: number
          streak?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_daily_checkins_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_daily_task_claims: {
        Row: {
          claimed_at: string
          day: string
          program_id: string
          reward: number
          task_id: string
        }
        Insert: {
          claimed_at?: string
          day: string
          program_id: string
          reward: number
          task_id: string
        }
        Update: {
          claimed_at?: string
          day?: string
          program_id?: string
          reward?: number
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_daily_task_claims_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_daily_task_claims_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "daily_task_types"
            referencedColumns: ["id"]
          },
        ]
      }
      program_facilities: {
        Row: {
          facility_id: string
          last_started_at: string | null
          level: number
          program_id: string
          upgrade_completes_at: string | null
          upgrade_started_at: string | null
          upgrade_to: number | null
        }
        Insert: {
          facility_id: string
          last_started_at?: string | null
          level?: number
          program_id: string
          upgrade_completes_at?: string | null
          upgrade_started_at?: string | null
          upgrade_to?: number | null
        }
        Update: {
          facility_id?: string
          last_started_at?: string | null
          level?: number
          program_id?: string
          upgrade_completes_at?: string | null
          upgrade_started_at?: string | null
          upgrade_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_facilities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_facilities_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_season_rewards: {
        Row: {
          claimed_at: string | null
          faction_id: string | null
          games_played: number
          granted_at: string
          place: number | null
          place_cash: number
          played_cash: number
          program_id: string
          season_id: string
        }
        Insert: {
          claimed_at?: string | null
          faction_id?: string | null
          games_played: number
          granted_at?: string
          place?: number | null
          place_cash: number
          played_cash: number
          program_id: string
          season_id: string
        }
        Update: {
          claimed_at?: string | null
          faction_id?: string | null
          games_played?: number
          granted_at?: string
          place?: number | null
          place_cash?: number
          played_cash?: number
          program_id?: string
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_season_rewards_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_season_rewards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_season_rewards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      program_staff: {
        Row: {
          level: number
          program_id: string
          shards: number
          staff_id: string
          stars: number
          updated_at: string
        }
        Insert: {
          level?: number
          program_id: string
          shards?: number
          staff_id: string
          stars?: number
          updated_at?: string
        }
        Update: {
          level?: number
          program_id?: string
          shards?: number
          staff_id?: string
          stars?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_staff_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      program_treasury: {
        Row: {
          cash: number
          last_collect_action_at: string | null
          last_collected_at: string
          last_scouted_at: string | null
          program_id: string
          updated_at: string
        }
        Insert: {
          cash?: number
          last_collect_action_at?: string | null
          last_collected_at?: string
          last_scouted_at?: string | null
          program_id: string
          updated_at?: string
        }
        Update: {
          cash?: number
          last_collect_action_at?: string | null
          last_collected_at?: string
          last_scouted_at?: string | null
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_treasury_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          account_id: string | null
          created_at: string
          emphasis_id: string | null
          id: string
          is_house: boolean
          name: string
          school_id: string
          share_code: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          emphasis_id?: string | null
          id?: string
          is_house?: boolean
          name: string
          school_id: string
          share_code?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          emphasis_id?: string | null
          id?: string
          is_house?: boolean
          name?: string
          school_id?: string
          share_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_emphasis_id_fkey"
            columns: ["emphasis_id"]
            isOneToOne: false
            referencedRelation: "emphases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      purchasables: {
        Row: {
          config: Json
          created_at: string
          currency: string
          enabled: boolean
          id: string
          kind: string
          name: string
          price_cents: number
        }
        Insert: {
          config?: Json
          created_at?: string
          currency?: string
          enabled?: boolean
          id: string
          kind: string
          name: string
          price_cents: number
        }
        Update: {
          config?: Json
          created_at?: string
          currency?: string
          enabled?: boolean
          id?: string
          kind?: string
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      rivalry_pairings: {
        Row: {
          rank: number
          rival_school_id: string
          school_id: string
        }
        Insert: {
          rank: number
          rival_school_id: string
          school_id: string
        }
        Update: {
          rank?: number
          rival_school_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rivalry_pairings_rival_school_id_fkey"
            columns: ["rival_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rivalry_pairings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          city: string | null
          conference_id: string
          created_at: string
          full_name: string
          generic_name: string | null
          generic_nickname: string | null
          id: string
          name: string
          nickname: string
          state: string | null
        }
        Insert: {
          city?: string | null
          conference_id: string
          created_at?: string
          full_name: string
          generic_name?: string | null
          generic_nickname?: string | null
          id: string
          name: string
          nickname: string
          state?: string | null
        }
        Update: {
          city?: string | null
          conference_id?: string
          created_at?: string
          full_name?: string
          generic_name?: string | null
          generic_nickname?: string | null
          id?: string
          name?: string
          nickname?: string
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      season_weeks: {
        Row: {
          kind: string
          locks_at: string
          season_id: string
          starts_on: string
          week_number: number
        }
        Insert: {
          kind: string
          locks_at: string
          season_id: string
          starts_on: string
          week_number: number
        }
        Update: {
          kind?: string
          locks_at?: string
          season_id?: string
          starts_on?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_weeks_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          activated_at: string | null
          completed_at: string | null
          created_at: string
          ends_on: string
          id: string
          starts_on: string
          status: string
          year: number
        }
        Insert: {
          activated_at?: string | null
          completed_at?: string | null
          created_at?: string
          ends_on: string
          id: string
          starts_on: string
          status?: string
          year: number
        }
        Update: {
          activated_at?: string | null
          completed_at?: string | null
          created_at?: string
          ends_on?: string
          id?: string
          starts_on?: string
          status?: string
          year?: number
        }
        Relationships: []
      }
      staff: {
        Row: {
          base_power: number
          id: string
          max_level: number
          max_stars: number
          name: string
          pass_defense: number
          passing: number
          power_per_level: number
          rarity: string
          role: string
          run_defense: number
          rushing: number
          sort_order: number
          star_shards: number
          unlock_shards: number
        }
        Insert: {
          base_power: number
          id: string
          max_level?: number
          max_stars?: number
          name: string
          pass_defense: number
          passing: number
          power_per_level: number
          rarity: string
          role: string
          run_defense: number
          rushing: number
          sort_order?: number
          star_shards: number
          unlock_shards: number
        }
        Update: {
          base_power?: number
          id?: string
          max_level?: number
          max_stars?: number
          name?: string
          pass_defense?: number
          passing?: number
          power_per_level?: number
          rarity?: string
          role?: string
          run_defense?: number
          rushing?: number
          sort_order?: number
          star_shards?: number
          unlock_shards?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_season: {
        Args: { p_today?: string }
        Returns: {
          activated_season: string
          completed_season: string
          leagues_settled: number
        }[]
      }
      award_season: { Args: { p_season_id: string }; Returns: number }
      challenge_by_code: { Args: { p_code: string }; Returns: string }
      claim_daily_checkin: {
        Args: never
        Returns: {
          cash: number
          reward: number
          streak: number
        }[]
      }
      claim_daily_task: {
        Args: { p_task_id: string }
        Returns: {
          cash: number
          reward: number
          task_id: string
        }[]
      }
      claim_faction_goal: {
        Args: never
        Returns: {
          cash: number
          reward: number
        }[]
      }
      claim_season_rewards: {
        Args: never
        Returns: {
          cash: number
          reward: number
          seasons_claimed: number
        }[]
      }
      claim_upgrade: {
        Args: { p_facility_id: string }
        Returns: {
          facility_id: string
          level: number
        }[]
      }
      collect_income: {
        Args: never
        Returns: {
          cash: number
          collected: number
          income_per_hour: number
        }[]
      }
      config_int: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      config_text: {
        Args: { p_default: string; p_key: string }
        Returns: string
      }
      current_week: {
        Args: never
        Returns: {
          kind: string
          locks_at: string
          season_id: string
          week_number: number
        }[]
      }
      daily_rewards_enabled: { Args: never; Returns: boolean }
      daily_status: { Args: never; Returns: Json }
      daily_task_done: {
        Args: { p_day: string; p_detector: string; p_program_id: string }
        Returns: boolean
      }
      daily_tasks_for: {
        Args: { p_day: string }
        Returns: {
          detector: string
          enabled: boolean
          id: string
          label: string
          reward_cash: number
          sort_order: number
        }[]
        SetofOptions: {
          from: "*"
          to: "daily_task_types"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      effective_facets: {
        Args: { p_program_id: string }
        Returns: {
          emphasis_id: string
          pass_defense: number
          passing: number
          run_defense: number
          rushing: number
          total: number
        }[]
      }
      export_feedback: {
        Args: { p_token: string }
        Returns: {
          account_id: string
          created_at: string
          display_name: string
          id: number
          note: string
          program_id: string
          screen: string
          user_agent: string
        }[]
      }
      facet_powers: {
        Args: { p_program_id: string }
        Returns: {
          pass_defense: number
          passing: number
          run_defense: number
          rushing: number
          total: number
        }[]
      }
      faction_goal_progress: {
        Args: {
          p_faction_id: string
          p_metric: string
          p_season: string
          p_week: number
        }
        Returns: number
      }
      faction_goal_status: { Args: never; Returns: Json }
      faction_goals_enabled: { Args: never; Returns: boolean }
      faction_has_week_game: {
        Args: {
          p_faction_id: string
          p_kind: string
          p_season: string
          p_week: number
        }
        Returns: boolean
      }
      faction_lineup: {
        Args: { p_faction_id: string; p_salt: string }
        Returns: string[]
      }
      faction_roster: {
        Args: { p_faction_id: string }
        Returns: {
          display_name: string
          is_me: boolean
          joined_at: string
          last_active_at: string
          program_id: string
          program_name: string
          role: string
        }[]
      }
      house_program_for: {
        Args: { p_league_id: string; p_school_id: string }
        Returns: string
      }
      is_faction_mate: { Args: { p_program_id: string }; Returns: boolean }
      is_faction_member: { Args: { p_faction_id: string }; Returns: boolean }
      is_minor: { Args: { dob: string }; Returns: boolean }
      is_opponent: { Args: { p_program_id: string }; Returns: boolean }
      league_week_games: {
        Args: { p_league_id: string; p_season: string; p_week: number }
        Returns: {
          away_faction_id: string
          away_is_house: boolean
          away_name: string
          away_program_id: string
          away_school: string
          away_score: number
          home_faction_id: string
          home_is_house: boolean
          home_name: string
          home_program_id: string
          home_school: string
          home_score: number
          id: string
          kind: string
          locks_at: string
          narrative: string
          status: string
        }[]
      }
      level_up_staff: {
        Args: { p_staff_id: string }
        Returns: {
          cash: number
          level: number
          staff_id: string
        }[]
      }
      local_day: { Args: { p_at?: string }; Returns: string }
      make_share_code: { Args: never; Returns: string }
      my_program_id: { Args: never; Returns: string }
      my_seat: {
        Args: never
        Returns: {
          faction_id: string
          league_id: string
          program_id: string
          role: string
        }[]
      }
      place_my_program: { Args: never; Returns: string }
      place_program: { Args: { p_program_id: string }; Returns: string }
      program_power: { Args: { p_program_id: string }; Returns: number }
      refresh_standings: { Args: { p_season: string }; Returns: undefined }
      replay_game: {
        Args: { p_game_id: string }
        Returns: {
          away_score: number
          home_score: number
          matches: boolean
        }[]
      }
      resolve_due_games: { Args: never; Returns: number }
      resolve_game: { Args: { p_game_id: string }; Returns: undefined }
      run_maintenance: {
        Args: never
        Returns: {
          games_resolved: number
          games_scheduled: number
          seats_swept: number
        }[]
      }
      schedule_current_week: { Args: never; Returns: number }
      schedule_league_week: {
        Args: { p_league_id: string; p_season: string; p_week: number }
        Returns: number
      }
      schedule_pair: {
        Args: {
          p_kind: string
          p_league_a: string
          p_league_b: string
          p_locks_at: string
          p_school_a: string
          p_school_b: string
          p_season: string
          p_week: number
        }
        Returns: number
      }
      scout: {
        Args: never
        Returns: {
          next_scout_at: string
          shards: number
          shards_granted: number
          staff_id: string
        }[]
      }
      season_display: {
        Args: never
        Returns: {
          next_season_id: string
          next_starts_on: string
          season_id: string
          status: string
          week_kind: string
          week_number: number
          year: number
        }[]
      }
      season_rewards_enabled: { Args: never; Returns: boolean }
      season_rewards_status: { Args: never; Returns: Json }
      set_emphasis: { Args: { p_emphasis_id: string }; Returns: undefined }
      set_faction_goal: { Args: { p_goal_type_id: string }; Returns: undefined }
      set_faction_role: {
        Args: { p_program_id: string; p_role: string }
        Returns: undefined
      }
      staff_level_cost: { Args: { p_level: number }; Returns: number }
      staff_power: {
        Args: {
          p_base: number
          p_level: number
          p_per_level: number
          p_stars: number
        }
        Returns: number
      }
      star_up_staff: {
        Args: { p_staff_id: string }
        Returns: {
          shards: number
          staff_id: string
          stars: number
        }[]
      }
      start_upgrade: {
        Args: { p_facility_id: string }
        Returns: {
          cash: number
          facility_id: string
          upgrade_completes_at: string
          upgrade_to: number
        }[]
      }
      submit_feedback: {
        Args: { p_note: string; p_screen: string; p_user_agent?: string }
        Returns: number
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
