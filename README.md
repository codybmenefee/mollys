# PasturePilot 🐑

An AI-first mobile farming assistant for regenerative livestock producers, starting with sheep. Built for daily use with a conversational interface supporting text, voice, and images.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <your-repo-url>
cd pasture-pilot
npm install

# Setup environment
cp .env.example .env.local
# Add your OpenAI API key and Supabase credentials

# Start development servers
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
pasture-pilot/
├── apps/
│   ├── web/                    # Next.js frontend (PWA-ready)
│   └── api/                    # Backend API & Edge Functions
├── packages/
│   ├── shared/                 # Shared types and utilities
│   └── database/               # Database schema and migrations
├── docs/                       # API documentation
└── scripts/                    # Build and deployment scripts
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, PWA
- **Backend**: TypeScript, Vercel Edge Functions
- **Database**: Supabase (PostgreSQL) with Prisma (planned)
- **AI**: OpenAI API (GPT-4, Whisper)
- **Deployment**: Vercel
- **Development**: AI-assisted with Cursor, Claude CLI, v0.dev

## 🎯 Development Workflow

### Daily Development
1. **Morning Setup**: `npm run dev` to start all services
2. **Testing**: Use the `/test` endpoint to validate AI integrations
3. **Logging**: Daily farming logs automatically saved and summarized
4. **Deployment**: Push to main branch triggers auto-deploy to Vercel

### AI-First Development
- Use Cursor for code completion and refactoring
- Leverage Claude CLI for architecture decisions
- Use v0.dev for rapid UI component prototyping
- Use a0.dev for backend API generation

### Testing Strategy
- **Local**: Manual testing with sample farming data
- **Staging**: Deploy preview branches for feature testing
- **Production**: Gradual rollout with feature flags

## 🚀 MVP Sprint Plan (Week 1-2)

### Core Features
- [ ] **Conversational Interface**: Text input with AI response
- [ ] **Daily Log Entry**: Record daily observations
- [ ] **Voice Transcription**: Whisper API integration
- [ ] **AI Summarization**: Daily/weekly summaries
- [ ] **Mobile PWA**: Install on mobile devices

### Technical Milestones
- [ ] Next.js app with Tailwind setup
- [ ] Supabase database connection
- [ ] OpenAI API integration
- [ ] Basic authentication
- [ ] PWA manifest and service worker
- [ ] Vercel deployment pipeline

## 🔧 Environment Setup

### Required Environment Variables
```bash
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup
```bash
# Initialize Supabase locally (optional)
npx supabase init
npx supabase start

# Or connect to cloud Supabase instance
# Add your credentials to .env.local
```

## 📱 PWA Features

- **Offline Support**: Core functionality works offline
- **Install Prompt**: Native app-like installation
- **Push Notifications**: Daily reminders and alerts
- **Camera Integration**: Photo capture for livestock monitoring
- **Voice Recording**: Hands-free log entry while in field

## 🤖 AI Agent Architecture

### Planned Agents
- **LogAnalyzer**: Parse and categorize daily entries
- **HealthMonitor**: Detect health patterns and alerts
- **WeatherAdvisor**: Integrate weather data for grazing decisions
- **SummaryGenerator**: Create daily/weekly reports

### Integration Points
- OpenAI GPT-4 for natural language understanding
- Whisper for voice-to-text conversion
- Future: Custom fine-tuned models for farming terminology

## 🚀 Deployment

### Vercel Deployment
- **Frontend**: Automatic deployment from main branch
- **Edge Functions**: Co-located with frontend for low latency
- **Environment**: Production environment variables in Vercel dashboard

### Performance Targets
- **Initial Load**: < 2s on mobile
- **AI Response**: < 3s for text, < 5s for voice
- **Offline**: Core features functional without internet

## 🔮 Future Roadmap

### Phase 2 (Month 2-3)
- Image analysis for livestock health monitoring
- Weather integration and grazing recommendations
- Multiple farm support and team collaboration
- Advanced analytics and reporting

### Phase 3 (Month 4-6)
- Marketplace integration for feed/equipment
- Community features for knowledge sharing
- Integration with IoT sensors and farm equipment
- Mobile app store deployment

## 🛠️ Development Commands

```bash
# Start all development servers
npm run dev

# Build all packages
npm run build

# Run tests
npm run test

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod

# Generate API documentation
npm run docs:generate
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

Built with ❤️ for regenerative farming 🌱