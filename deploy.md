# 🚀 RunDoc (Pandoc Orchestrator) Deployment Guide

This document is a comprehensive, step-by-step deployment guide designed for the deployment agent (or developer) to successfully set up, configure, and deploy the entire **RunDoc** platform as a **privacy-first, ephemeral, zero-config document converter** (iLovePDF.com style).

The architecture is lightweight and has **zero database or cloud storage dependencies**.
1. **Frontend**: Next.js deployed on **Vercel** via **Vercel CLI**.
2. **Backend**: FastAPI Python Worker deployed on **Render** using a custom optimized **Docker** image via **Render CLI**.

---

## 🏛️ Deployment Architecture Overview

```text
  [ Client Browser ]
         |
         | (Direct HTTPS Requests)
         v
  +----------------------------------+       (CORS Requests)       +-----------------------------------+
  |      Next.js (Vercel)            | --------------------------> |     FastAPI Worker (Render)       |
  |  - Frontend Interface            |                             |  - Pandoc CLI Subprocess Wrapper  |
  |  - Monaco Live Editor            | <-------------------------- |  - Precompiled Typst & XeLaTeX    |
  +----------------------------------+                             +-----------------------------------+
```

---

## 🔍 Critical Research: System Dependencies & Render.com Constraints

### The "Full Pandoc" Challenge
Pandoc requires external compile engines to render PDFs and Slides:
- **XeLaTeX/PDFLaTeX**: Traditionally comes with `texlive-full`. However, `texlive-full` is **~5GB+** installed. Installing this inside a Docker image on Render's build servers will cause the build to **time out** or **exceed RAM limits** (512MB RAM limit on standard free instances).
- **Tectonic**: A modern, XeTeX-based engine that automatically downloads required LaTeX packages on the fly, keeping the container extremely small and robust.
- **Typst**: A modern, rust-powered, lightweight typesetting engine. Extremely fast, very small, and excellent alternative for markdown-to-pdf.
- **WeasyPrint**: A CSS-based HTML-to-PDF compiler, much lighter than TeX Live.
- **Paged.js CLI**: A CSS Paged Media rendering engine, powered by headless Chromium and Node.js.

### 💡 The Solution: Curated System Packages & Optimized Dockerfile
Instead of utilizing Render's native Python environment (which lacks Pandoc and LaTeX altogether) or installing the massive `texlive-full`, we use an **optimized Docker deployment** containing:
1. Precompiled **Pandoc** (latest `.deb` package).
2. Precompiled **Typst** binary (downloaded directly from GitHub).
3. Curated **TeX Live XeLaTeX** package groups (`texlive-xetex`, `texlive-latex-recommended`, `texlive-latex-extra`, `texlive-fonts-recommended`, `texlive-plain-generic`) to keep the environment size under **800MB** instead of 5GB.
4. Precompiled **Tectonic** binary.
5. **Node.js, NPM, and Chromium** to support **Paged.js CLI** globally inside the container.
6. Essential system fonts (`fonts-liberation`, `fonts-dejavu`, `fonts-noto`) for perfect multilingual PDF support.
7. ImageMagick policy adjustments to allow PDF read/write processes safely.

Below is the optimized Dockerfile that the agent **must** use for backend deployment:

