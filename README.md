# 📄 Pandoc Orchestrator

A modern SaaS platform for document conversion and management powered by Pandoc, built with Next.js, FastAPI, and Docker.

**Transforming documents seamlessly across formats with advanced filtering, templating, and academic publishing support.**

---

## 🎯 Overview

Pandoc Orchestrator is an end-to-end document conversion and management platform that brings Pandoc's powerful cross-format conversion capabilities to a modern web interface. Whether you're converting Markdown to PDF, managing academic citations, or applying corporate branding to documents, this platform handles it all.

### Key Features

- **Multi-Format Conversion**: Convert between 30+ document formats (Markdown, DOCX, HTML, LaTeX, PDF, EPUB, and more)
- **Advanced PDF Engines**: Choose between LaTeX (academic), Typst (modern/fast), or HTML/CSS (web-based)
- **Academic Publishing**: Built-in citation management (CSL/BibTeX), mathematics rendering, and scholarly formatting
- **Custom Templating**: Upload reference documents or create custom templates for consistent branding
- **Filter Pipelines**: Chain Lua and Python filters for complex document transformations
- **Real-time Preview**: Live preview of PDF and presentation output directly in the browser
- **Media Management**: Automatic extraction and organization of images and embedded media
- **Bulk Processing**: Convert multiple documents in batch operations

---

## 🏗️ Architecture

### System Overview

```
┌──────────────────────────────────────────┐
│   Next.js Web Application (Frontend)     │
│  - UI with Monaco Editor & Live Preview  │
│  - Async Task Tracking (TanStack Query)  │
│  - User Authentication (Supabase Auth)   │
└──────────────────┬───────────────────────┘
                   │ HTTP API
                   ▼
┌──────────────────────────────────────────┐
│  Python FastAPI Worker (Docker)          │
│  - Pandoc CLI Orchestration              │
│  - PDF Engine Router                     │
│  - Filter Execution & Sandboxing         │
└──────────────────┬───────────────────────┘
                   │ Storage/DB
                   ▼
┌──────────────────────────────────────────┐
│    Supabase Backend                      │
│  - PostgreSQL (Metadata & Status)        │
│  - Object Storage (Files & Outputs)      │
└──────────────────────────────────────────┘
```

### Tech Stack

**Frontend:**
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI**: Shadcn/UI + Tailwind CSS
- **Editor**: Monaco Editor (syntax highlighting, multi-language support)
- **State Management**: TanStack Query (async operations)
- **Auth**: Supabase Auth

**Backend:**
- **API**: Python FastAPI
- **Core**: Pandoc CLI with subprocess isolation
- **Document Processing**: Pandoc + LaTeX/Typst/WeasyPrint
- **Filtering**: Lua + Python filters
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Object Storage
- **Containerization**: Docker + docker-compose

---

## 📁 Project Structure

```
pandoc-orchestrator/
├── apps/
│   ├── web/                      # Next.js Frontend & API Routes
│   │   ├── src/
│   │   │   ├── app/              # Next.js App Router
│   │   │   ├── components/       # React Components (UI, Editor, Preview)
│   │   │   ├── hooks/            # Custom Hooks
│   │   │   └── lib/              # Utilities & Supabase Client
│   │   └── package.json
│   │
│   └── worker/                   # Python FastAPI Worker
│       ├── app/
│       │   ├── main.py           # FastAPI Entry Point
│       │   ├── core/             # Pandoc Command Builder, Engine Router
│       │   ├── filters/          # Pre-built Lua/Python Filters
│       │   └── services/         # Supabase Integration
│       └── requirements.txt
│
├── docker/
│   ├── docker-compose.yml        # Local Development Environment
│   └── worker.Dockerfile         # Pandoc + Dependencies Image
│
├── supabase/
│   ├── migrations/               # Database Schema & RLS Policies
│   └── seed.sql
│
├── benchmarks/                   # Test Files & Sample Documents
│   ├── academic_sample.md
│   ├── company_profile.docx
│   └── references.bib
│
├── package.json                  # Monorepo Root
└── README.md                     # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **Python** >= 3.9
- **Docker** and **docker-compose**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pandoc-orchestrator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env.local` in `apps/web/`
   - Add your Supabase URL and API key
   ```bash
   cp .env.example .env.local
   ```

