FROM python:3.11-slim-bullseye

# Environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

WORKDIR /app

# 1. Install system utilities, fonts, and dependencies
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
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# 8. Copy application code
COPY . /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

# Start FastAPI application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
