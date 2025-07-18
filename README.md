# PasturePilot 🐑

An AI-first mobile farming assistant for regenerative livestock producers, starting with sheep. Built for daily use with a conversational interface supporting text, voice, and images.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <your-repo-url>
cd mollys
npm install

# Setup environment
cp .env.example .env.local
# Add your OpenRouter API key and other credentials

# Start development
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
mollys/
├── apps/
│   ├── web/                    # Next.js frontend (PWA-ready)
│   └── api/                    # Backend API services
├── packages/
│   ├── shared/                 # Shared types and utilities
│   └── database/               # Database schema and migrations
├── docs/                       # 📚 Organized documentation
│   ├── implementation/         # Technical implementation guides
│   ├── setup/                  # Installation and configuration
│   ├── features/               # Feature documentation
│   └── README.md              # Documentation index
└── Configuration files
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, PWA
- **Backend**: TypeScript, Next.js API routes
- **Database**: MongoDB with Supabase for authentication
- **AI**: OpenRouter API (GPT-4, Claude, Mistral)
- **Deployment**: Vercel
- **Development**: AI-assisted with Cursor

## ✨ Core Features

### 🤖 AI Chat Interface
- Multi-model AI assistance (GPT-4, Claude, Mistral)
- Real-time streaming responses
- Farming-specialized knowledge base
- Source citations from YouTube videos and articles

### 🎛️ Agent System
- **ChatAgent**: Main conversational assistant
- **LogSummarizer**: Daily farm log analysis
- **KnowledgeExtractor**: Farm data extraction
- **VoiceAgent**: Audio transcription (planned)
- **VisionAgent**: Image analysis (planned)

### 📱 Mobile-First PWA
- Installable on mobile devices
- Offline capability
- Touch-optimized interface
- Voice and camera integration (planned)

### 🧠 Knowledge Base
- YouTube video transcript processing
- Vector embeddings for semantic search
- RAG (Retrieval-Augmented Generation)
- Source citations and attribution

## 📖 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- **[Getting Started](docs/setup/SETUP_COMPLETE.md)** - Complete setup guide
- **[OpenRouter Integration](docs/setup/OPENROUTER_SETUP_COMPLETE.md)** - AI backend setup
- **[Implementation Guides](docs/implementation/)** - Technical architecture
- **[Features](docs/features/)** - Detailed feature documentation
- **[API Reference](docs/api.md)** - Complete API documentation

## 🔧 Environment Setup

### Required Environment Variables
```bash
# AI Integration
OPENROUTER_API_KEY=your_openrouter_api_key
DEFAULT_MODEL=mistralai/mistral-7b-instruct

# Database
MONGODB_URI=your_mongodb_connection_string
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
YOUTUBE_API_KEY=your_youtube_api_key
OPENAI_API_KEY=your_openai_api_key
```

### Quick Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your credentials
nano .env.local

# Start development server
npm run dev
```

## 🚀 Development Workflow

### Daily Development
```bash
# Start all services
npm run dev

# Run specific app
npm run dev:web
npm run dev:api

# Build and test
npm run build
npm run test
```

### Key Commands
```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run type-check      # TypeScript validation

# Deployment
vercel                  # Deploy to Vercel
vercel --prod          # Production deployment
```

## 🔮 Roadmap

### Current (v1.0)
- ✅ Chat interface with OpenRouter
- ✅ Knowledge base with YouTube transcripts
- ✅ Agent system architecture
- ✅ PWA mobile support
- ✅ Farm profile management

### Next Phase (v1.1)
- 🔄 Voice recording and transcription
- 🔄 Image analysis for livestock monitoring
- 🔄 Weather integration
- 🔄 Enhanced farm analytics

### Future (v2.0)
- 📅 Multi-farm support
- 📅 Team collaboration features
- 📅 IoT sensor integration
- 📅 Marketplace integration

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** with proper tests
4. **Update documentation** as needed
5. **Submit a pull request**

### Development Guidelines
- Follow TypeScript best practices
- Update documentation for new features
- Test on mobile devices
- Follow farming terminology conventions

## 📞 Support & Community

- **Documentation**: Check the [`docs/`](docs/) directory
- **Issues**: Open GitHub issues for bugs
- **Features**: Discuss in GitHub discussions
- **Setup Help**: See [setup guides](docs/setup/)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

🌱 Built with ❤️ for regenerative farming