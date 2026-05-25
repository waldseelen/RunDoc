"""
Pandoc Orchestrator — FastAPI Worker
Ana giriş noktası ve API rotaları.
"""

import os
import re
import uuid
import shutil
import logging
from enum import Enum
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, Depends, Header, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from app.config import settings
from app.core.pandoc_cmd import PandocCommandBuilder
from app.core.engines import EngineRouter
from app.core.parser import DocumentParser
from app.services.firebase_service import FirebaseService

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
    title="Pandoc Orchestrator Worker",
    description="Pandoc dönüşüm motorunu yöneten worker servisi",
    version="0.1.0",
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
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
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

# Mount Local Converted Outputs Static Folder for Zero-Config Preview & Downloads
os.makedirs(settings.worker_temp_dir, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=settings.worker_temp_dir), name="outputs")

# Supabase servisi (artık Firebase servisi)
firebase_service = FirebaseService(
    service_account_path=settings.firebase_service_account_path,
    storage_bucket=settings.firebase_storage_bucket
)


def _extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    return token or None


async def verify_access_token(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    """API endpointleri için JWT/API token doğrulaması."""
    if not settings.worker_require_auth:
        return {"uid": "anonymous", "provider": "disabled"}

    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Authorization Bearer token gerekli")

    if settings.worker_api_token and token == settings.worker_api_token:
        return {"uid": "worker-api-token", "provider": "shared-secret"}

    # Sandbox Modu Kontrolü: Firebase service account yoksa, herhangi bir tokenı Sandbox kullanıcısı olarak kabul et
    has_firebase_creds = settings.firebase_service_account_path and os.path.exists(settings.firebase_service_account_path)

    try:
        import firebase_admin
        from firebase_admin import auth as firebase_auth

        firebase_service._initialize()
        if not firebase_admin._apps or not has_firebase_creds:
            logger.warning("Firebase service account eksik veya başlatılamadı. İstek Sandbox Modu kapsamında otomatik kabul edildi.")
            return {"uid": "sandbox-user", "provider": "sandbox"}

        decoded = firebase_auth.verify_id_token(token)
        uid = decoded.get("uid")
        if not uid:
            raise HTTPException(status_code=401, detail="Geçersiz token")

        return {"uid": uid, "provider": "firebase", "claims": decoded}
    except HTTPException:
        raise
    except Exception as e:
        # Token doğrulaması başarısız olsa bile, Firebase service account bulunmuyorsa Sandbox Modunda devam et
        if not has_firebase_creds:
            logger.warning(f"Token doğrulaması başarısız oldu fakat Sandbox Modu kapsamında bypass ediliyor. Hata: {e}")
            return {"uid": "sandbox-user", "provider": "sandbox"}
        raise HTTPException(status_code=401, detail="Token doğrulaması başarısız")


# =============================================
# PYDANTIC MODELS
# =============================================

class ConversionRequest(BaseModel):
    """Dönüşüm isteği modeli."""
    project_id: str = Field(min_length=1, max_length=128)
    user_id: str = Field(min_length=1, max_length=128)
    input_document_id: str = Field(min_length=1, max_length=128)
    input_format: Optional[str] = Field(default=None, max_length=64)  # None ise otomatik algılanır
    output_format: OutputFormat = OutputFormat.PDF
    engine: Optional[str] = Field(default=None, max_length=64)  # None ise otomatik seçilir

    # Opsiyonel parametreler
    citeproc: bool = False
    bibliography_id: Optional[str] = Field(default=None, max_length=128)
    csl_style: Optional[str] = Field(default=None, max_length=128)  # "apa", "mla", "harvard", "ieee" veya özel dosya ID
    reference_doc_id: Optional[str] = Field(default=None, max_length=128)
    template_id: Optional[str] = Field(default=None, max_length=128)

    # Filtreler
    lua_filter_ids: List[str] = Field(default_factory=list, max_length=10)
    python_filter_ids: List[str] = Field(default_factory=list, max_length=10)

    # Seçenekler
    toc: bool = False
    toc_depth: int = Field(default=3, ge=1, le=6)
    smart: bool = True
    number_sections: bool = False
    standalone: bool = True
    highlight_style: str = Field(default="pygments", max_length=64)
    math_rendering: str = Field(default="mathjax", max_length=16)  # mathjax, katex, mathml

    # Medya ayıklama
    extract_media: bool = False

    # Ekstra değişkenler
    variables: Dict[str, str] = Field(default_factory=dict)
    metadata: Dict[str, str] = Field(default_factory=dict)

    # Birleştirme için ek dosyalar
    additional_input_ids: List[str] = Field(default_factory=list, max_length=20)

    @field_validator("lua_filter_ids", "python_filter_ids", "additional_input_ids")
    @classmethod
    def validate_id_list(cls, value: List[str]) -> List[str]:
        if len(value) != len(set(value)):
            raise ValueError("Tekrarlanan ID değerleri gönderilemez")
        for item in value:
            if len(item) > 128:
                raise ValueError("ID değerleri 128 karakterden kısa olmalı")
        return value

    @field_validator("math_rendering")
    @classmethod
    def validate_math_rendering(cls, value: str) -> str:
        normalized = value.lower().strip()
        if normalized not in VALID_MATH_RENDERING:
            raise ValueError(f"Geçersiz math_rendering değeri: {value}")
        return normalized

    @field_validator("variables", "metadata")
    @classmethod
    def validate_key_value_maps(cls, value: Dict[str, str]) -> Dict[str, str]:
        if len(value) > 50:
            raise ValueError("En fazla 50 anahtar-değer çifti gönderilebilir")

        sanitized: Dict[str, str] = {}
        for key, raw in value.items():
            key = str(key).strip()
            if not _SAFE_KEY_PATTERN.match(key):
                raise ValueError(f"Geçersiz anahtar adı: {key}")

            value_str = str(raw)
            if len(value_str) > 1000:
                raise ValueError(f"'{key}' değeri 1000 karakteri geçemez")

            sanitized[key] = value_str

        return sanitized


class ConversionResponse(BaseModel):
    """Dönüşüm yanıt modeli."""
    job_id: str
    status: str
    message: str


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
# BACKGROUND TASK: Dönüşüm İşlemi
# =============================================

def run_conversion(request: ConversionRequest, job_id: str, workdir: str):
    """
    Arka planda çalışan dönüşüm işlemi.
    İş akışı: İndir → Analiz → Komut Oluştur → Çalıştır → Yükle → Güncelle
    """
    try:
        # 1. Durumu "processing" olarak güncelle
        firebase_service.update_conversion_status(job_id, "processing")

        # 2. Girdi dosyasını indir
        input_doc = firebase_service.get_project_documents(request.project_id)
        input_doc_info = next(
            (d for d in input_doc if d["id"] == request.input_document_id), None
        )

        if not input_doc_info:
            raise ValueError(f"Girdi dokümanı bulunamadı: {request.input_document_id}")

        input_filename = input_doc_info["file_name"]
        input_local = os.path.join(workdir, input_filename)

        bucket = input_doc_info.get("file_type", "source")
        storage_path = input_doc_info["storage_path"]

        firebase_service.download_file(bucket, storage_path, input_local)

        # 3. Format algılama
        input_format = request.input_format or DocumentParser.detect_format(input_local)
        if not input_format:
            raise ValueError(f"Girdi formatı algılanamadı: {input_filename}")

        # 4. Çıktı dosya adını belirle
        output_format = request.output_format.value if isinstance(request.output_format, OutputFormat) else str(request.output_format)
        output_ext = OUTPUT_EXT_MAP.get(output_format, ".out")
        output_filename = f"{Path(input_filename).stem}_output{output_ext}"
        output_local = os.path.join(workdir, output_filename)

        # 5. Motor seçimi
        engine = None
        if output_format == "pdf":
            engine = EngineRouter.select_pdf_engine(request.engine)
            if engine is None:
                logger.warning("PDF motoru bulunamadı, HTML fallback uygulanıyor")
                output_format = "html"
                output_ext = OUTPUT_EXT_MAP.get(output_format, ".out")
                output_filename = f"{Path(input_filename).stem}_output{output_ext}"
                output_local = os.path.join(workdir, output_filename)
        elif output_format in ("revealjs", "beamer", "slidy", "pptx"):
            engine = EngineRouter.select_slide_engine(request.engine)

        # 6. Pandoc komutunu oluştur
        builder = PandocCommandBuilder(input_local, output_local)

        if input_format:
            builder.set_input_format(input_format)

        if output_format != "pdf":
            builder.set_output_format(output_format)

        if engine:
            builder.add_engine(engine)

        if request.standalone:
            builder.set_standalone()

        if request.smart:
            builder.enable_smart_typography()

        if request.toc:
            builder.add_toc(request.toc_depth)

        if request.number_sections:
            builder.set_number_sections()

        if request.citeproc:
            builder.enable_citeproc()

        if request.highlight_style:
            builder.set_highlight_style(request.highlight_style)

        if request.math_rendering:
            builder.set_math_rendering(request.math_rendering)

        if request.variables:
            builder.set_variables(request.variables)

        for key, value in request.metadata.items():
            builder.set_metadata(key, value)

        # Kaynakça dosyası indir ve ekle
        if request.bibliography_id:
            bib_docs = firebase_service.get_project_documents(
                request.project_id, "bibliography"
            )
            bib_doc = next((d for d in bib_docs if d["id"] == request.bibliography_id), None)
            if bib_doc:
                bib_local = os.path.join(workdir, bib_doc["file_name"])
                firebase_service.download_file("bibliography", bib_doc["storage_path"], bib_local)
                builder.add_bibliography(bib_local)

        # CSL stili
        builtin_csl = {
            "apa": "apa.csl", "mla": "modern-language-association.csl",
            "harvard": "harvard-cite-them-right.csl", "ieee": "ieee.csl",
            "chicago": "chicago-author-date.csl"
        }
        if request.csl_style:
            if request.csl_style in builtin_csl:
                builder.add_csl_style(builtin_csl[request.csl_style])
            else:
                # Özel CSL dosyası
                csl_local = os.path.join(workdir, f"{request.csl_style}.csl")
                firebase_service.download_file("bibliography", request.csl_style, csl_local)
                builder.add_csl_style(csl_local)

        # Referans doküman
        if request.reference_doc_id:
            ref_docs = firebase_service.get_project_documents(
                request.project_id, "reference"
            )
            ref_doc = next((d for d in ref_docs if d["id"] == request.reference_doc_id), None)
            if ref_doc:
                ref_local = os.path.join(workdir, ref_doc["file_name"])
                firebase_service.download_file("reference", ref_doc["storage_path"], ref_local)
                builder.add_reference_doc(ref_local)

        # Lua filtreleri
        filters_applied = []
        for filter_id in request.lua_filter_ids:
            filter_docs = firebase_service.get_project_documents(
                request.project_id, "filter"
            )
            filter_doc = next((d for d in filter_docs if d["id"] == filter_id), None)
            if filter_doc:
                filter_local = os.path.join(workdir, filter_doc["file_name"])
                firebase_service.download_file("filters", filter_doc["storage_path"], filter_local)
                builder.add_lua_filter(filter_local)
                filters_applied.append(filter_doc["file_name"])

        # Python filtreleri
        for filter_id in request.python_filter_ids:
            filter_docs = firebase_service.get_project_documents(
                request.project_id, "filter"
            )
            filter_doc = next((d for d in filter_docs if d["id"] == filter_id), None)
            if filter_doc:
                filter_local = os.path.join(workdir, filter_doc["file_name"])
                firebase_service.download_file("filters", filter_doc["storage_path"], filter_local)
                builder.add_python_filter(filter_local)
                filters_applied.append(filter_doc["file_name"])

        # Medya ayıklama
        if request.extract_media:
            media_dir = os.path.join(workdir, "extracted_media")
            builder.extract_media(media_dir)

        # Ek girdi dosyaları (birleştirme)
        for additional_id in request.additional_input_ids:
            add_docs = firebase_service.get_project_documents(request.project_id)
            add_doc = next((d for d in add_docs if d["id"] == additional_id), None)
            if add_doc:
                add_local = os.path.join(workdir, f"add_{add_doc['file_name']}")
                firebase_service.download_file(
                    add_doc.get("file_type", "source"), add_doc["storage_path"], add_local
                )
                builder.add_extra_input(add_local)

        # 7. Komutu çalıştır
        result = builder.execute()

        # 8. Sonuçları işle
        if result["status"] == "success" and os.path.exists(output_local):
            # Çıktıyı Storage'a yükle
            output_storage_path = f"{request.project_id}/{job_id}/{output_filename}"
            firebase_service.upload_file("output", output_storage_path, output_local)

            # Doküman kaydı
            output_doc_id = firebase_service.register_document(
                project_id=request.project_id,
                file_name=output_filename,
                storage_path=output_storage_path,
                file_type="output",
                file_size_bytes=os.path.getsize(output_local)
            )

            # Başarılı durum güncelle
            firebase_service.update_conversion_status(
                log_id=job_id,
                status="completed",
                command_executed=result.get("cmd"),
                execution_time_ms=result.get("execution_time_ms"),
                output_document_id=output_doc_id,
                filters_applied=filters_applied if filters_applied else None
            )

            logger.info(f"Dönüşüm tamamlandı: {job_id}")

        else:
            firebase_service.update_conversion_status(
                log_id=job_id,
                status="failed",
                command_executed=result.get("cmd"),
                error_message=result.get("stderr", "Bilinmeyen hata"),
                execution_time_ms=result.get("execution_time_ms"),
                filters_applied=filters_applied if filters_applied else None
            )
            logger.error(f"Dönüşüm başarısız: {job_id} — {result.get('stderr')}")

    except Exception as e:
        logger.error(f"Dönüşüm hatası: {job_id} — {str(e)}")
        firebase_service.update_conversion_status(
            log_id=job_id,
            status="failed",
            error_message=str(e)
        )

    finally:
        # Geçici dizini temizle
        if os.path.exists(workdir):
            shutil.rmtree(workdir, ignore_errors=True)


# =============================================
# API ROTLARI
# =============================================

@api_router.get("/health")
async def health_check():
    """Sağlık kontrolü — worker, pandoc ve Firebase durumunu doğrular."""
    pandoc_available = shutil.which("pandoc") is not None
    firebase_available = firebase_service.check_connectivity()

    overall_status = "healthy" if pandoc_available and firebase_available else "degraded"

    return {
        "status": overall_status,
        "pandoc_available": pandoc_available,
        "firebase_available": firebase_available,
        "auth_required": settings.worker_require_auth,
        "version": "0.1.0"
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


@api_router.post("/convert", response_model=ConversionResponse)
@rate_limit("5/minute")
async def start_conversion(
    request: Request,
    payload: ConversionRequest,
    background_tasks: BackgroundTasks,
    auth_ctx: Dict[str, Any] = Depends(verify_access_token)
):
    """
    Yeni bir dönüşüm işlemi başlatır.
    İşlem arka planda asenkron olarak çalışır.
    """
    _ = request

    # Disk alanını kontrol et
    verify_free_disk_space()

    # Firebase token kullanılıyorsa istek user_id ile token uid eşleşmesini doğrula
    if auth_ctx.get("provider") == "firebase" and payload.user_id != auth_ctx.get("uid"):
        raise HTTPException(status_code=403, detail="user_id ile token UID eşleşmiyor")

    # Conversion log oluştur
    job_id = firebase_service.create_conversion_log(
        project_id=payload.project_id,
        user_id=payload.user_id,
        input_format=payload.input_format or "auto",
        output_format=payload.output_format.value if isinstance(payload.output_format, OutputFormat) else str(payload.output_format),
        engine=payload.engine
    )

    if not job_id:
        raise HTTPException(status_code=500, detail="Dönüşüm log kaydı oluşturulamadı")

    # Geçici çalışma dizini oluştur
    workdir = os.path.join(settings.worker_temp_dir, str(job_id))
    os.makedirs(workdir, exist_ok=True)

    # Arka plan görevi olarak başlat
    background_tasks.add_task(run_conversion, payload, job_id, workdir)

    return ConversionResponse(
        job_id=job_id,
        status="pending",
        message="Dönüşüm işlemi başlatıldı. Durumu /status/{job_id} ile takip edebilirsiniz."
    )


@api_router.get("/status/{job_id}", response_model=ConversionStatus)
@rate_limit("20/minute")
async def get_conversion_status(
    http_request: Request,
    job_id: str,
    auth_ctx: Dict[str, Any] = Depends(verify_access_token)
):
    """Dönüşüm işleminin durumunu sorgular. Bulut URL'si yoksa otomatik yerel statik sunumu hedefler."""
    _ = http_request
    log = firebase_service.get_conversion_log(job_id)

    if not log:
        raise HTTPException(status_code=404, detail="Dönüşüm kaydı bulunamadı")

    if auth_ctx.get("provider") == "firebase" and log.get("user_id") != auth_ctx.get("uid"):
        raise HTTPException(status_code=403, detail="Bu dönüşüm kaydına erişim izniniz yok")

    # Çıktı URL'si (tamamlandıysa)
    output_url = log.get("output_url")
    if log.get("status") == "completed" and not output_url:
        if log.get("output_document_id"):
            docs = firebase_service.get_project_documents(log["project_id"], "output")
            output_doc = next((d for d in docs if d["id"] == log["output_document_id"]), None)
            if output_doc:
                output_url = firebase_service.create_signed_url(output_doc["storage_path"])

        # Yerel Sandbox Fallback: Eğer Firebase URL yoksa diskte dosyayı ara ve sun
        if not output_url:
            workdir = os.path.join(settings.worker_temp_dir, str(job_id))
            if os.path.exists(workdir):
                files = [f for f in os.listdir(workdir) if f.startswith("compiled_output") or "_output" in f]
                if files:
                    output_url = f"{settings.worker_api_url}/outputs/{job_id}/{files[0]}"

    return ConversionStatus(
        job_id=job_id,
        status=log["status"],
        input_format=log.get("input_format"),
        output_format=log.get("output_format"),
        engine_used=log.get("engine_used"),
        execution_time_ms=log.get("execution_time_ms"),
        error_message=log.get("error_message"),
        output_url=output_url,
        command_executed=log.get("command_executed")
    )


@api_router.post("/convert-direct", response_model=ConversionStatus)
@rate_limit("10/minute")
async def convert_direct(
    http_request: Request,
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
    auth_ctx: Dict[str, Any] = Depends(verify_access_token)
):
    """
    Firebase/Firestore bağımlılığı olmadan doğrudan dosya veya ham metin dönüştürme gerçekleştirir.
    Sonuçlar FastAPI statik dosya sunucusu üzerinden anında indirilebilir ve önizlenebilir.
    """
    _ = auth_ctx
    _ = http_request

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

        # Eşzamanlı (synchronous) derleme ile anında yüksek hızda tepki
        result = builder.execute()

        if result["status"] == "success" and os.path.exists(output_local):
            output_url = f"{settings.worker_api_url}/outputs/{job_id}/{output_filename}"

            # Log loglarını yerel cache'e kaydet (durum sorguları için)
            firebase_service._mock_logs[job_id] = {
                "project_id": "direct",
                "user_id": auth_ctx.get("uid", "direct"),
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
    http_request: Request,
    file: UploadFile = File(...),
    target_format: OutputFormat = Form(default=OutputFormat.PDF),
    auth_ctx: Dict[str, Any] = Depends(verify_access_token)
):
    """
    Yüklenen dokümanı analiz eder ve önerilen dönüşüm seçeneklerini döndürür.
    Dosya kalıcı olarak saklanmaz, sadece analiz için geçici olarak işlenir.
    """
    _ = auth_ctx
    _ = http_request

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
