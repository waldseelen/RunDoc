"""
Pandoc Orchestrator — Engine Router
PDF ve slayt dönüşümlerinde kullanılacak motoru seçer ve doğrular.
"""

import shutil
import logging
from typing import Optional, Dict, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class EngineInfo:
    """Motor hakkında bilgiler."""
    name: str
    display_name: str
    category: str  # "pdf" | "slide" | "html"
    description: str
    binary_name: str
    is_available: bool = False


class EngineRouter:
    """
    Dönüşüm motorlarını yönetir, varlıklarını doğrular ve
    hedef formata göre uygun motoru seçer.
    """

    # PDF Motorları
    PDF_ENGINES: Dict[str, EngineInfo] = {
        "xelatex": EngineInfo(
            name="xelatex",
            display_name="XeLaTeX",
            category="pdf",
            description="Akademik yayıncılık için standart LaTeX motoru. Unicode ve OpenType font desteği.",
            binary_name="xelatex"
        ),
        "pdflatex": EngineInfo(
            name="pdflatex",
            display_name="pdfLaTeX",
            category="pdf",
            description="Klasik LaTeX motoru. Hızlı ama sınırlı font desteği.",
            binary_name="pdflatex"
        ),
        "lualatex": EngineInfo(
            name="lualatex",
            display_name="LuaLaTeX",
            category="pdf",
            description="Lua ile genişletilebilir LaTeX motoru. Tam Unicode desteği.",
            binary_name="lualatex"
        ),
        "tectonic": EngineInfo(
            name="tectonic",
            display_name="Tectonic",
            category="pdf",
            description="Modern, otomatik bağımlılık yönetimli TeX motoru.",
            binary_name="tectonic"
        ),
        "typst": EngineInfo(
            name="typst",
            display_name="Typst",
            category="pdf",
            description="Hızlı, modern dizgi motoru. LaTeX'e alternatif.",
            binary_name="typst"
        ),
        "weasyprint": EngineInfo(
            name="weasyprint",
            display_name="WeasyPrint",
            category="pdf",
            description="HTML/CSS tabanlı PDF üretimi. Web tasarımcıları için ideal.",
            binary_name="weasyprint"
        ),
        "prince": EngineInfo(
            name="prince",
            display_name="Prince",
            category="pdf",
            description="Profesyonel HTML/CSS to PDF motoru. Ticari lisans gerektirir.",
            binary_name="prince"
        ),
        "pagedjs-cli": EngineInfo(
            name="pagedjs-cli",
            display_name="Paged.js",
            category="pdf",
            description="Açık kaynak CSS Paged Media çözümü.",
            binary_name="pagedjs-cli"
        ),
    }

    # Slayt Motorları
    SLIDE_ENGINES: Dict[str, EngineInfo] = {
        "revealjs": EngineInfo(
            name="revealjs",
            display_name="reveal.js",
            category="slide",
            description="Modern HTML5 sunum framework'ü. Tarayıcıda çalışır.",
            binary_name="pandoc"
        ),
        "beamer": EngineInfo(
            name="beamer",
            display_name="Beamer (LaTeX)",
            category="slide",
            description="Akademik standart LaTeX sunum formatı.",
            binary_name="pdflatex"
        ),
        "slidy": EngineInfo(
            name="slidy",
            display_name="Slidy",
            category="slide",
            description="W3C HTML slayt formatı.",
            binary_name="pandoc"
        ),
        "pptx": EngineInfo(
            name="pptx",
            display_name="PowerPoint",
            category="slide",
            description="Microsoft PowerPoint formatı.",
            binary_name="pandoc"
        ),
    }

    @classmethod
    def check_engine_availability(cls, engine_name: str) -> bool:
        """Bir motorun sistemde kurulu olup olmadığını kontrol eder."""
        all_engines = {**cls.PDF_ENGINES, **cls.SLIDE_ENGINES}
        engine = all_engines.get(engine_name)

        if not engine:
            return False

        binary = engine.binary_name
        is_available = shutil.which(binary) is not None
        engine.is_available = is_available

        if not is_available:
            logger.warning(f"Motor bulunamadı: {engine_name} (binary: {binary})")

        return is_available

    @classmethod
    def get_available_pdf_engines(cls) -> List[EngineInfo]:
        """Sistemde kullanılabilir PDF motorlarını döndürür."""
        available = []
        for name, engine in cls.PDF_ENGINES.items():
            engine.is_available = cls.check_engine_availability(name)
            if engine.is_available:
                available.append(engine)
        return available

    @classmethod
    def get_available_slide_engines(cls) -> List[EngineInfo]:
        """Sistemde kullanılabilir slayt motorlarını döndürür."""
        available = []
        for name, engine in cls.SLIDE_ENGINES.items():
            engine.is_available = cls.check_engine_availability(name)
            if engine.is_available:
                available.append(engine)
        return available

    @classmethod
    def select_pdf_engine(cls, preferred: Optional[str] = None) -> Optional[str]:
        """
        PDF motoru seçer. Tercih edilen motor yoksa veya kullanılamıyorsa
        yedek motora düşer.

        Yedek sırası: preferred → xelatex → typst → weasyprint → pdflatex → None (HTML fallback)
        
        Returns:
            Engine name veya None (HTML çıkışına fallback yapılmalı)
        """
        fallback_order = ["xelatex", "typst", "weasyprint", "pdflatex", "lualatex", "tectonic"]

        if preferred and cls.check_engine_availability(preferred):
            return preferred

        if preferred:
            logger.warning(
                f"Tercih edilen motor '{preferred}' kullanılamıyor, yedek motor aranıyor..."
            )

        for engine_name in fallback_order:
            if cls.check_engine_availability(engine_name):
                logger.info(f"PDF motoru seçildi: {engine_name}")
                return engine_name

        # PDF motorları bulunamadıysa uyarı ver ama None döndür (HTML fallback'e izin ver)
        logger.warning(
            "Hiçbir PDF motoru bulunamadı. TeX Live, Typst veya WeasyPrint kurulu olmalıdır. "
            "Fallback: HTML çıkışı kullanılacak."
        )
        return None

    @classmethod
    def select_slide_engine(cls, preferred: Optional[str] = None) -> str:
        """Slayt motoru seçer."""
        fallback_order = ["revealjs", "pptx", "beamer", "slidy"]

        if preferred and preferred in cls.SLIDE_ENGINES:
            return preferred

        for engine_name in fallback_order:
            if cls.check_engine_availability(engine_name):
                return engine_name

        # Pandoc kendisi her zaman mevcut olmalı, revealjs varsayılan
        return "revealjs"

    @classmethod
    def get_all_engines_status(cls) -> Dict[str, Dict]:
        """Tüm motorların durumunu döndürür (API yanıtı için)."""
        result = {"pdf_engines": {}, "slide_engines": {}}

        for name, engine in cls.PDF_ENGINES.items():
            engine.is_available = cls.check_engine_availability(name)
            result["pdf_engines"][name] = {
                "display_name": engine.display_name,
                "description": engine.description,
                "available": engine.is_available
            }

        for name, engine in cls.SLIDE_ENGINES.items():
            engine.is_available = cls.check_engine_availability(name)
            result["slide_engines"][name] = {
                "display_name": engine.display_name,
                "description": engine.description,
                "available": engine.is_available
            }

        return result
