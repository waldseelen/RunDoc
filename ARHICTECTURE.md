```markdown
# Sistem Mimarisi ve Dizin İskeleti: Pandoc Orchestrator

Bu doküman, Next.js (Frontend + Auth Orchestrator) ve Python (FastAPI + Pandoc Worker) mimarisinin dizin yapısını, veri akış diyagramını ve bileşenler arası haberleşme iskeletini tanımlar.

---

## 1. Genel Sistem Mimarisi

Sistem, istemci tarafındaki ağır UI bileşenleri (Monaco Editor, Dosya Yükleme) ile sunucu tarafındaki izole dönüştürme motorunu (Docker/Pandoc) birbirinden ayırır.


```

+--------------------------------------------------------+
|                 Next.js Web Application                |
|  - UI (Shadcn, Tailwind, Monaco Editor)               |
|  - State Management & Polling (TanStack Query)         |
|  - Auth & Metadata Sync (Supabase Client)              |
+---------------------------+----------------------------+
| (HTTP API / Webhook)
v
+--------------------------------------------------------+
|               Python FastAPI Worker (Docker)           |
|  - Pandoc CLI Wrapper (Subprocess Isolation)           |
|  - Engine Router (LaTeX, Typst, WeasyPrint)            |
|  - AST & Filter Injector (Lua / Python)                |
+---------------------------+----------------------------+
| (Storage / DB Ops)
v
+--------------------------------------------------------+
|                     Supabase Backend                   |
|  - PostgreSQL (Project, Document, Log States)          |
|  - Object Storage (/source, /reference, /output)       |
+--------------------------------------------------------+

```

---

## 2. Bütünleşik Proje Dizin Yapısı (Monorepo İskeleti)

```text
pandoc-orchestrator/
├── apps/
│   ├── web/                     # NEXT.JS FRONTEND & API ROUTES
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx     # Dashboard / Proje Listesi
│   │   │   │   └── workspace/   # Düzenleyici ve Dönüşüm Ekranı
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/          # Shadcn Bileşenleri
│   │   │   │   ├── editor.tsx   # Monaco Editor Entegrasyonu
│   │   │   │   ├── uploader.tsx # Sürükle-Bırak Dosya Yükleme
│   │   │   │   └── preview.tsx  # PDF / Slayt Canlı Önizleme (Iframe)
│   │   │   ├── hooks/
│   │   │   │   └── useConversion.ts # Worker polling/status takibi
│   │   │   └── lib/
│   │   │       └── supabase.ts  # Supabase Client konfigürasyonu
│   │   ├── package.json
│   │   └── tailwind.config.js
│   │
│   └── worker/                  # PYTHON FASTAPI & PANDOC CORE
│       ├── app/
│       │   ├── __init__.py
│       │   ├── main.py          # FastAPI Giriş Noktası & Rotalar
│       │   ├── config.py        # Ortam Değişkenleri (Supabase URL/Key)
│       │   ├── core/
│       │   │   ├── pandoc_cmd.py# CLI Komut Oluşturucu (Builder Pattern)
│       │   │   ├── engines.py   # PDF/Slayt Motor Seçici (Typst, LaTeX)
│       │   │   └── parser.py    # AST Analizi ve Meta Veri Çıkarımı
│       │   ├── filters/         # Öntanımlı Lua ve Python Filtreleri
│       │   │   ├── table_styler.lua
│       │   │   └── syntax_highlighter.py
│       │   └── services/
│       │       └── supabase_service.py # Dosya indirme/yükleme ve log yazma
│       ├── requirements.txt
│       └── tests/               # Worker Birim Testleri
│
├── docker/
│   ├── docker-compose.yml       # Lokal Geliştirme Ortamı
│   └── worker.Dockerfile        # Pandoc + LaTeX + Typst Bağımlılık İmajı
│
├── supabase/                    # VERİTABANI VE STORAGE YAPILANDIRMASI
│   ├── config.toml
│   ├── migrations/
│   │   └── 20260525000000_init_schema.sql # Tablo ve RLS Politikaları
│   └── seed.sql
│
└── benchmarks/                  # TEST VE ENTEGRASYON DOKÜMANLARI
    ├── academic_sample.md       # Matematik ve Atıf İçeren Test Dosyası
    ├── company_profile.docx     # Stil Çıkarımı İçin Referans Dosya
    └── references.bib           # BibTeX Kaynakça Örneği

```

---

## 3. Kritik Kod İskeletleri

### 3.1. Python Worker: Dinamik Komut Çalıştırıcı Taslağı (`core/pandoc_cmd.py`)

Ajanın ve sistemin üreteceği CLI komutlarını güvenli bir şekilde çalıştırmak için `subprocess` soyutlama katmanı:

```python
import subprocess
import shlex
from typing import List, Optional

class PandocCommandBuilder:
    def __init__(self, input_path: str, output_path: str):
        self.input_path = input_path
        self.output_path = output_path
        self.cmd: List[str] = ["pandoc", input_path, "-o", output_path]

    def add_engine(self, engine: str) -> "PandocCommandBuilder":
        if engine in ["xelatex", "pdflatex", "lualatex", "typst", "weasyprint"]:
            self.cmd.extend([f"--pdf-engine={engine}"])
        return self

    def add_reference_doc(self, ref_path: Optional[str]) -> "PandocCommandBuilder":
        if ref_path:
            self.cmd.extend([f"--reference-doc={ref_path}"])
        return self

    def add_lua_filter(self, filter_path: Optional[str]) -> "PandocCommandBuilder":
        if filter_path:
            self.cmd.extend([f"--lua-filter={filter_path}"])
        return self

    def enable_smart_typography(self) -> "PandocCommandBuilder":
        self.cmd.append("--smart")
        return self

    def execute(self) -> dict:
        try:
            # Komut enjeksiyonunu önlemek için liste formatında güvenli çalıştırma
            result = subprocess.run(
                self.cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=120 # 2 dakika sınırı
            )
            return {"status": "success", "stdout": result.stdout}
        except subprocess.CalledProcessError as e:
            return {"status": "error", "stderr": e.stderr, "cmd": " ".join(self.cmd)}
        except subprocess.TimeoutExpired:
            return {"status": "error", "stderr": "Process timeout expired."}

```

### 3.2. Supabase Veritabanı Şeması (`supabase/migrations/init_schema.sql`)

Dönüşüm durumlarını ve asenkron işlem kuyruğunu yönetecek temel SQL şeması:

```sql
-- Uzun süren işlemler için durum enum tipi
CREATE TYPE conversion_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Projeler Tablosu
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Dokümanlar ve Varlıklar Tablosu (Storage referansları için)
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase Storage Bucket Yolu
    file_type TEXT NOT NULL,     -- 'source', 'reference', 'bibliography', 'output'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Dönüşüm Günlükleri ve Tetikleyiciler Tablosu
CREATE TABLE public.conversion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    status conversion_status DEFAULT 'pending'::conversion_status NOT NULL,
    command_executed TEXT,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

```

```

```