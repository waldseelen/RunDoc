# Stage 1: Builder for binaries
FROM python:3.11-slim-bullseye AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl ca-certificates tar xz-utils

# Install Pandoc
RUN wget https://github.com/jgm/pandoc/releases/download/3.1.9/pandoc-3.1.9-1-amd64.deb && \
    dpkg -i pandoc-3.1.9-1-amd64.deb || true

# Install Typst
RUN curl -L https://github.com/typst/typst/releases/download/v0.11.0/typst-x86_64-unknown-linux-musl.tar.xz | tar -xJ && \
    mv typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst

# Stage 2: Final runtime
FROM python:3.11-slim-bullseye

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

WORKDIR /app

# Install system dependencies including texlive-full
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-full \
    fonts-liberation \
    fonts-dejavu \
    fonts-noto \
    locales \
    ghostscript \
    imagemagick \
    nodejs \
    npm \
    chromium \
    chromium-driver \
    curl \
    && echo "en_US.UTF-8 UTF-8" > /etc/locale.gen \
    && locale-gen \
    && rm -rf /var/lib/apt/lists/*

RUN sed -i 's/domain="coder" rights="none" pattern="PDF"/domain="coder" rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml || true

# Copy binaries from builder
COPY --from=builder /usr/bin/pandoc /usr/bin/pandoc
COPY --from=builder /usr/local/bin/typst /usr/local/bin/typst

RUN npm install -g pagedjs-cli --unsafe-perm

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
