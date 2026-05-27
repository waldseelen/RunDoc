"""
RunDoc — FastAPI Worker
Anonim doküman dönüştürme API'si.
Kullanıcılar dosya yükler, dönüştürür ve indirir. Hesap/giriş gerektirmez.
"""

import os
import re
import uuid
import shutil
import logging
from enum import Enum
from typing import Optional, List, Dict, Any
from pathlib import Path
import asyncio

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from app.config import settings
from app.core.pandoc_cmd import PandocCommandBuilder
from app.core.engines import EngineRouter
from app.core.parser import DocumentParser

# =============================================
# LOGGING & TRACING
# =============================================

import json
import time
from contextvars import ContextVar

request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }
        req_id = request_id_ctx.get()
        if req_id:
            log_data["request_id"] = req_id
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data, ensure_ascii=False)

# Configure structured JSON logging
json_handler = logging.StreamHandler()
json_handler.setFormatter(JsonFormatter("%(asctime)s"))

root_logger = logging.getLogger()
for h in root_logger.handlers[:]:
    root_logger.removeHandler(h)
root_logger.addHandler(json_handler)
root_logger.setLevel(logging.INFO)

logger = logging.getLogger(__name__)

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
    from slowapi import _rate_limit_exceeded_handler
except ImportError:  # pragma: no cover - optional dependency in some local setups
    Limiter = None
    get_remote_address = None
    RateLimitExceeded = None
    SlowAPIMiddleware = None
    _rate_limit_exceeded_handler = None


class OutputFormat(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    ODT = "odt"
    HTML = "html"
    HTML5 = "html5"
    EPUB = "epub"
    EPUB3 = "epub3"
    LATEX = "latex"
    PPTX = "pptx"
    REVEALJS = "revealjs"
    BEAMER = "beamer"
    MARKDOWN = "markdown"
    GFM = "gfm"
    RST = "rst"
    JSON = "json"
    PLAIN = "plain"
    RTF = "rtf"
    TYPST = "typst"


OUTPUT_EXT_MAP = {
    "pdf": ".pdf", "docx": ".docx", "odt": ".odt", "html": ".html",
    "html5": ".html", "epub": ".epub", "epub3": ".epub", "latex": ".tex",
    "pptx": ".pptx", "revealjs": ".html", "beamer": ".pdf",
    "markdown": ".md", "gfm": ".md", "rst": ".rst", "json": ".json",
    "plain": ".txt", "rtf": ".rtf", "typst": ".typ",
}

VALID_MATH_RENDERING = {"mathjax", "katex", "mathml", "gladtex", "webtex"}
_SAFE_KEY_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_.-]{0,63}$")


# =============================================
# FASTAPI APP
# =============================================

app = FastAPI(
    title="RunDoc Worker",
    description="Anonim doküman dönüştürme servisi — dosya yükle, dönüştür, indir.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Rate limiting (slowapi varsa aktif)
limiter = Limiter(key_func=get_remote_address) if Limiter and get_remote_address else None
if limiter and SlowAPIMiddleware and RateLimitExceeded and _rate_limit_exceeded_handler:
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def rate_limit(limit: str):
    if limiter is None:
        def passthrough(func):
            return func
        return passthrough
    return limiter.limit(limit)


# CORS — Next.js frontend'den gelen istekler için
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Request-ID"],
)

# Tracing & Audit Middleware
@app.middleware("http")
async def audit_and_tracing_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    token = request_id_ctx.set(req_id)
    start_time = time.time()
    try:
        response = await call_next(request)
        duration_ms = int((time.time() - start_time) * 1000)
        audit_data = {
            "event": "request_completed",
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": request.client.host if request.client else "unknown"
        }
        logger.info(f"Audit log: {json.dumps(audit_data)}")
        response.headers["X-Request-ID"] = req_id
        return response
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        audit_data = {
            "event": "request_failed",
            "method": request.method,
            "path": request.url.path,
            "error": str(e),
            "duration_ms": duration_ms,
            "client_ip": request.client.host if request.client else "unknown"
        }
        logger.error(f"Audit log error: {json.dumps(audit_data)}")
        raise
    finally:
        request_id_ctx.reset(token)