4. **Start development environment**
   ```bash
   # Terminal 1: Start the web application
   npm run dev:web
   
   # Terminal 2: Start the Python worker (in docker)
   docker-compose -f docker/docker-compose.yml up --build
   ```

The web application will be available at `http://localhost:3000`.

---

## 📖 Core Modules

### Module 1: Document Conversion Engine
- Multi-format input/output support (30+ formats)
- Drag-and-drop file uploads
- Direct text input with Monaco Editor
- Bulk processing of multiple documents
- Automatic media extraction and organization

### Module 2: Advanced PDF & Presentation Engine
- **PDF Rendering Options**:
  - Academic: LaTeX (XeLaTeX/LuaLaTeX)
  - Modern: Typst (fast, type-safe)
  - Web-based: HTML/CSS (WeasyPrint)
- Live preview in browser (PDF.js or iframe)
- Presentation mode with reveal.js

### Module 3: Academic Publishing Tools
- **Citation Management**:
  - BibTeX (.bib) and CSL JSON support
  - Automatic citation processing with citeproc
  - Pre-built citation styles (APA, MLA, Harvard, IEEE)
- **Mathematics Rendering**:
  - MathJax, KaTeX, or static SVG support
  - LaTeX equation support

### Module 4: Templating & Corporate Branding
- Upload custom `.docx` or `.pptx` templates
- Reference document style mapping
- Custom HTML/LaTeX templates with YAML metadata
- Consistent branding across document types

### Module 5: Filter & Extension System
- Custom Lua filters for AST manipulation
- Python filter support for advanced processing
- Filter pipeline configuration (chain multiple filters)
- User-uploaded filters with sandbox isolation

---

## 🔒 Security & Performance

### Security Features
- **Sandbox Isolation**: User-uploaded filters run in isolated Docker containers
- **Resource Limits**: CPU, memory, and timeout restrictions per conversion
- **Input Validation**: Strict validation of Pandoc parameters
- **Safe Command Execution**: Using subprocess with list-based arguments (no shell injection)

### Performance Considerations
- **Asynchronous Processing**: Long-running conversions use async task queues
- **Smart Typography**: `--smart` mode enabled by default
- **Large File Support**: Streaming uploads and background processing
- **Caching**: Metadata and template caching to reduce latency

---

## 📚 API Documentation

### Conversion Endpoint

```
POST /api/convert

Request Body:
{
  "projectId": "uuid",
  "inputFormat": "markdown",
  "outputFormat": "pdf",
  "engine": "xelatex",
  "options": {
    "citations": true,
    "smartTypography": true,
    "template": "academic"
  }
}

Response:
{
  "conversionId": "uuid",
  "status": "processing",
  "estimatedTime": 30000
}
```

### Project Management Endpoints

- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `DELETE /api/projects/:id` - Delete project

---

## 🧪 Testing & Development

### Running Tests

```bash
# Frontend tests
npm run test:web

# Worker tests
cd apps/worker
pytest
```

### Building

```bash
# Build web application
npm run build:web

# Build Docker images
docker-compose -f docker/docker-compose.yml build
```

### Sample Documents

Test files are located in `benchmarks/`:
- `academic_sample.md` - Document with math and citations
- `company_profile.docx` - Example reference document
- `references.bib` - BibTeX sample bibliography

---

## 📝 Configuration

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Worker
WORKER_TIMEOUT=120
WORKER_MAX_MEMORY=4096
WORKER_MAX_CPU=2
```

### Database Migrations

Migrations are stored in `supabase/migrations/`. Run them with:

```bash
npx supabase db push
```

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs with:
- Clear description of changes
- Tests for new features
- Updated documentation

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🔗 Documentation

- [Architecture Documentation](./ARHICTECTURE.md) - System design and data flow
- [Product Requirements](./PRD.md) - Feature specifications and requirements
- [Must-Have Checklist](./Mustbe.md) - Critical implementation items

---

## 💡 Roadmap

- [ ] Real-time collaborative editing
- [ ] Advanced workflow automation
- [ ] API key management for programmatic access
- [ ] Webhook support for external integrations
- [ ] Advanced analytics and usage metrics
- [ ] Team management and permissions

---

## 🆘 Support

For issues, questions, or feature requests, please:
- Check existing issues on GitHub
- Create a new issue with detailed information
- Reach out to the maintainers

---

**Built with ❤️ for document conversion enthusiasts**
