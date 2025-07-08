import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Types for our database tables
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          farm_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          farm_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          farm_name?: string | null
          updated_at?: string
        }
      }
      farms: {
        Row: {
          id: string
          name: string
          owner_id: string
          location: any | null
          size_acres: number | null
          sheep_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          location?: any | null
          size_acres?: number | null
          sheep_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          location?: any | null
          size_acres?: number | null
          sheep_count?: number | null
          updated_at?: string
        }
      }
      log_entries: {
        Row: {
          id: string
          farm_id: string
          user_id: string
          date: string
          content: string
          type: 'observation' | 'health' | 'weather' | 'feeding' | 'breeding' | 'other'
          images: string[] | null
          audio_transcript: string | null
          weather_data: any | null
          ai_insights: string[] | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          farm_id: string
          user_id: string
          date: string
          content: string
          type: 'observation' | 'health' | 'weather' | 'feeding' | 'breeding' | 'other'
          images?: string[] | null
          audio_transcript?: string | null
          weather_data?: any | null
          ai_insights?: string[] | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          farm_id?: string
          user_id?: string
          date?: string
          content?: string
          type?: 'observation' | 'health' | 'weather' | 'feeding' | 'breeding' | 'other'
          images?: string[] | null
          audio_transcript?: string | null
          weather_data?: any | null
          ai_insights?: string[] | null
          tags?: string[] | null
          updated_at?: string
        }
      }
      daily_summaries: {
        Row: {
          id: string
          farm_id: string
          date: string
          summary: string
          insights: string[]
          recommendations: string[]
          health_alerts: string[]
          log_count: number
          weather_summary: string | null
          confidence_score: number
          created_at: string
        }
        Insert: {
          id?: string
          farm_id: string
          date: string
          summary: string
          insights: string[]
          recommendations: string[]
          health_alerts: string[]
          log_count: number
          weather_summary?: string | null
          confidence_score: number
          created_at?: string
        }
        Update: {
          id?: string
          farm_id?: string
          date?: string
          summary?: string
          insights?: string[]
          recommendations?: string[]
          health_alerts?: string[]
          log_count?: number
          weather_summary?: string | null
          confidence_score?: number
        }
      }
    }
  }
}