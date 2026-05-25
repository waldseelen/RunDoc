"""
Pandoc Orchestrator — FastAPI Worker
Ana giriş noktası ve API rotaları.
"""

import os
import uuid
import shutil
import logging
import tempfile
from typing import Optional, List
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import settings
from app.core.pandoc_cmd import PandocCommandBuilder
from app.core.engines import EngineRouter
from app.core.parser import DocumentParser
from app.services.supabase_service import SupabaseService

# =============================================
# LOGGING
# =============================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

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

# CORS — Next.js frontend'den gelen istekler için
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase servisi
supabase_service = SupabaseService(
    url=settings.supabase_url,
    service_key=settings.supabase_service_key
)


# =============================================
# PYDANTIC MODELS
# =============================================

class ConversionRequest(BaseModel):
    """Dönüşüm isteği modeli."""
    project_id: str
    user_id: str
    input_document_id: str
    input_format: Optional[str] = None  # None ise otomatik algılanır
    output_format: str = "pdf"
    engine: Optional[str] = None  # None ise otomatik seçilir

    # Opsiyonel parametreler
    citeproc: bool = False
    bibliography_id: Optional[str] = None
    csl_style: Optional[str] = None  # "apa", "mla", "harvard", "ieee" veya özel dosya ID
    reference_doc_id: Optional[str] = None
    template_id: Optional[str] = None

    # Filtreler
    lua_filter_ids: List[str] = Field(default_factory=list)
    python_filter_ids: List[str] = Field(default_factory=list)

    # Seçenekler
    toc: bool = False
    toc_depth: int = 3
    smart: bool = True
    number_sections: bool = False
    standalone: bool = True
    highlight_style: str = "pygments"
    math_rendering: str = "mathjax"  # mathjax, katex, mathml

    # Medya ayıklama
    extract_media: bool = False

    # Ekstra değişkenler
    variables: dict = Field(default_factory=dict)
    metadata: dict = Field(default_factory=dict)

    # Birleştirme için ek dosyalar
    additional_input_ids: List[str] = Field(default_factory=list)


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
        supabase_service.update_conversion_status(job_id, "processing")

        # 2. Girdi dosyasını indir
        input_doc = supabase_service.get_project_documents(request.project_id)
        input_doc_info = next(
            (d for d in input_doc if d["id"] == request.input_document_id), None
        )

        if not input_doc_info:
            raise ValueError(f"Girdi dokümanı bulunamadı: {request.input_document_id}")

        input_filename = input_doc_info["file_name"]
        input_local = os.path.join(workdir, input_filename)

        bucket = input_doc_info.get("file_type", "source")
        storage_path = input_doc_info["storage_path"]

        supabase_service.download_file(bucket, storage_path, input_local)

        # 3. Format algılama
        input_format = request.input_format or DocumentParser.detect_format(input_local)
        if not input_format:
            raise ValueError(f"Girdi formatı algılanamadı: {input_filename}")

        # 4. Çıktı dosya adını belirle
        output_ext_map = {
            "pdf": ".pdf", "docx": ".docx", "odt": ".odt", "html": ".html",
            "html5": ".html", "epub": ".epub", "epub3": ".epub", "latex": ".tex",
            "pptx": ".pptx", "revealjs": ".html", "beamer": ".pdf",
            "markdown": ".md", "gfm": ".md", "rst": ".rst", "json": ".json",
            "plain": ".txt", "rtf": ".rtf", "typst": ".typ",
        }
        output_ext = output_ext_map.get(request.output_format, ".out")
        output_filename = f"{Path(input_filename).stem}_output{output_ext}"
        output_local = os.path.join(workdir, output_filename)

        # 5. Motor seçimi
        engine = None
        if request.output_format == "pdf":
            engine = EngineRouter.select_pdf_engine(request.engine)
        elif request.output_format in ("revealjs", "beamer", "slidy", "pptx"):
            engine = EngineRouter.select_slide_engine(request.engine)

        # 6. Pandoc komutunu oluştur
        builder = PandocCommandBuilder(input_local, output_local)

        if input_format:
            builder.set_input_format(input_format)

        if request.output_format != "pdf":
            builder.set_output_format(request.output_format)

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
            bib_docs = supabase_service.get_project_documents(
                request.project_id, "bibliography"
            )
            bib_doc = next((d for d in bib_docs if d["id"] == request.bibliography_id), None)
            if bib_doc:
                bib_local = os.path.join(workdir, bib_doc["file_name"])
                supabase_service.download_file("bibliography", bib_doc["storage_path"], bib_local)
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
                supabase_service.download_file("bibliography", request.csl_style, csl_local)
                builder.add_csl_style(csl_local)

        # Referans doküman
        if request.reference_doc_id:
            ref_docs = supabase_service.get_project_documents(
                request.project_id, "reference"
            )
            ref_doc = next((d for d in ref_docs if d["id"] == request.reference_doc_id), None)
            if ref_doc:
                ref_local = os.path.join(workdir, ref_doc["file_name"])
                supabase_service.download_file("reference", ref_doc["storage_path"], ref_local)
                builder.add_reference_doc(ref_local)

        # Lua filtreleri
        filters_applied = []
        for filter_id in request.lua_filter_ids:
            filter_docs = supabase_service.get_project_documents(
                request.project_id, "filter"
            )
            filter_doc = next((d for d in filter_docs if d["id"] == filter_id), None)
            if filter_doc:
                filter_local = os.path.join(workdir, filter_doc["file_name"])
                supabase_service.download_file("filters", filter_doc["storage_path"], filter_local)
                builder.add_lua_filter(filter_local)
                filters_applied.append(filter_doc["file_name"])

        # Python filtreleri
        for filter_id in request.python_filter_ids:
            filter_docs = supabase_service.get_project_documents(
                request.project_id, "filter"
            )
            filter_doc = next((d for d in filter_docs if d["id"] == filter_id), None)
            if filter_doc:
                filter_local = os.path.join(workdir, filter_doc["file_name"])
                supabase_service.download_file("filters", filter_doc["storage_path"], filter_local)
                builder.add_python_filter(filter_local)
                filters_applied.append(filter_doc["file_name"])

        # Medya ayıklama
        if request.extract_media:
            media_dir = os.path.join(workdir, "extracted_media")
            builder.extract_media(media_dir)

        # Ek girdi dosyaları (birleştirme)
        for additional_id in request.additional_input_ids:
            add_docs = supabase_service.get_project_documents(request.project_id)
            add_doc = next((d for d in add_docs if d["id"] == additional_id), None)
            if add_doc:
                add_local = os.path.join(workdir, f"add_{add_doc['file_name']}")
                supabase_service.download_file(
                    add_doc.get("file_type", "source"), add_doc["storage_path"], add_local
                )
                builder.add_extra_input(add_local)

        # 7. Komutu çalıştır
        result = builder.execute()

        # 8. Sonuçları işle
        if result["status"] == "success" and os.path.exists(output_local):
            # Çıktıyı Storage'a yükle
            output_storage_path = f"{request.project_id}/{job_id}/{output_filename}"
            supabase_service.upload_file("output", output_storage_path, output_local)

            # Doküman kaydı
            output_doc_id = supabase_service.register_document(
                project_id=request.project_id,
                file_name=output_filename,
                storage_path=output_storage_path,
                file_type="output",
                file_size_bytes=os.path.getsize(output_local)
            )

            # Başarılı durum güncelle
            supabase_service.update_conversion_status(
                log_id=job_id,
                status="completed",
                command_executed=result.get("cmd"),
                execution_time_ms=result.get("execution_time_ms"),
                output_document_id=output_doc_id,
                filters_applied=filters_applied if filters_applied else None
            )

            logger.info(f"Dönüşüm tamamlandı: {job_id}")

        else:
            supabase_service.update_conversion_status(
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
        supabase_service.update_conversion_status(
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

@app.get("/health")
async def health_check():
    """Sağlık kontrolü — worker'ın ayakta olduğunu doğrular."""
    pandoc_available = shutil.which("pandoc") is not None
    return {
        "status": "healthy",
        "pandoc_available": pandoc_available,
        "version": "0.1.0"
    }


@app.get("/engines")
async def list_engines():
    """Kullanılabilir dönüşüm motorlarını listeler."""
    return EngineRouter.get_all_engines_status()


@app.get("/formats")
async def list_formats():
    """Desteklenen girdi ve çıktı formatlarını listeler."""
    return {
        "input_formats": sorted(PandocCommandBuilder.VALID_INPUT_FORMATS),
        "output_formats": sorted(PandocCommandBuilder.VALID_OUTPUT_FORMATS)
    }


@app.post("/convert", response_model=ConversionResponse)
async def start_conversion(request: ConversionRequest, background_tasks: BackgroundTasks):
    """
    Yeni bir dönüşüm işlemi başlatır.
    İşlem arka planda asenkron olarak çalışır.
    """
    # Conversion log oluştur
    job_id = supabase_service.create_conversion_log(
        project_id=request.project_id,
        user_id=request.user_id,
        input_format=request.input_format or "auto",
        output_format=request.output_format,
        engine=request.engine
    )

    if not job_id:
        raise HTTPException(status_code=500, detail="Dönüşüm log kaydı oluşturulamadı")

    # Geçici çalışma dizini oluştur
    workdir = os.path.join(settings.worker_temp_dir, str(job_id))
    os.makedirs(workdir, exist_ok=True)

    # Arka plan görevi olarak başlat
    background_tasks.add_task(run_conversion, request, job_id, workdir)

    return ConversionResponse(
        job_id=job_id,
        status="pending",
        message="Dönüşüm işlemi başlatıldı. Durumu /status/{job_id} ile takip edebilirsiniz."
    )


@app.get("/status/{job_id}", response_model=ConversionStatus)
async def get_conversion_status(job_id: str):
    """Dönüşüm işleminin durumunu sorgular."""
    log = supabase_service.get_conversion_log(job_id)

    if not log:
        raise HTTPException(status_code=404, detail="Dönüşüm kaydı bulunamadı")

    # Çıktı URL'si (tamamlandıysa)
    output_url = None
    if log.get("status") == "completed" and log.get("output_document_id"):
        docs = supabase_service.get_project_documents(log["project_id"], "output")
        output_doc = next((d for d in docs if d["id"] == log["output_document_id"]), None)
        if output_doc:
            output_url = supabase_service.create_signed_url("output", output_doc["storage_path"])

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


@app.post("/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    target_format: str = Form(default="pdf")
):
    """
    Yüklenen dokümanı analiz eder ve önerilen dönüşüm seçeneklerini döndürür.
    Dosya kalıcı olarak saklanmaz, sadece analiz için geçici olarak işlenir.
    """
    # Geçici dosya oluştur
    workdir = os.path.join(settings.worker_temp_dir, f"analyze_{uuid.uuid4().hex[:8]}")
    os.makedirs(workdir, exist_ok=True)

    try:
        local_path = os.path.join(workdir, file.filename or "input")

        with open(local_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Format algılama
        detected_format = DocumentParser.detect_format(local_path)

        # Metadata çıkarma
        metadata = {}
        if detected_format in ("markdown", "latex", "rst"):
            metadata = DocumentParser.extract_yaml_metadata(local_path)

        # İçerik analizi
        content_analysis = {}
        if detected_format in ("markdown", "latex", "rst", "html", "org"):
            content_analysis = DocumentParser.analyze_content(local_path)

        # Önerilen seçenekler
        suggested = DocumentParser.suggest_conversion_options(content_analysis, target_format)

        return AnalysisResponse(
            format_detected=detected_format,
            metadata=metadata,
            content_analysis=content_analysis,
            suggested_options=suggested
        )

    finally:
        shutil.rmtree(workdir, ignore_errors=True)
