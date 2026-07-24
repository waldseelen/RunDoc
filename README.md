# 📄 RunDoc

> **Powered by the Pandoc Orchestrator engine**

Modern, privacy-first, anonymous document conversion platform. Powered by a Next.js (App Router) frontend and a Python FastAPI worker that drives Pandoc and professional rendering engines directly from your browser — no account, no login, no cloud storage of your files.

Transform documents dynamically across formats with advanced filter pipelines, bibliography citation management, customized styles, and live high-fidelity previews. Uploaded files are processed in ephemeral per-request working directories and automatically purged.

---

## 🎯 Platform Features

- **Multi-Format Conversion**: Seamlessly convert between 30+ document formats including Markdown, Jupyter Notebooks, DOCX, LaTeX, HTML5, EPUB, Typst, RTF, and others.
- **Advanced PDF & Slide Engines**: High-fidelity PDF compiling using XeLaTeX, LuaLaTeX, pdfLaTeX, Tectonic, Typst (highly modern & fast), and HTML-to-PDF (WeasyPrint). Native presentations with RevealJS, PowerPoint (PPTX), and Beamer.
- **Privacy-First Ephemeral Model**: No authentication and no persistence of user files. Each conversion runs in a unique `temp_workdir/{uuid}` folder, outputs are served from a local static file server (`/outputs/*`), request logs live only in an in-memory dictionary (`MOCK_LOGS`), and a background task purges every working directory older than 30 minutes.
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
                       │      Ephemeral Local Compiler            │
                       │  - In-Memory Dict Logging (MOCK_LOGS)    │
                       │  - Ephemeral Disk File Server (/outputs) │
                       │  - Automatic 30-Min Temporary Cleanup    │
                       └──────────────────────────────────────────┘
```

---

## 📁 Project Structure

```text
RunDoc/                              # Root workspace (npm workspaces: apps/web only)
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
│   └── worker/                      # FASTAPI PYTHON WORKER (not an npm workspace)
│       ├── app/
│       │   ├── main.py              # API routes, tracing middleware, cleanup task
│       │   ├── config.py            # Environment parser (dotenv loader)
│       │   ├── core/
│       │   │   ├── pandoc_cmd.py    # List-based CLI subprocess executor (Builder)
│       │   │   ├── engines.py       # PDF/slide engine router & availability checks
│       │   │   └── parser.py        # Document format detection & content analysis
│       │   ├── agent/               # Experimental orchestrator (not wired into convert path)
│       │   └── filters/             # Lua/Python Pandoc filters
│       ├── Dockerfile               # Python FastAPI + TeX + Typst image
│       ├── .env                     # Worker environment configuration
│       ├── requirements.txt         # Python package dependencies
│       └── tests/                   # Pytest suites (40+ test cases)
│
├── docker/
│   └── docker-compose.yml           # Builds the worker from apps/worker/Dockerfile
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

   #### Option A: Running Locally (Fast Dev Mode)
   This method utilizes your local Python environment and Next.js server. Both scripts are defined in the root `package.json`.

   * **Terminal 1: Start Next.js App**
     ```bash
     npm run dev:web
     ```
     The user interface starts at `http://localhost:3000`.

   * **Terminal 2: Start FastAPI Worker**
     ```bash
     # First time only: install Python deps
     python -m pip install -r apps/worker/requirements.txt

     # Then run the worker (equivalent to: cd apps/worker && uvicorn app.main:app --reload --port 8000)
     npm run dev:worker
     ```
     The worker runs at `http://localhost:8000`.

   #### Option B: Running the worker via Docker (Full Compilation Suite)
   To enable all engines (XeLaTeX, pdfLaTeX, Typst, WeasyPrint) without installing heavy TeX Live libraries directly on your PC. The compose file builds only the worker (the web app is intended for Vercel or `npm run dev:web`):
   ```bash
   docker compose -f docker/docker-compose.yml up --build
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

All endpoints are anonymous — there is **no authentication, no login, and no token mechanism**. Every endpoint is registered twice: under the versioned prefix `/api/v1/...` and at the root `/...` as a fallback for legacy integrations. The worker exposes interactive docs at `/docs` (Swagger) and `/redoc`.

### 1. Health Status check
* **Method**: `GET`
* **Path**: `/api/v1/health`
* **Response**:
  ```json
  {
    "status": "healthy",
    "pandoc_available": true,
    "version": "1.0.0"
  }
  ```
  `status` is `"healthy"` when the `pandoc` binary is on `PATH`, otherwise `"degraded"`.

### 2. Discovery endpoints
* `GET /api/v1/engines` — lists all PDF and slide engines with per-engine availability (see the engine list under Platform Features).
* `GET /api/v1/formats` — lists supported input and output formats.

### 3. Direct Conversion (Sync)
* **Method**: `POST`
* **Path**: `/api/v1/convert-direct`
* **Content-Type**: `multipart/form-data`
* **Rate limit**: `10/minute` per client IP (via slowapi)
* **Request Headers**:
  - `X-Request-ID: <custom-request-uuid>` (Optional — echoed back on the response for tracing)
* **Request Form Parameters**:
  | Name | Type | Description | Default |
  | :--- | :--- | :--- | :--- |
  | `text` | String | Raw text content to convert | `None` |
  | `file` | Binary | File to convert (alternative to `text`) | `None` |
  | `output_format` | String | Output format (`pdf`, `docx`, `html`, `pptx`, `epub`, `latex`, `typst`, etc.) | `pdf` |
  | `engine` | String | Preferred PDF/slide engine (e.g. `xelatex`, `typst`, `weasyprint`) | `None` |
  | `citeproc` | Boolean | Enable citation processing (`--citeproc`) | `false` |
  | `toc` | Boolean | Include Table of Contents | `false` |
  | `toc_depth` | Integer | Max depth for TOC headings (1-6) | `3` |
  | `smart` | Boolean | Smart typography | `true` |
  | `number_sections` | Boolean | Number section headings | `false` |
  | `standalone` | Boolean | Produce a standalone document | `true` |
  | `highlight_style` | String | Code highlight style | `pygments` |
  | `math_rendering` | String | Math syntax (`mathjax`, `katex`, `mathml`, `gladtex`, `webtex`) | `mathjax` |
  | `extract_media` | Boolean | Extract embedded media | `false` |

  If a PDF is requested but no PDF engine is available, the worker automatically falls back to HTML output.
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

### 4. Document Analysis
* **Method**: `POST`
* **Path**: `/api/v1/analyze`
* **Content-Type**: `multipart/form-data`
* **Rate limit**: `10/minute` per client IP
* **Form Parameters**: `file` (required), `target_format` (default `pdf`)
* Detects the input format, extracts YAML metadata, analyzes content, and returns suggested conversion options. The uploaded file is processed in a temporary directory and deleted immediately after analysis.

---

## 🔒 Production Security Protocols
- **Subprocess Arguments**: Command structures are executed as explicitly defined Python lists (`['pandoc', 'input.md', ...]`) rather than raw string queries, completely preventing shell-injection vectors.
- **Disk Guardians**: Real-time disk capacity validators block conversions if workspace directory space drops below `100MB`, responding with a fast `507 Insufficient Storage` code.
- **Timeout Limitations**: High-intensity conversions are forcibly terminated after `120` seconds to block infinite rendering loops.
- **CORS Constraints**: Restricts incoming requests strictly to origins registered under `ALLOWED_ORIGINS` environment parameters.

---

**Developed with precision for absolute cross-platform document rendering excellence.**
