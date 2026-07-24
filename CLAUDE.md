# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project identity

RunDoc (conversion core branded "Pandoc Orchestrator") is a monorepo pairing a Next.js App Router web app (`apps/web`) with a Python FastAPI worker (`apps/worker`) that drives Pandoc via subprocess. It is privacy-first and ephemeral: no authentication, no user accounts, and no persistence of user files — each conversion runs in a unique `temp_workdir/{uuid}` folder that is auto-purged after 30 minutes, and request logs live only in an in-memory dict (`MOCK_LOGS`).

## Commands

```bash
# Install root/web JS dependencies (npm workspaces; only apps/web is a JS workspace)
npm install

# --- Web (Next.js) ---
npm run dev:web      # next dev  -> http://localhost:3000
npm run build:web    # next build
npm run lint:web     # eslint
# `npm run dev` is an alias for `npm run dev:web`

# --- Worker (FastAPI, Python — NOT an npm workspace) ---
python -m pip install -r apps/worker/requirements.txt   # first time only
npm run dev:worker   # == cd apps/worker && uvicorn app.main:app --reload --port 8000  -> http://localhost:8000

# --- Worker via Docker (builds only the worker) ---
docker compose -f docker/docker-compose.yml up --build
```

Correctness gates (run before considering a change done):

```bash
npm run lint:web && npm run build:web                     # web
PYTHONPATH=apps/worker python -m pytest apps/worker/tests/ -v   # worker (Windows: $env:PYTHONPATH="apps/worker")
```

## Architecture

### System shape

Next.js web app (deployed on Vercel, or `npm run dev:web`) → HTTP `POST`/`GET` to `/api/v1/...` → FastAPI worker (Render/Docker) → list-form `subprocess` call to Pandoc / PDF engine → output written to an ephemeral `temp_workdir/{uuid}/` and served read-only from the `/outputs/*` static mount. The frontend calls the worker directly via `NEXT_PUBLIC_WORKER_API_URL` and proxies cross-origin output downloads through `apps/web/src/app/api/proxy/route.ts`. Verified against `apps/worker/app/main.py` and `apps/web/src/hooks/useConversion.ts`.

### Directory layout

```text
RunDoc/
├── apps/
│   ├── web/                      # Next.js 16 App Router frontend (npm workspace)
│   │   └── src/
│   │       ├── app/              # Routes (page.tsx, workspace/, api/proxy/)
│   │       ├── components/       # Monaco editor, preview, conversion panel, uploader
│   │       ├── hooks/            # useConversion.ts (React Query API client)
│   │       └── lib/              # config.ts (WORKER_API_URL), i18n.ts
│   └── worker/                   # FastAPI worker (Python; not an npm workspace)
│       ├── app/
│       │   ├── main.py           # FastAPI app, routes, middleware, cleanup task
│       │   ├── config.py         # Settings from env (dataclass + dotenv)
│       │   ├── core/             # pandoc_cmd.py (builder), engines.py, parser.py
│       │   ├── agent/            # Experimental orchestrator — NOT wired into main.py
│       │   └── filters/          # Lua/Python Pandoc filters
│       ├── Dockerfile            # Worker image (the real Dockerfile lives here)
│       ├── requirements.txt
│       └── tests/                # pytest suites (test_main, test_orchestrator, test_pandoc_cmd)
├── docker/
│   └── docker-compose.yml        # Builds the worker from apps/worker/Dockerfile
└── package.json                  # Root workspace scripts (workspaces: ["apps/web"])
```

### Key subsystems

- **Versioned API with root fallback** (`main.py`): the same `APIRouter` is mounted twice — `app.include_router(api_router, prefix="/api/v1")` and again at root `/`. Endpoints: `GET /health`, `GET /engines`, `GET /formats`, `POST /convert-direct`, `POST /analyze`. Swagger at `/docs`, ReDoc at `/redoc`.
- **Live conversion path**: `DocumentParser.detect_format` → `PandocCommandBuilder` (Builder pattern, `core/pandoc_cmd.py`) → `EngineRouter` selects a PDF/slide engine with fallback (`core/engines.py`). Compilation runs in `asyncio.to_thread`. If no PDF engine is available, output falls back to HTML. The `app/agent/` orchestrator is experimental and is NOT imported by `main.py`.
- **Ephemeral cleanup task**: an asyncio task started on FastAPI `startup` scans `temp_workdir` every 10 minutes (`CLEANUP_INTERVAL_SECONDS = 600`) and `shutil.rmtree`s any folder older than 30 minutes (`CLEANUP_MAX_AGE_SECONDS = 1800`).
- **Security guards**: list-form `subprocess.run` (no `shell=True`), a 100MB free-disk check before every compile (`verify_free_disk_space` → HTTP 507), a `WORKER_MAX_TIMEOUT` (default 120s) compile timeout, and slowapi rate limiting (`10/minute`) on `convert-direct` and `analyze`.
- **Request tracing**: HTTP middleware assigns/echoes an `X-Request-ID` header (via `contextvars`) and emits structured JSON audit logs per request.

## Absolute rules — do not break these

1. **Never use `shell=True`.** Pandoc/engine invocations must stay list-form (`subprocess.run(["pandoc", ...])`) so untrusted input can never reach a shell.
2. **Always check free disk space before compiling.** Keep the `verify_free_disk_space()` (≥100MB → else HTTP 507) call ahead of any conversion write.
3. **Keep files ephemeral.** Conversions live in `temp_workdir/{uuid}` and MUST remain auto-purged by the background cleaner (30-min max age); do not add code paths that retain user files.
4. **No auth, no persistence of user files.** Do not add login/token gates or write user files/content to a database or cloud storage. Request state stays in the in-memory `MOCK_LOGS` dict only.
5. **Preserve the compile timeout.** Every Pandoc execution must run under `settings.max_timeout` (default 120s); do not remove the `timeout=` on `subprocess.run`.
6. **Keep API versioning + root fallback.** Register endpoints under both `/api/v1` and root `/`; do not drop either mount.

## Doc trust note

When docs and code disagree, the code is the source of truth — verify against `apps/worker/app/` and `apps/web/src/` and update the docs (README.md, ARCHITECTURE.md) to match.
