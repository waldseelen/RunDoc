# 📄 Pandoc Orchestrator

Modern, ultra-performant, and feature-rich document conversion and orchestration suite. Powered by a Next.js (App Router) frontend, a Python FastAPI worker, and seamless Docker integration, Pandoc Orchestrator brings the full power of Pandoc and professional rendering engines directly to your browser.

Transform documents dynamically across formats with advanced filter pipelines, bibliography citation management, customized styles, and live high-fidelity previews.

---

## 🎯 Platform Features

- **Multi-Format Conversion**: Seamlessly convert between 30+ document formats including Markdown, Jupyter Notebooks, DOCX, LaTeX, HTML5, EPUB, Typst, RTF, and others.
- **Advanced PDF & Slide Engines**: High-fidelity PDF compiling using XeLaTeX, LuaLaTeX, pdfLaTeX, Tectonic, Typst (highly modern & fast), and HTML-to-PDF (WeasyPrint). Native presentations with RevealJS, PowerPoint (PPTX), and Beamer.
- **Privacy-First Local Sandbox Mode**: Start coding, compiling, and testing instantly! The system operates 100% locally with zero cloud dependencies, utilizing an isolated in-memory logger, a local disk-based compiled static file server (`/outputs/*`), and a guest access model, eliminating all latency, cloud billing errors, and auth failures.
- **Academic Publishing Tools**: Deep citation processing via `citeproc`, supporting BibTeX (`.bib`) and CSL JSON bibliographies with built-in styles (APA, MLA, Harvard, IEEE, Chicago).
- **Mathematics Rendering**: Advanced math compilers support KaTeX, MathJax, MathML, and WebTeX rendering across HTML and PDF outputs.
- **Robust CLI Builder & Validator**: Executed under a secure list-based subprocess wrapper to prevent shell command injection. Validates that the system has at least `100MB` of free disk space before initiating any compilation to prevent disk-exhaustion crashes.
- **Granular Progress UX**: A beautiful progressive loading screen that simulates multi-tier compiling intervals (5% ➔ 50% ➔ 75% ➔ 95%) and instantly fills to 100% upon successful compile resolving.
- **Tracing & Auditing**: Comprehensive API versioning (`/api/v1`), standard fallback routing, request-id tracing (`X-Request-ID`) using Python `contextvars`, and structured JSON logs.

---

## 🏗️ System Architecture

```
                       ┌──────────────────────────────────────────┐
                       │    Next.js 16 Web Frontend (Turbopack)   │
                       │  - Live Monaco Editor & Visual Preview   │
                       │  - Progressive Simulation Progress Bar   │
                       │  - Direct /api/v1/ Endpoint Routing      │
                       └──────────────────┬───────────────────────┘
                                          │
                                          │ HTTP API POST / GET
                                          ▼
                       ┌──────────────────────────────────────────┐
                       │      Python FastAPI Worker Engine        │
                       │  - Safe Subprocess Command Execution     │
                       │  - Disk Space Space Validator (>=100MB)  │
                       │  - Engine Router & AST CLI Builders      │
                       └──────────────────┬───────────────────────┘
                                          │
                                          ▼
                       ┌──────────────────────────────────────────┐
                       │      Isolated Local Sandbox Compiler     │
                       │  - In-Memory SQLite Mock Logging         │
                       │  - Ephemeral Disk File Server (/outputs) │
                       │  - Automatic 30-Min Temporary Cleanup    │
                       └──────────────────────────────────────────┘
```

---

## 📁 Project Structure

```text
pandoc-orchestrator/
├── apps/
│   ├── web/                         # NEXT.JS FRONTEND
│   │   ├── src/
│   │   │   ├── app/                 # Next.js App Router Pages
│   │   │   │   ├── page.tsx         # Onboarding Wizard & Landing Page
│   │   │   │   └── workspace/       # IDE Monaco Workspace View
│   │   │   ├── components/          # Premium UI Widgets
│   │   │   │   ├── preview.tsx      # Progressive Progress Visualizer & Iframe
│   │   │   │   ├── editor.tsx       # Monaco Editor Component Wrapper
│   │   │   │   └── conversion-panel.tsx # Compilation Options Configuration
│   │   │   ├── hooks/
│   │   │   │   └── useConversion.ts # React Query integration
│   │   │   └── lib/
│   │   │       ├── config.ts        # Clean API Configuration
│   │   │       └── i18n.ts          # Localization translations
│   │   ├── .env.local               # Web Environment Configuration
│   │   └── package.json
│   │
│   └── worker/                      # FASTAPI PYTHON WORKER
│       ├── app/
│       │   ├── main.py              # Main API Routes & Tracing Middleware
│       │   ├── config.py            # Environment Parser (dotenv loader)
│       │   ├── core/
│       │   │   ├── pandoc_cmd.py    # List-based CLI Subprocess Executor
│       │   │   ├── engines.py       # XeLaTeX/Typst/WeasyPrint Router
│       │   │   └── parser.py        # Document Parser & AST Analyzer
│       ├── .env                     # Worker Environment Configuration
│       ├── requirements.txt         # Python Package Dependencies
│       └── tests/                   # Pytest Suites (40+ passing integration tests)
│
├── docker/
│   ├── docker-compose.yml           # Monorepo Local Orchestrator Compose
│   └── worker.Dockerfile            # Python FastAPI + TeX Live Full + Typst Build
│
├── benchmarks/                      # Compilation and Style Benchmark Samples
│   ├── academic_sample.md           # Equations and Citation Source MD
│   ├── company_profile.docx         # Reference Document Styling File
│   └── references.bib               # BibTeX bibliography list
│
├── ARCHITECTURE.md                  # Detailed Technical Architecture Specifications
├── package.json                     # Root Workspace Monorepo Configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18` or `v20`+
- **Python**: `v3.10` or `v3.11`+ (ensure `pip` is available)
- **Docker & Docker-Compose** (Optional, highly recommended for full LaTeX compilation engines)
- **Pandoc CLI**: Local installation required if not running via Docker.

