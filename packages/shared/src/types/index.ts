export interface User {
  id: string
  email: string
  name: string
  farm_name?: string
  created_at: string
  updated_at: string
}

export interface Farm {
  id: string
  name: string
  owner_id: string
  location?: {
    latitude: number
    longitude: number
    address?: string
  }
  size_acres?: number
  sheep_count?: number
  created_at: string
  updated_at: string
}

export interface LogEntry {
  id: string
  farm_id: string
  user_id: string
  date: string
  content: string
  type: 'observation' | 'health' | 'weather' | 'feeding' | 'breeding' | 'other'
  images?: string[]
  audio_transcript?: string
  weather_data?: WeatherData
  ai_insights?: string[]
  tags?: string[]
  created_at: string
  updated_at: string
}

export interface WeatherData {
  temperature: number
  humidity: number
  precipitation: number
  wind_speed: number
  wind_direction: string
  conditions: string
  pressure: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'text' | 'voice' | 'image'
  metadata?: {
    tokens_used?: number
    confidence?: number
    audio_duration?: number
    image_analysis?: string
  }
}

export interface DailySummary {
  id: string
  farm_id: string
  date: string
  summary: string
  insights: string[]
  recommendations: string[]
  health_alerts: string[]
  log_count: number
  weather_summary?: string
  confidence_score: number
  created_at: string
}

export interface WeeklySummary {
  id: string
  farm_id: string
  week_start: string
  week_end: string
  summary: string
  key_insights: string[]
  recommendations: string[]
  health_patterns: string[]
  daily_summaries: DailySummary[]
  confidence_score: number
  created_at: string
}

export interface SheepRecord {
  id: string
  farm_id: string
  tag_number: string
  name?: string
  breed?: string
  birth_date?: string
  weight?: number
  health_status: 'healthy' | 'sick' | 'injured' | 'pregnant' | 'unknown'
  last_checkup?: string
  notes?: string
  parent_ids?: string[]
  created_at: string
  updated_at: string
}

export interface HealthRecord {
  id: string
  sheep_id: string
  date: string
  type: 'checkup' | 'treatment' | 'vaccination' | 'injury' | 'illness'
  description: string
  treatment?: string
  veterinarian?: string
  cost?: number
  next_action?: string
  next_action_date?: string
  created_at: string
}

export interface AIAgent {
  name: string
  description: string
  capabilities: string[]
  model: string
  temperature: number
  max_tokens: number
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  has_more: boolean
}

// Chat types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export interface ChatRequest {
  message: string
  context?: {
    recent_logs?: LogEntry[]
    farm_info?: Farm
    current_weather?: WeatherData
  }
}

export interface ChatResponse {
  message: string
  suggestions?: string[]
  follow_up_questions?: string[]
  related_logs?: LogEntry[]
  confidence: number
}

// Voice transcription types
export interface VoiceTranscriptionRequest {
  audio_data: string // Base64 encoded audio
  language?: string
  context?: string
}

export interface VoiceTranscriptionResponse {
  transcript: string
  confidence: number
  language: string
  duration: number
}

// Image analysis types
export interface ImageAnalysisRequest {
  image_data: string // Base64 encoded image
  prompt?: string
  context?: string
}

export interface ImageAnalysisResponse {
  analysis: string
  insights: string[]
  health_concerns?: string[]
  confidence: number
}

// Notification types
export interface Notification {
  id: string
  user_id: string
  type: 'health_alert' | 'weather_warning' | 'task_reminder' | 'insight' | 'system'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  read: boolean
  action_url?: string
  created_at: string
}

// Settings types
export interface UserSettings {
  notifications: {
    push_enabled: boolean
    email_enabled: boolean
    daily_summary: boolean
    health_alerts: boolean
    weather_warnings: boolean
  }
  ai_preferences: {
    response_length: 'short' | 'medium' | 'detailed'
    include_suggestions: boolean
    farming_focus: string[]
  }
  privacy: {
    data_sharing: boolean
    analytics: boolean
    location_tracking: boolean
  }
}

export type LogType = LogEntry['type']
export type HealthStatus = SheepRecord['health_status']
export type NotificationPriority = Notification['priority']