api_router = APIRouter()

def verify_free_disk_space(required_mb: int = 100):
    """Verifies that the system has at least the required amount of free space in MB."""
    total, used, free = shutil.disk_usage(settings.worker_temp_dir)
    free_mb = free / (1024 * 1024)
    if free_mb < required_mb:
        raise HTTPException(
            status_code=507, 
            detail=f"Sistemde yeterli disk alanı yok. Gereken: {required_mb}MB, Mevcut: {free_mb:.1f}MB"
        )

class CORSStaticFiles(StaticFiles):
    """Custom StaticFiles subclass to add CORS headers to served files."""
    async def get_response(self, path: str, scope) -> Any:
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

# Mount Local Converted Outputs Static Folder with CORS headers enabled
os.makedirs(settings.worker_temp_dir, exist_ok=True)
app.mount("/outputs", CORSStaticFiles(directory=settings.worker_temp_dir), name="outputs")




# =============================================
# PYDANTIC MODELS
# =============================================


class ConversionStatus(BaseModel):
    """Dönüşüm durum modeli."""
    job_id: str
    status: str  # pending, processing, completed, failed
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    engine_used: Optional[str] = None
    execution_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    output_url: Optional[str] = None
    command_executed: Optional[str] = None


class AnalysisResponse(BaseModel):
    """Doküman analiz yanıtı."""
    format_detected: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    content_analysis: dict = Field(default_factory=dict)
    suggested_options: dict = Field(default_factory=dict)



# =============================================
# API ROTLARI
# =============================================

MOCK_LOGS: Dict[str, Any] = {}

@api_router.get("/health")
async def health_check():
    """Sağlık kontrolü — worker ve pandoc durumunu doğrular."""
    pandoc_available = shutil.which("pandoc") is not None

    overall_status = "healthy" if pandoc_available else "degraded"

    return {
        "status": overall_status,
        "pandoc_available": pandoc_available,
        "version": "1.0.0"
    }


@api_router.get("/engines")
async def list_engines():
    """Kullanılabilir dönüşüm motorlarını listeler."""
    return EngineRouter.get_all_engines_status()


@api_router.get("/formats")
async def list_formats():
    """Desteklenen girdi ve çıktı formatlarını listeler."""
    return {
        "input_formats": sorted(PandocCommandBuilder.VALID_INPUT_FORMATS),
        "output_formats": sorted(PandocCommandBuilder.VALID_OUTPUT_FORMATS)
    }





