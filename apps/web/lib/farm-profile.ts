// Farm Profile System - Dynamic knowledge management for regenerative farms

export interface FarmProfile {
  id: string
  farmId: string
  farmName: string
  lastUpdated: Date
  paddocks: PaddockProfile[]
  animals: AnimalProfile[]
  infrastructure: InfrastructureProfile[]
  routines: RoutineProfile[]
  farmerProfile: FarmerProfile
  environment: EnvironmentProfile
  business: BusinessProfile
  knowledge: KnowledgeGraph
  insights: FarmInsight[]
}

export interface PaddockProfile {
  name: string
  aliases: string[]
  lastMentioned: Date
  activities: ActivityRecord[]
  conditions: string[]
  animalHistory: AnimalMovement[]
  characteristics: string[]
  size?: number
  location?: string
}

export interface AnimalProfile {
  type: string
  currentCount?: number
  countHistory: CountRecord[]
  healthObservations: HealthRecord[]
  behaviorPatterns: string[]
  locations: LocationRecord[]
  lastSeen: Date
  notes: string[]
}

export interface InfrastructureProfile {
  type: string
  name?: string
  location?: string
  condition: string
  maintenanceHistory: MaintenanceRecord[]
  lastMentioned: Date
  importance: number
  notes: string[]
}

export interface RoutineProfile {
  type: string
  description: string
  frequency: string
  timing: string
  preferences: string[]
  consistency: number
  lastPerformed: Date
  notes: string[]
}

export interface FarmerProfile {
  name?: string
  preferences: string[]
  habits: string[]
  decisionPatterns: string[]
  workingStyle: string[]
  goals: string[]
  challenges: string[]
  experience: string[]
  philosophy: string
}

export interface EnvironmentProfile {
  weatherPatterns: WeatherPattern[]
  seasonalObservations: string[]
  impactFactors: string[]
  currentConditions?: string
  lastWeatherUpdate: Date
}

export interface BusinessProfile {
  mission: string
  goals: string[]
  challenges: string[]
  methods: string[]
  philosophy: string
  marketingMessages: string[]
  innovations: string[]
  successes: string[]
}

export interface KnowledgeGraph {
  relationships: Relationship[]
  concepts: Concept[]
  patterns: Pattern[]
  lastAnalyzed: Date
}

export interface FarmInsight {
  id: string
  type: 'pattern' | 'suggestion' | 'warning' | 'opportunity'
  title: string
  description: string
  confidence: number
  relevance: number
  actionable: boolean
  generatedAt: Date
  sources: string[]
}

// Supporting interfaces
export interface ActivityRecord {
  activity: string
  date: Date
  notes: string[]
  success: boolean
}

export interface CountRecord {
  count: number
  date: Date
  location?: string
  notes: string
}

export interface HealthRecord {
  observation: string
  date: Date
  severity: 'low' | 'medium' | 'high'
  resolved: boolean
  notes: string
}

export interface LocationRecord {
  location: string
  date: Date
  count?: number
  notes: string
}

export interface MaintenanceRecord {
  activity: string
  date: Date
  condition: string
  notes: string
}

export interface WeatherPattern {
  condition: string
  impact: string
  frequency: string
  notes: string[]
}

export interface AnimalMovement {
  fromLocation?: string
  toLocation?: string
  count?: number
  date: Date
  reason: string
  notes: string
}

export interface Relationship {
  from: string
  to: string
  type: string
  strength: number
  notes: string[]
}

export interface Concept {
  name: string
  category: string
  importance: number
  mentions: number
  lastMentioned: Date
  related: string[]
}

export interface Pattern {
  name: string
  description: string
  confidence: number
  frequency: string
  examples: string[]
  discovered: Date
}

export class FarmProfileManager {
  private static STORAGE_KEY = 'pasturepilot_farm_profile'
  
  /**
   * Get the current farm profile
   */
  static getFarmProfile(farmId: string): FarmProfile | null {
    try {
      const profiles = this.loadProfiles()
      return profiles.find(p => p.farmId === farmId) || null
    } catch (error) {
      console.error('Failed to load farm profile:', error)
      return null
    }
  }

  /**
   * Initialize a new farm profile
   */
  static initializeFarmProfile(farmId: string, farmName: string): FarmProfile {
    const profile: FarmProfile = {
      id: Date.now().toString(),
      farmId,
      farmName,
      lastUpdated: new Date(),
      paddocks: [],
      animals: [],
      infrastructure: [],
      routines: [],
      farmerProfile: {
        preferences: [],
        habits: [],
        decisionPatterns: [],
        workingStyle: [],
        goals: [],
        challenges: [],
        experience: [],
        philosophy: ''
      },
      environment: {
        weatherPatterns: [],
        seasonalObservations: [],
        impactFactors: [],
        lastWeatherUpdate: new Date()
      },
      business: {
        mission: '',
        goals: [],
        challenges: [],
        methods: [],
        philosophy: '',
        marketingMessages: [],
        innovations: [],
        successes: []
      },
      knowledge: {
        relationships: [],
        concepts: [],
        patterns: [],
        lastAnalyzed: new Date()
      },
      insights: []
    }
    
    this.saveProfile(profile)
    return profile
  }

