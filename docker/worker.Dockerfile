# =============================================
# Pandoc Orchestrator — Worker Container
# TeX Live + Python FastAPI Worker
# =============================================

FROM python:3.11-slim-bullseye

# Environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Core utilities
    wget curl git ca-certificates \
    # Build essentials
    build-essential cmake \
    # TeX Live (full distribution for PDF rendering)
    texlive-full \
    # Fonts
    fonts-liberation fonts-dejavu fonts-noto \
    # Image processing
    ghostscript imagemagick \
    # Additional tools
    locales \
    && rm -rf /var/lib/apt/lists/* \
    && echo "en_US.UTF-8 UTF-8" > /etc/locale.gen \
    && locale-gen

ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Install Pandoc (latest)
RUN wget https://github.com/jgm/pandoc/releases/download/3.1.9/pandoc-3.1.9-1-amd64.deb && \
    dpkg -i pandoc-3.1.9-1-amd64.deb && \
    rm pandoc-3.1.9-1-amd64.deb

# Copy requirements
COPY apps/worker/requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY apps/worker /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Start application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