@api_router.post("/convert-direct", response_model=ConversionStatus)
@rate_limit("10/minute")
async def convert_direct(
    request: Request,
    text: Optional[str] = Form(default=None),
    file: Optional[UploadFile] = File(default=None),
    output_format: OutputFormat = Form(default=OutputFormat.PDF),
    engine: Optional[str] = Form(default=None),
    citeproc: bool = Form(default=False),
    toc: bool = Form(default=False),
    toc_depth: int = Form(default=3),
    smart: bool = Form(default=True),
    number_sections: bool = Form(default=False),
    standalone: bool = Form(default=True),
    highlight_style: str = Form(default="pygments"),
    math_rendering: str = Form(default="mathjax"),
    extract_media: bool = Form(default=False),
):
    """
    Doğrudan dosya veya ham metin dönüştürme gerçekleştirir.
    Sonuçlar FastAPI statik dosya sunucusu üzerinden anında indirilebilir ve önizlenebilir.
    """
    _ = request

    # Disk alanını kontrol et
    verify_free_disk_space()

    if not (1 <= toc_depth <= 6):
        raise HTTPException(status_code=422, detail="toc_depth değeri 1-6 arasında olmalıdır")

    math_rendering = math_rendering.lower().strip()
    if math_rendering not in VALID_MATH_RENDERING:
        raise HTTPException(status_code=422, detail=f"Geçersiz math_rendering değeri: {math_rendering}")

    job_id = str(uuid.uuid4())
    workdir = os.path.join(settings.worker_temp_dir, job_id)
    os.makedirs(workdir, exist_ok=True)

    output_format_value = output_format.value if isinstance(output_format, OutputFormat) else str(output_format)

    try:
        input_filename = "document.md"
        input_local = os.path.join(workdir, input_filename)

        # Girdi tipini belirle ve diske yaz
        if file:
            input_filename = os.path.basename(file.filename or "input")
            input_local = os.path.join(workdir, input_filename)
            content = await file.read()

            max_bytes = settings.max_file_size_mb * 1024 * 1024
            if len(content) > max_bytes:
                raise HTTPException(
                    status_code=413,
                    detail=f"Dosya boyutu sınırı aşıldı. Maksimum: {settings.max_file_size_mb}MB"
                )

            with open(input_local, "wb") as f:
                f.write(content)
        elif text is not None:
            if len(text.encode("utf-8")) > settings.max_file_size_mb * 1024 * 1024:
                raise HTTPException(
                    status_code=413,
                    detail=f"Metin boyutu sınırı aşıldı. Maksimum: {settings.max_file_size_mb}MB"
                )
            with open(input_local, "w", encoding="utf-8") as f:
                f.write(text)
        else:
            raise HTTPException(status_code=400, detail="Dönüşüm için metin (text) veya dosya (file) sağlanmalıdır.")

        # Format algıla
        input_format = DocumentParser.detect_format(input_local) or "markdown"

        output_ext = OUTPUT_EXT_MAP.get(output_format_value, ".out")
        output_filename = f"compiled_output{output_ext}"
        output_local = os.path.join(workdir, output_filename)

        # PDF veya slayt motor tercihlerini belirle
        engine_to_use = None
        if output_format_value == "pdf":
            engine_to_use = EngineRouter.select_pdf_engine(engine)
            if engine_to_use is None:
                logger.warning("PDF motoru bulunamadı, convert-direct isteği HTML'e düşürüldü")
                output_format_value = "html"
                output_ext = OUTPUT_EXT_MAP.get(output_format_value, ".out")
                output_filename = f"compiled_output{output_ext}"
                output_local = os.path.join(workdir, output_filename)
        elif output_format_value in ("revealjs", "beamer", "slidy", "pptx"):
            engine_to_use = EngineRouter.select_slide_engine(engine)

        # Komut inşası
        builder = PandocCommandBuilder(input_local, output_local)
        builder.set_input_format(input_format)

        if output_format_value != "pdf":
            builder.set_output_format(output_format_value)
        if engine_to_use:
            builder.add_engine(engine_to_use)
        if standalone:
            builder.set_standalone()
        if smart:
            builder.enable_smart_typography()
        if toc:
            builder.add_toc(toc_depth)
        if number_sections:
            builder.set_number_sections()
        if citeproc:
            builder.enable_citeproc()
        if highlight_style:
            builder.set_highlight_style(highlight_style)
        if math_rendering:
            builder.set_math_rendering(math_rendering)
        if extract_media:
            media_dir = os.path.join(workdir, "extracted_media")
            builder.extract_media(media_dir)

        # Asenkron (asyncio.to_thread) derleme ile event loop bloklanmasını engelle
        result = await asyncio.to_thread(builder.execute)

        if result["status"] == "success" and os.path.exists(output_local):
            output_url = f"{settings.worker_api_url}/outputs/{job_id}/{output_filename}"

            # Log loglarını yerel cache'e kaydet (durum sorguları için)
            MOCK_LOGS[job_id] = {
                "input_format": input_format,
                "output_format": output_format_value,
                "engine_used": engine_to_use,
                "status": "completed",
                "execution_time_ms": result["execution_time_ms"],
                "output_url": output_url,
                "command_executed": result.get("cmd")
            }

            return ConversionStatus(
                job_id=job_id,
                status="completed",
                input_format=input_format,
                output_format=output_format_value,
                engine_used=engine_to_use,
                execution_time_ms=result["execution_time_ms"],
                output_url=output_url,
                command_executed=result.get("cmd")
            )

        return ConversionStatus(
            job_id=job_id,
            status="failed",
            input_format=input_format,
            output_format=output_format_value,
            engine_used=engine_to_use,
            error_message=result.get("stderr", "Bilinmeyen derleme hatası."),
            command_executed=result.get("cmd")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Doğrudan dönüşüm hatası: {str(e)}")
        return ConversionStatus(
            job_id=job_id,
            status="failed",
            error_message=str(e)
        )


@api_router.post("/analyze")
@rate_limit("10/minute")
async def analyze_document(
    request: Request,
    file: UploadFile = File(...),
    target_format: OutputFormat = Form(default=OutputFormat.PDF),
):
    """
    Yüklenen dokümanı analiz eder ve önerilen dönüşüm seçeneklerini döndürür.
    Dosya kalıcı olarak saklanmaz, sadece analiz için geçici olarak işlenir.
    """
    _ = request

    # Geçici dosya oluştur
    workdir = os.path.join(settings.worker_temp_dir, f"analyze_{uuid.uuid4().hex[:8]}")
    os.makedirs(workdir, exist_ok=True)

    try:
        local_path = os.path.join(workdir, os.path.basename(file.filename or "input"))

        with open(local_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Format algıla
        detected_format = DocumentParser.detect_format(local_path)

        # Metadata çıkar
        metadata = {}
        if detected_format in ("markdown", "latex", "rst"):
            metadata = DocumentParser.extract_yaml_metadata(local_path)

        # İçerik analizi
        content_analysis = {}
        if detected_format in ("markdown", "latex", "rst", "html", "org"):
            content_analysis = DocumentParser.analyze_content(local_path)

        # Önerilen seçenekler
        target_format_value = target_format.value if isinstance(target_format, OutputFormat) else str(target_format)
        suggested = DocumentParser.suggest_conversion_options(content_analysis, target_format_value)

        return AnalysisResponse(
            format_detected=detected_format,
            metadata=metadata,
            content_analysis=content_analysis,
            suggested_options=suggested
        )

    finally:
        shutil.rmtree(workdir, ignore_errors=True)

# Register API Router
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router)


# =============================================
# BACKGROUND CLEANER — Otomatik Geçici Dosya Temizleyici
# 30 dakikadan eski tüm dönüşüm klasörlerini siler.
# Kullanıcı gizliliğini korur ve disk dolmasını engeller.
# =============================================

CLEANUP_INTERVAL_SECONDS = 600   # Her 10 dakikada bir kontrol
CLEANUP_MAX_AGE_SECONDS = 1800   # 30 dakikadan eski dosyaları sil


async def _cleanup_old_workdirs():
    """Arka plan görevi: temp_workdir içindeki eski dönüşüm klasörlerini temizler."""
    while True:
        try:
            await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
            workdir = Path(settings.worker_temp_dir)
            if not workdir.exists():
                continue

            now = time.time()
            cleaned = 0
            for entry in workdir.iterdir():
                if not entry.is_dir():
                    continue
                try:
                    age = now - entry.stat().st_mtime
                    if age > CLEANUP_MAX_AGE_SECONDS:
                        shutil.rmtree(entry, ignore_errors=True)
                        cleaned += 1
                except OSError:
                    pass

            if cleaned > 0:
                logger.info(f"Otomatik temizlik: {cleaned} eski dönüşüm klasörü silindi.")
        except Exception as e:
            logger.error(f"Temizlik görevi hatası: {e}")


@app.on_event("startup")
async def start_background_cleaner():
    """Sunucu başlatıldığında arka plan temizleyiciyi çalıştırır."""
    asyncio.create_task(_cleanup_old_workdirs())
    logger.info("Arka plan dosya temizleyici başlatıldı (aralık: %ds, max yaş: %ds)",
                CLEANUP_INTERVAL_SECONDS, CLEANUP_MAX_AGE_SECONDS)