  /**
   * Update farm profile with extracted knowledge
   */
  static updateWithKnowledge(farmId: string, extractedKnowledge: any, originalText: string): FarmProfile {
    let profile = this.getFarmProfile(farmId)
    
    if (!profile) {
      profile = this.initializeFarmProfile(farmId, 'My Farm')
    }

    const updateDate = new Date()
    
    // Update paddocks
    if (extractedKnowledge.paddocks) {
      extractedKnowledge.paddocks.forEach((paddock: any) => {
        const existingPaddock = profile!.paddocks.find(p => 
          p.name.toLowerCase() === paddock.name.toLowerCase()
        )
        
        if (existingPaddock) {
          existingPaddock.lastMentioned = updateDate
          existingPaddock.activities.push({
            activity: paddock.activities.join(', '),
            date: updateDate,
            notes: paddock.mentions,
            success: true
          })
          if (paddock.conditions) {
            existingPaddock.conditions.push(paddock.conditions)
          }
        } else {
          profile!.paddocks.push({
            name: paddock.name,
            aliases: [paddock.name],
            lastMentioned: updateDate,
            activities: [{
              activity: paddock.activities.join(', '),
              date: updateDate,
              notes: paddock.mentions,
              success: true
            }],
            conditions: paddock.conditions ? [paddock.conditions] : [],
            animalHistory: [],
            characteristics: []
          })
        }
      })
    }

    // Update animals
    if (extractedKnowledge.animals) {
      extractedKnowledge.animals.forEach((animal: any) => {
        const existingAnimal = profile!.animals.find(a => 
          a.type.toLowerCase() === animal.type.toLowerCase()
        )
        
        if (existingAnimal) {
          existingAnimal.lastSeen = updateDate
          if (animal.count) {
            existingAnimal.countHistory.push({
              count: animal.count,
              date: updateDate,
              location: animal.location,
              notes: animal.notes.join(', ')
            })
            existingAnimal.currentCount = animal.count
          }
          if (animal.health) {
            existingAnimal.healthObservations.push({
              observation: animal.health,
              date: updateDate,
              severity: 'medium',
              resolved: false,
              notes: animal.notes.join(', ')
            })
          }
          if (animal.behavior) {
            existingAnimal.behaviorPatterns.push(animal.behavior)
          }
        } else {
          profile!.animals.push({
            type: animal.type,
            currentCount: animal.count,
            countHistory: animal.count ? [{
              count: animal.count,
              date: updateDate,
              location: animal.location,
              notes: animal.notes.join(', ')
            }] : [],
            healthObservations: animal.health ? [{
              observation: animal.health,
              date: updateDate,
              severity: 'medium',
              resolved: false,
              notes: animal.notes.join(', ')
            }] : [],
            behaviorPatterns: animal.behavior ? [animal.behavior] : [],
            locations: animal.location ? [{
              location: animal.location,
              date: updateDate,
              count: animal.count,
              notes: animal.notes.join(', ')
            }] : [],
            lastSeen: updateDate,
            notes: animal.notes
          })
        }
      })
    }

    // Update routines
    if (extractedKnowledge.routines) {
      extractedKnowledge.routines.forEach((routine: any) => {
        const existingRoutine = profile!.routines.find(r => 
          r.type.toLowerCase() === routine.type.toLowerCase()
        )
        
        if (existingRoutine) {
          existingRoutine.lastPerformed = updateDate
          existingRoutine.consistency = Math.min(existingRoutine.consistency + 0.1, 1.0)
          if (routine.preferences) {
            existingRoutine.preferences.push(routine.preferences)
          }
        } else {
          profile!.routines.push({
            type: routine.type,
            description: routine.description,
            frequency: routine.frequency || 'unknown',
            timing: routine.timing || 'unknown',
            preferences: routine.preferences ? [routine.preferences] : [],
            consistency: 0.5,
            lastPerformed: updateDate,
            notes: [routine.description]
          })
        }
      })
    }

    // Update business profile
    if (extractedKnowledge.business) {
      const business = extractedKnowledge.business
      if (business.goals) {
        profile.business.goals = Array.from(new Set([...profile.business.goals, ...business.goals]))
      }
      if (business.challenges) {
        profile.business.challenges = Array.from(new Set([...profile.business.challenges, ...business.challenges]))
      }
      if (business.methods) {
        profile.business.methods = Array.from(new Set([...profile.business.methods, ...business.methods]))
      }
      if (business.philosophy) {
        profile.business.philosophy = business.philosophy
      }
    }

    // Update knowledge graph
    profile.knowledge.concepts.push({
      name: `Update-${updateDate.toISOString()}`,
      category: 'daily_update',
      importance: 1,
      mentions: 1,
      lastMentioned: updateDate,
      related: []
    })

    profile.lastUpdated = updateDate
    this.saveProfile(profile)
    
    return profile
  }

