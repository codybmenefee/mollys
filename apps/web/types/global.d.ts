declare global {
  interface Window {
    // PWA install prompt
    deferredPrompt?: any
    // Voice recognition
    webkitSpeechRecognition?: any
    SpeechRecognition?: any
    // Camera access
    MediaRecorder?: any
  }
}

// Re-export shared types for convenience
export * from '@pasture-pilot/shared'

// Frontend-specific types
export interface InstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export interface VoiceRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

export interface CameraCapture {
  file: File
  preview: string
  timestamp: Date
}

export interface PWAInstallState {
  isInstallable: boolean
  isInstalled: boolean
  showInstallPrompt: boolean
}

export interface AppNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export type ThemeMode = 'light' | 'dark' | 'system'

export interface AppSettings {
  theme: ThemeMode
  notifications: {
    browser: boolean
    sound: boolean
    vibration: boolean
  }
  voice: {
    autoTranscribe: boolean
    language: string
  }
  display: {
    fontSize: 'small' | 'medium' | 'large'
    reducedMotion: boolean
  }
}

export {}  // Make this a module