```dockerfile
# apps/worker/Dockerfile (or root docker/worker.Dockerfile)
FROM python:3.11-slim-bullseye

# Environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8

WORKDIR /app

# 1. Install system utilities, fonts, and curated lightweight TeX Live packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    git \
    ca-certificates \
    build-essential \
    cmake \
    # Fonts for perfect multilingual typography rendering
    fonts-liberation \
    fonts-dejavu \
    fonts-noto \
    locales \
    # Curated LaTeX packages (Essential for XeLaTeX without 5GB image size)
    texlive-xetex \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-plain-generic \
    # Image processing tools
    ghostscript \
    imagemagick \
    # WeasyPrint system graphics & binding libraries
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libffi-dev \
    shared-mime-info \
    # Node.js + NPM + Chromium (Essential for Paged.js PDF engine)
    nodejs \
    npm \
    chromium \
    chromium-driver \
    && echo "en_US.UTF-8 UTF-8" > /etc/locale.gen \
    && locale-gen \
    && rm -rf /var/lib/apt/lists/*

# 2. Modify ImageMagick policy to allow PDF read/write operations (Essential for previews)
RUN sed -i 's/domain="coder" rights="none" pattern="PDF"/domain="coder" rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml || true

# 3. Install Pandoc (Latest Release 3.1.9)
RUN wget https://github.com/jgm/pandoc/releases/download/3.1.9/pandoc-3.1.9-1-amd64.deb && \
    dpkg -i pandoc-3.1.9-1-amd64.deb && \
    rm pandoc-3.1.9-1-amd64.deb

# 4. Install Typst (Latest Release v0.11.0)
RUN curl -L https://github.com/typst/typst/releases/download/v0.11.0/typst-x86_64-unknown-linux-musl.tar.xz | tar -xJ && \
    mv typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst && \
    rm -rf typst-x86_64-unknown-linux-musl

# 5. Install Tectonic (Latest Release v0.15.0 - Automated lightweight TeX compiler)
RUN wget https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-musl.tar.gz && \
    tar -xzf tectonic-0.15.0-x86_64-unknown-linux-musl.tar.gz && \
    mv tectonic /usr/local/bin/tectonic && \
    rm tectonic-0.15.0-x86_64-unknown-linux-musl.tar.gz

# 6. Install Paged.js globally via NPM (CSS Paged Media rendering)
RUN npm install -g pagedjs-cli --unsafe-perm

# 7. Copy requirements and install python backend libraries
COPY apps/worker/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# 8. Copy application code
COPY apps/worker /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

# Start FastAPI application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 📦 Package Dependencies, Libraries, and Core Functions

Here is the complete checklist of exactly what libraries are being installed, their functions in the runtime, and which parts of the application they power:

### 1. Backend Service (Python FastAPI Worker)
These dependencies are listed in `apps/worker/requirements.txt` and installed via `pip`:

| Library Name | Version | Role in Deployment | Core Functions & API Endpoints Powered |
| :--- | :--- | :--- | :--- |
| **`fastapi`** | `0.115.0` | High-performance ASGI Web Framework. | Powers `/health`, `/engines`, `/formats`, `/convert-direct` and `/analyze` HTTP routes and CORS middleware configurations. |
| **`uvicorn[standard]`** | `0.30.0` | High-speed ASGI Web Server. | Powers the process entry point, hosting the FastAPI application on port `8000`. |
| **`python-multipart`** | `0.0.12` | Form Data Parser. | Handlers `/convert-direct` endpoint, parsing files and text payload directly from request streams. |
| **`slowapi`** | `0.1.9` | Rate Limiter Middleware. | Enforces request limits (`10/minute` for `/convert-direct`) based on client remote IP. |
| **`panflute` & `pandocfilters`** | `2.3.1` / `1.5.1` | Pandoc AST scripting libraries. | Enables Python-based filters to traverse, adjust, and style the Pandoc Abstract Syntax Tree during PDF/HTML generation. |
| **`pydantic-settings`** | `2.3.4` | System Configuration Parser. | Parses settings and fallback config structures directly from `.env` or system environment bindings. |
| **`python-jose[cryptography]`**| `3.3.0` | JSON Web Token (JWT) library. | Handles JWT parsing, token decoding, and authorization checks. |
| **`weasyprint`** | `62.3` | HTML-to-PDF compilation engine. | Compiles responsive and custom styling markup structures directly into high-fidelity PDFs. |
| **`httpx`** | `0.27.2` | Async HTTP Client. | Handlers backend internal HTTP/network testing. |

### 2. Frontend Web App (Next.js UI)
These dependencies are configured in `apps/web/package.json` and installed via `npm`:

| Library Name | Version | Role in Deployment | Core Functions Powered |
| :--- | :--- | :--- | :--- |
| **`next`** | `16.2.6` | React Framework. | Powers application routing, Server-Side Rendering (SSR), and static generation. |
| **`@monaco-editor/react`** | `4.7.0` | Monaco Code Editor. | Powers the real-time Markdown editor panel with syntax highlighting, indentation, and key bindings. |
| **`@tanstack/react-query`** | `5.100.14` | Client-side Async Caching. | Handles background fetching and API caching. |
| **`@radix-ui/*`** | (Various) | Unstyled UI primitives. | Powers responsive popups, tabs, dialogs, dropdowns, and toast alert boxes. |
| **`lucide-react`** | `1.16.0` | Icon Library. | Renders high-quality vector icons for documents, files, and compilers. |
| **`tailwindcss`** | `4.0` | Visual styling. | Powers the custom modern layout, responsive design, dark mode, and sleek micro-animations. |

---

## 🛠️ Required CLI Tools & Environments

The deployment agent must have the following CLI utilities installed and logged in on the deployment machine:

### 1. Vercel CLI (`vercel`)
*Used to deploy the Next.js Frontend to Vercel.*
- **Installation**:
  ```bash
  npm install -g vercel
  ```
- **Login**:
  ```bash
  vercel login
  ```

### 2. Render CLI (`render`)
*Used to configure, create, and trigger builds on Render.com.*
- **Installation (Direct Download/Binary)**:
  Download the corresponding executable from [GitHub Releases](https://github.com/render-oss/cli/releases) or use:
  ```bash
  # macOS/Linux
  curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | sh
  ```
- **Login & Authenticate**:
  The Render CLI can authenticate via a persistent API Key in automation scripts. Generate a token in your Render Account Settings, and set the environment variable:
  ```bash
  export RENDER_API_KEY=rnd_YOUR_RENDER_API_KEY
  ```
  Verify status:
  ```bash
  render workspaces
  ```

---

## 📖 Essential Render CLI Local References

To perform advanced CLI-level monitoring, orchestration, and troubleshooting on Render.com, the deployment agent should refer to the following repository documentation assets:

1. **[render-cli.md](file:///c:/Users/HP/DEV/RunDoc/render-cli.md)**: 
   Provides detailed guides on installation, direct command reference, setup steps, psql, ssh, blueprints, and non-interactive scripts.
2. **[render-cli-doc.md](file:///c:/Users/HP/DEV/RunDoc/render-cli-doc.md)**: 
   Contains deep technical command references including `-o / --output` configuration parameters, `--confirm` bypass methods, workspace setting commands (`render workspace set`), service creation options (`render services create`), and step-by-step GitHub Actions automated CI/CD pipeline code structures.

---

## 📅 Step-by-Step Deployment Instructions

Follow these exact steps sequentially. Ensure each phase completes successfully before starting the next.

### Phase 1: Deploy FastAPI Backend (Render CLI)

Render allows deployment from a Git repository using either a blueprint (`render.yaml`) or direct CLI configuration. Since the Pandoc worker requires a custom Docker environment, we deploy it as a Docker Web Service.

1. **Verify or Place the Dockerfile**:
   Ensure the optimized Dockerfile is located at `/apps/worker/Dockerfile` (or set the build context correctly).

2. **Deploy the Service via Render CLI**:
   Using the `render` command line interface, create a new Docker Web Service:
   ```bash
   render services create \
     --name rundoc-worker \
     --type web \
     --repo https://github.com/your-username/RunDoc \
     --branch main \
     --docker-path apps/worker/Dockerfile \
     --plan free \
     --output json --confirm
   ```
   *Note: Save the `SERVICE_ID` returned by this command to configure variables and trigger future deployments.*

3. **Configure Environment Variables on Render**:
   Set the required variables using the Render CLI or Dashboard:
   - `WORKER_REQUIRE_AUTH`: `false` (Bypasses authentication for completely free/open usage)
   - `ALLOWED_ORIGINS`: `https://your-frontend.vercel.app,http://localhost:3000`
   - `WORKER_API_URL`: `https://rundoc-worker.onrender.com` (Your Render deployment URL)
   - `WORKER_API_TOKEN`: `change-me`

4. **Trigger Initial Service Build**:
   ```bash
   render deploys create [SERVICE_ID] --wait --output json --confirm
   ```
   Verify live logs to ensure all LaTeX packages, Pandoc, and Typst compile properly:
   ```bash
   # View live logs
   render services logs [SERVICE_ID]
   ```

---

### Phase 2: Deploy Next.js Frontend (Vercel CLI)

1. **Navigate to the web app workspace**:
   ```bash
   cd apps/web
   ```

2. **Link the project to Vercel**:
   Run the link command to associate the project with your Vercel account:
   ```bash
   vercel link --yes
   ```

3. **Configure Production Environment Variables on Vercel**:
   Add the following environment variables. Replace values with your actual production endpoints:
   ```bash
   # Point Frontend to Render Backend
   vercel env add NEXT_PUBLIC_WORKER_API_URL production https://rundoc-worker.onrender.com
   vercel env add NEXT_PUBLIC_WORKER_API_TOKEN production change-me
   ```

4. **Deploy to Vercel Production**:
   ```bash
   vercel deploy --prod
   ```
   *Expected Output:* Vercel will output a unique deployment URL (e.g. `https://rundoc-frontend.vercel.app`). Note this URL.

5. **Update Render CORS Allowed Origins**:
   Go back and update your Render Web Service's `ALLOWED_ORIGINS` variable to include your final Vercel production URL:
   ```bash
   # Update service environment
   # ALLOWED_ORIGINS=https://rundoc-frontend.vercel.app,http://localhost:3000
   ```
   Trigger a quick redeploy on Render so the CORS configuration changes take effect:
   ```bash
   render deploys create [SERVICE_ID] --confirm
   ```

---

## 📈 Environment Variables Reference Matrix

| Service | Environment Variable | Recommended Value / Source | Description |
| :--- | :--- | :--- | :--- |
| **Worker (Render)** | `WORKER_REQUIRE_AUTH` | `false` | Disabled token verification for open public usage. |
| **Worker (Render)** | `WORKER_API_URL` | `https://rundoc-worker.onrender.com` | Self-referencing URL of the running worker. |
| **Worker (Render)** | `ALLOWED_ORIGINS` | `https://your-frontend.vercel.app,http://localhost:3000` | CORS Allowed Origins. MUST match the Vercel production URL. |
| **Web (Vercel)** | `NEXT_PUBLIC_WORKER_API_URL` | `https://rundoc-worker.onrender.com` | Endpoint of the FastAPI backend. |
| **Web (Vercel)** | `NEXT_PUBLIC_WORKER_API_TOKEN` | `change-me` | Shared security token for frontend request verification. |

---

## 🔍 Post-Deployment Verification Plan

Once all components are deployed, the agent **must** perform the following verification steps:

1. **Verify Backend Health Endpoint**:
   Query the `/health` endpoint of your deployed Render app:
   ```bash
   curl https://rundoc-worker.onrender.com/health
   ```
   **Expected Response**:
   ```json
   {
     "status": "healthy",
     "pandoc_available": true,
     "auth_required": false,
     "version": "0.1.0"
   }
   ```
   *If `pandoc_available` is `false`, the Docker image was built incorrectly.*

2. **Verify Engine Capabilities**:
   Query the `/engines` endpoint to confirm XeLaTeX, Tectonic, Typst, WeasyPrint, and Paged.js are successfully detected by the Engine Router:
   ```bash
   curl https://rundoc-worker.onrender.com/engines
   ```
   **Expected Response**: `xelatex`, `tectonic`, `typst`, `weasyprint`, and `pagedjs-cli` engines should return `"available": true`.

3. **Perform a Test Direct Conversion**:
   Simulate a quick PDF conversion:
   ```bash
   curl -X POST https://rundoc-worker.onrender.com/convert-direct \
     -F "text=# Hello World" \
     -F "output_format=pdf" \
     -F "engine=typst"
   ```
   **Expected Response**: A `200 OK` status with `status: "completed"` and an output download URL.

4. **Verify CORS Settings & Frontend Integration**:
   - Open your deployed Vercel application.
   - Open the Monaco Editor, type Markdown text, and click the **Compile/Derle** button.
   - Verify the progress bar starts animating, queries the Render backend, succeeds, and displays the compiled output in the preview panel seamlessly!