  /**
   * Generate insights from farm profile
   */
  static generateInsights(profile: FarmProfile): FarmInsight[] {
    const insights: FarmInsight[] = []
    
    // Paddock usage patterns
    const recentPaddocks = profile.paddocks.filter(p => 
      (Date.now() - p.lastMentioned.getTime()) < 7 * 24 * 60 * 60 * 1000
    )
    
    if (recentPaddocks.length > 0) {
      insights.push({
        id: `paddock-usage-${Date.now()}`,
        type: 'pattern',
        title: 'Active Paddock Management',
        description: `You've been actively managing ${recentPaddocks.length} paddocks this week: ${recentPaddocks.map(p => p.name).join(', ')}`,
        confidence: 0.8,
        relevance: 0.9,
        actionable: true,
        generatedAt: new Date(),
        sources: ['paddock_activity']
      })
    }

    // Animal health monitoring
    const healthConcerns = profile.animals.flatMap(a => 
      a.healthObservations.filter(h => !h.resolved && h.severity !== 'low')
    )
    
    if (healthConcerns.length > 0) {
      insights.push({
        id: `health-alert-${Date.now()}`,
        type: 'warning',
        title: 'Health Observations Need Attention',
        description: `${healthConcerns.length} unresolved health observations require monitoring`,
        confidence: 0.9,
        relevance: 1.0,
        actionable: true,
        generatedAt: new Date(),
        sources: ['animal_health']
      })
    }

    // Routine consistency
    const inconsistentRoutines = profile.routines.filter(r => r.consistency < 0.7)
    if (inconsistentRoutines.length > 0) {
      insights.push({
        id: `routine-consistency-${Date.now()}`,
        type: 'suggestion',
        title: 'Routine Optimization Opportunity',
        description: `Consider standardizing these routines: ${inconsistentRoutines.map(r => r.type).join(', ')}`,
        confidence: 0.6,
        relevance: 0.7,
        actionable: true,
        generatedAt: new Date(),
        sources: ['routine_analysis']
      })
    }

    return insights
  }

  /**
   * Get farm summary for context
   */
  static getFarmSummary(farmId: string): string {
    const profile = this.getFarmProfile(farmId)
    if (!profile) return 'No farm profile available'

    const paddockNames = profile.paddocks.map(p => p.name).join(', ')
    const animalSummary = profile.animals.map(a => 
      `${a.currentCount || 'some'} ${a.type}`
    ).join(', ')
    
    return `Farm: ${profile.farmName}
Paddocks: ${paddockNames || 'None recorded'}
Animals: ${animalSummary || 'None recorded'}
Recent Activity: ${profile.paddocks.length} paddocks managed, ${profile.animals.length} animal types tracked
Last Updated: ${profile.lastUpdated.toLocaleDateString()}`
  }

  /**
   * Private methods for data persistence
   */
  private static loadProfiles(): FarmProfile[] {
    try {
      // Check if localStorage is available (client-side only)
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return []
      }
      
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []
      
      const profiles = JSON.parse(stored)
      // Convert date strings back to Date objects
      return profiles.map((profile: any) => ({
        ...profile,
        lastUpdated: new Date(profile.lastUpdated),
        paddocks: profile.paddocks?.map((p: any) => ({
          ...p,
          lastMentioned: new Date(p.lastMentioned),
          activities: p.activities?.map((a: any) => ({
            ...a,
            date: new Date(a.date)
          })) || []
        })) || [],
        animals: profile.animals?.map((a: any) => ({
          ...a,
          lastSeen: new Date(a.lastSeen),
          countHistory: a.countHistory?.map((c: any) => ({
            ...c,
            date: new Date(c.date)
          })) || [],
          healthObservations: a.healthObservations?.map((h: any) => ({
            ...h,
            date: new Date(h.date)
          })) || [],
          locations: a.locations?.map((l: any) => ({
            ...l,
            date: new Date(l.date)
          })) || []
        })) || []
      }))
    } catch (error) {
      console.error('Failed to load farm profiles:', error)
      return []
    }
  }

  private static saveProfile(profile: FarmProfile): void {
    try {
      // Check if localStorage is available (client-side only)
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.warn('localStorage not available, skipping save')
        return
      }
      
      const profiles = this.loadProfiles()
      const existingIndex = profiles.findIndex(p => p.farmId === profile.farmId)
      
      if (existingIndex >= 0) {
        profiles[existingIndex] = profile
      } else {
        profiles.push(profile)
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles))
      console.log('Farm profile saved successfully')
    } catch (error) {
      console.error('Failed to save farm profile:', error)
    }
  }
}

// Export singleton instance
export const farmProfileManager = FarmProfileManager 