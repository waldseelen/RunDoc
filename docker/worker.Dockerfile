# =============================================
# Pandoc Orchestrator — Worker Docker Image
# Pandoc + TeX Live + Typst + WeasyPrint
# =============================================

FROM python:3.11-slim AS base

# Metadata
LABEL maintainer="Pandoc Orchestrator Team"
LABEL description="Pandoc dönüşüm motoru worker servisi"

# Sistem bağımlılıkları
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    texlive-xetex \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-extra \
    texlive-latex-recommended \
    texlive-lang-european \
    texlive-luatex \
    lmodern \
    fonts-dejavu \
    weasyprint \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Typst kurulumu
RUN curl -fsSL https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.xz \
    | tar xJ --strip-components=1 -C /usr/local/bin/

# Güvenlik: non-root kullanıcı
RUN useradd --create-home --shell /bin/bash worker
WORKDIR /home/worker/app

# Python bağımlılıkları
COPY apps/worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Uygulama dosyaları
COPY apps/worker/app ./app

# Geçici çalışma dizini
RUN mkdir -p /tmp/pandoc-workdir && chown worker:worker /tmp/pandoc-workdir

# Non-root kullanıcıya geç
USER worker

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
