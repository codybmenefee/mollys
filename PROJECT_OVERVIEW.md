# PasturePilot - AI-Powered Farm Management Platform

## Overview
This is a Next.js-based web application that provides AI-powered farm management and insights through conversational interfaces and automated workflows.

## Core Features
- **AI Chat Interface**: Interactive chat system with multiple AI models for farm-related queries and assistance
- **Agent System**: Specialized AI agents including:
  - Content summarizer
  - Knowledge extractor
  - Farm insights generator
- **Farm Dashboard**: Real-time farm insights and analytics dashboard
- **Daily Update Workflows**: Automated daily farm status updates and recommendations
- **Admin Panel**: Management interface for AI agents and system configuration

## Technical Stack
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: MongoDB + Supabase
- **AI Integration**: OpenAI + OpenRouter for multiple model access
- **Architecture**: Monorepo with shared packages and utilities

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   API Backend   │    │  AI Services    │
│   (Next.js)     │◄──►│  (Next.js API)  │◄──►│ OpenAI/Router   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       
         │                       │                       
         ▼                       ▼                       
┌─────────────────┐    ┌─────────────────┐              
│   UI Components │    │   Data Layer    │              
│   & Workflows   │    │ MongoDB/Supabase│              
└─────────────────┘    └─────────────────┘              
```

### Architecture Layers
1. **Presentation Layer**: React components, dashboards, and UI workflows
2. **API Layer**: Next.js API routes handling business logic and external integrations
3. **Agent Layer**: Specialized AI agents for different farm management tasks
4. **Data Layer**: MongoDB for farm data, Supabase for user management
5. **AI Integration Layer**: OpenAI and OpenRouter for multiple model access

## Directory Structure

```
mollys/
├── apps/
│   ├── api/                    # Standalone API service
│   │   ├── src/
│   │   │   ├── agents/         # AI agent implementations
│   │   │   └── lib/            # API utilities (OpenAI client)
│   │   └── package.json
│   │
│   └── web/                    # Next.js web application
│       ├── app/                # App Router structure
│       │   ├── admin/          # Admin panel routes
│       │   │   └── agents/     # Agent management
│       │   ├── api/            # API route handlers
│       │   │   ├── agents/     # Agent endpoints
│       │   │   ├── analyze/    # Farm analysis
│       │   │   └── chat/       # Chat functionality
│       │   ├── debug/          # Debug utilities
│       │   ├── farm/           # Farm dashboard
│       │   └── page.tsx        # Main landing page
│       │
│       ├── components/         # React components
│       │   ├── DailyUpdateWorkflow.tsx
│       │   ├── FarmInsightsDashboard.tsx
│       │   └── MessageRenderer.tsx
│       │
│       ├── lib/                # Utility libraries
│       │   ├── agents.ts       # Agent management
│       │   ├── chat.ts         # Chat logic
│       │   ├── farm-profile.ts # Farm data handling
│       │   ├── mongodb.ts      # Database client
│       │   └── supabase.ts     # Auth client
│       │
│       └── types/              # TypeScript definitions
│
├── packages/
│   ├── database/               # Database schemas & migrations
│   └── shared/                 # Shared utilities & types
│       ├── src/
│       │   ├── types/          # Common type definitions
│       │   └── utils/          # Utility functions
│       └── package.json
│
└── docs/                       # Documentation
    └── api.md                  # API documentation
```

## Key Architecture Decisions
- **Monorepo Structure**: Shared code and types across applications
- **App Router**: Modern Next.js 14 routing with server components
- **Microservice-Ready**: Separate API service for potential scaling
- **Agent-Based AI**: Modular AI agents for different farm management tasks
- **Multi-Database**: MongoDB for farm data, Supabase for authentication

## Recent Development
- OpenRouter integration for expanded AI model access
- Farm-specific dashboard and profile management
- Knowledge extraction and summarization capabilities
- Enhanced chat functionality with model selection

## Target Users
Farm managers, agricultural consultants, and farming operations seeking AI-powered insights and management tools.

This platform combines modern web technologies with agricultural domain expertise to provide intelligent farm management solutions. 