---

### Step-by-Step Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd RunDoc
   ```

2. **Install Root Node Dependencies**
   ```bash
   npm install
   ```

3. **Establish Environment Variables**
   The project is preconfigured to run locally out-of-the-box using the Sandbox Fallback Mode. Let's create the environment files:
   ```bash
   # Create frontend environment config
   cp apps/web/env.local.example apps/web/.env.local

   # Create backend environment config
   cp apps/worker/.env.example apps/worker/.env
   ```

4. **Launch Local Services**

   #### Option A: Running Locally (Fast Sandbox Dev Mode)
   This method utilizes your local Python environment and Next.js server.
   
   * **Terminal 1: Start Next.js App**
     ```bash
     npm run dev
     ```
     The user interface starts instantly at `http://localhost:3000`.

   * **Terminal 2: Start FastAPI Worker**
     ```bash
     cd apps/worker
     python -m pip install -r requirements.txt
     python -m uvicorn app.main:app --reload --port 8000
     ```
     The worker runs at `http://localhost:8000`.

   #### Option B: Running via Docker (Full Compilation Suite)
   To enable all engines (XeLaTeX, pdfLaTeX, Typst, WeasyPrint) without installing heavy TeX Live libraries directly on your PC:
   ```bash
   docker-compose -f docker/docker-compose.yml up --build
   ```

---

## 🧪 Testing and Quality Control

The FastAPI worker includes a highly strict, automated validation suite (40+ test cases) verifying routing, API prefixes, headers, disk monitoring, and subprocess executors.

### Execution Instructions
Set the `PYTHONPATH` and run pytest:
```bash
# Windows (PowerShell)
$env:PYTHONPATH="apps/worker"
python -m pytest apps/worker/tests/ -v

# Linux / MacOS (Bash)
PYTHONPATH=apps/worker python -m pytest apps/worker/tests/ -v
```

---

## 📚 API Reference

All requests must route through `/api/v1` or the root `/` paths. In sandbox development mode, if a token fails authorization, it is automatically accepted under a mock `sandbox-user` context.

### 1. Health Status check
* **Method**: `GET`
* **Path**: `/api/v1/health`
* **Response**:
  ```json
  {
    "status": "healthy",
    "pandoc_available": true,
    "auth_required": false,
    "version": "0.1.0"
  }
  ```

### 2. Direct Conversion (Sync)
* **Method**: `POST`
* **Path**: `/api/v1/convert-direct`
* **Content-Type**: `multipart/form-data`
* **Request Headers**:
  - `Authorization: Bearer <shared-secret-or-any-token>`
  - `X-Request-ID: <custom-request-uuid>` (Optional)
* **Request Form Parameters**:
  | Name | Type | Description | Default |
  | :--- | :--- | :--- | :--- |
  | `text` | String | Raw text content to convert | `None` |
  | `file` | Binary | File to convert (Alternative to text) | `None` |
  | `output_format` | String | Output format (`pdf`, `docx`, `html`, `pptx`, etc.) | `pdf` |
  | `engine` | String | Rendering engine (`xelatex`, `typst`, `weasyprint`) | `None` |
  | `toc` | Boolean | Include Table of Contents | `false` |
  | `toc_depth` | Integer | Max depth for TOC headings (1-6) | `3` |
  | `math_rendering` | String | Math syntax (`mathjax`, `katex`, `mathml`) | `mathjax` |
* **Response**:
  ```json
  {
    "job_id": "c617b4ef-1563-4ba0-a4bd-215f5a8a1012",
    "status": "completed",
    "input_format": "markdown",
    "output_format": "pdf",
    "engine_used": "typst",
    "execution_time_ms": 482,
    "output_url": "http://localhost:8000/outputs/c617b4ef-1563-4ba0-a4bd-215f5a8a1012/compiled_output.pdf",
    "command_executed": "pandoc document.md -o compiled_output.pdf --pdf-engine=typst"
  }
  ```

---

## 🔒 Production Security Protocols
- **Subprocess Arguments**: Command structures are executed as explicitly defined Python lists (`['pandoc', 'input.md', ...]`) rather than raw string queries, completely preventing shell-injection vectors.
- **Disk Guardians**: Real-time disk capacity validators block conversions if workspace directory space drops below `100MB`, responding with a fast `507 Insufficient Storage` code.
- **Timeout Limitations**: High-intensity conversions are forcibly terminated after `120` seconds to block infinite rendering loops.
- **CORS Constraints**: Restricts incoming requests strictly to origins registered under `ALLOWED_ORIGINS` environment parameters.

---

**Developed with precision for absolute cross-platform document rendering excellence.**
