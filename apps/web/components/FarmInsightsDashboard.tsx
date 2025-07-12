'use client'

import React, { useState, useEffect } from 'react'
import { FarmProfileManager, FarmProfile, FarmInsight } from '@/lib/farm-profile'
import { 
  MapPinIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon, 
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface FarmInsightsDashboardProps {
  farmId: string
}

export default function FarmInsightsDashboard({ farmId }: FarmInsightsDashboardProps) {
  const [profile, setProfile] = useState<FarmProfile | null>(null)
  const [insights, setInsights] = useState<FarmInsight[]>([])
  const [selectedTab, setSelectedTab] = useState<'overview' | 'paddocks' | 'animals' | 'insights'>('overview')

  useEffect(() => {
    loadFarmProfile()
  }, [farmId])

  const loadFarmProfile = () => {
    const farmProfile = FarmProfileManager.getFarmProfile(farmId)
    if (farmProfile) {
      setProfile(farmProfile)
      const generatedInsights = FarmProfileManager.generateInsights(farmProfile)
      setInsights(generatedInsights)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5" />
      case 'suggestion':
        return <LightBulbIcon className="w-5 h-5" />
      case 'pattern':
        return <ArrowTrendingUpIcon className="w-5 h-5" />
      case 'opportunity':
        return <ChartBarIcon className="w-5 h-5" />
      default:
        return <CheckCircleIcon className="w-5 h-5" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'suggestion':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'pattern':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'opportunity':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <div className="text-gray-500">
            <ChartBarIcon className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg font-medium">No farm data yet</p>
            <p className="text-sm">Start chatting about your farm to build your profile!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-pasture-600 to-pasture-700 text-white p-6">
        <h2 className="text-2xl font-bold">{profile.farmName}</h2>
        <p className="text-pasture-100 mt-1">
          Farm Knowledge & Insights
        </p>
        <p className="text-pasture-200 text-sm mt-2">
          Last updated: {new Date(profile.lastUpdated).toLocaleDateString()}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 px-6">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'paddocks', name: 'Paddocks', icon: MapPinIcon },
            { id: 'animals', name: 'Animals', icon: ClockIcon },
            { id: 'insights', name: 'Insights', icon: LightBulbIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === tab.id
                  ? 'border-pasture-500 text-pasture-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-pasture-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-pasture-600">{profile.paddocks.length}</div>
                <div className="text-sm text-pasture-700">Paddocks Tracked</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{profile.animals.length}</div>
                <div className="text-sm text-blue-700">Animal Types</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{profile.routines.length}</div>
                <div className="text-sm text-green-700">Routines Learned</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h3>
              <div className="space-y-3">
                {profile.paddocks.slice(0, 3).map((paddock) => (
                  <div key={paddock.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <MapPinIcon className="w-5 h-5 text-pasture-600 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">{paddock.name}</div>
                        <div className="text-sm text-gray-500">
                          {paddock.activities.length} activities tracked
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(paddock.lastMentioned).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'paddocks' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Paddock Knowledge</h3>
            {profile.paddocks.length === 0 ? (
              <p className="text-gray-500">No paddocks tracked yet. Start mentioning your paddocks in conversations!</p>
            ) : (
              <div className="grid gap-4">
                {profile.paddocks.map((paddock) => (
                  <div key={paddock.name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{paddock.name}</h4>
                      <span className="text-sm text-gray-500">
                        Last mentioned: {new Date(paddock.lastMentioned).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Activities:</span>
                        <div className="text-sm text-gray-600">
                          {paddock.activities.slice(0, 3).map((activity, idx) => (
                            <div key={idx} className="ml-2">• {activity.activity}</div>
                          ))}
                        </div>
                      </div>
                      {paddock.conditions.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Conditions:</span>
                          <div className="text-sm text-gray-600">
                            {paddock.conditions.slice(-2).map((condition, idx) => (
                              <div key={idx} className="ml-2">• {condition}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'animals' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Animal Knowledge</h3>
            {profile.animals.length === 0 ? (
              <p className="text-gray-500">No animals tracked yet. Start mentioning your animals in conversations!</p>
            ) : (
              <div className="grid gap-4">
                {profile.animals.map((animal) => (
                  <div key={animal.type} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 capitalize">{animal.type}</h4>
                      <span className="text-sm text-gray-500">
                        Last seen: {new Date(animal.lastSeen).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {animal.currentCount && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Current Count:</span>
                          <span className="text-sm text-gray-600 ml-2">{animal.currentCount}</span>
                        </div>
                      )}
                      {animal.behaviorPatterns.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Behavior Patterns:</span>
                          <div className="text-sm text-gray-600">
                            {animal.behaviorPatterns.slice(-2).map((pattern, idx) => (
                              <div key={idx} className="ml-2">• {pattern}</div>
                            ))}
                          </div>
                        </div>
                      )}
                      {animal.healthObservations.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Health Observations:</span>
                          <div className="text-sm text-gray-600">
                            {animal.healthObservations.slice(-2).map((obs, idx) => (
                              <div key={idx} className="ml-2">• {obs.observation}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'insights' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            {insights.length === 0 ? (
              <p className="text-gray-500">No insights available yet. Add more farm data to generate insights!</p>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                        <p className="text-sm text-gray-700 mt-1">{insight.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-500">
                            Confidence: {Math.round(insight.confidence * 100)}%
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(insight.generatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 