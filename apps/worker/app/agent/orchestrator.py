"""
Pandoc Orchestrator — Agent Orchestrator
Ana ajan karar motoru. Kullanıcı talebini analiz eder, strateji belirler,
dönüşüm pipeline'ı kurar ve hata kurtarma yapar.
"""

import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field

from app.core.pandoc_cmd import PandocCommandBuilder
from app.core.engines import EngineRouter
from app.core.parser import DocumentParser

logger = logging.getLogger(__name__)


@dataclass
class ConversionPlan:
    """Ajanın oluşturduğu dönüşüm planı."""
    input_format: str
    output_format: str
    engine: Optional[str] = None
    citeproc: bool = False
    smart: bool = True
    toc: bool = False
    toc_depth: int = 3
    number_sections: bool = False
    standalone: bool = True
    highlight_style: str = "pygments"
    math_rendering: str = "mathjax"
    filters: List[str] = field(default_factory=list)
    variables: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, str] = field(default_factory=dict)
    bibliography: Optional[str] = None
    csl_style: Optional[str] = None
    reference_doc: Optional[str] = None
    template: Optional[str] = None
    extract_media: bool = False
    confidence: float = 0.0
    reasoning: str = ""


class AgentOrchestrator:
    """
    Derleme ve Dönüşüm Orkestratörü.

    İş akışı:
    1. Girdi analizi (format, içerik, metadata)
    2. Strateji belirleme (motor, parametreler)
    3. Pipeline oluşturma (komut zinciri)
    4. Yürütme
    5. Hata kurtarma (gerekirse)
    6. Teslimat
    """

    def __init__(self):
        self.parser = DocumentParser()

    def analyze_and_plan(
        self,
        input_path: str,
        target_format: str,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> ConversionPlan:
        """
        Girdi dosyasını analiz eder ve en uygun dönüşüm planını oluşturur.

        Args:
            input_path: Girdi dosyasının yolu
            target_format: Hedef çıktı formatı
            user_preferences: Kullanıcının belirttiği tercihler

        Returns:
            ConversionPlan: Oluşturulan dönüşüm planı
        """
        prefs = user_preferences or {}
        reasoning_parts = []

        # 1. Format algılama
        detected_format = self.parser.detect_format(input_path)
        input_format = prefs.get("input_format") or detected_format or "markdown"
        reasoning_parts.append(f"Girdi formatı: {input_format}")

        # 2. İçerik analizi
        analysis = self.parser.analyze_content(input_path)
        reasoning_parts.append(
            f"İçerik: {analysis.get('word_count', 0)} kelime, "
            f"math={'var' if analysis.get('has_math') else 'yok'}, "
            f"atıf={'var' if analysis.get('has_citations') else 'yok'}"
        )

        # 3. Metadata
        metadata = self.parser.extract_yaml_metadata(input_path)

        # 4. Önerilen seçenekler
        suggestions = self.parser.suggest_conversion_options(analysis, target_format)

        # 5. Plan oluştur
        plan = ConversionPlan(
            input_format=input_format,
            output_format=target_format,
        )

        # Motor seçimi
        if target_format == "pdf":
            preferred_engine = prefs.get("engine") or suggestions.get("engine")
            try:
                plan.engine = EngineRouter.select_pdf_engine(preferred_engine)
            except RuntimeError:
                plan.engine = "xelatex"  # Fallback
            reasoning_parts.append(f"PDF motoru: {plan.engine}")

        elif target_format in ("revealjs", "beamer", "slidy", "pptx"):
            plan.engine = EngineRouter.select_slide_engine(prefs.get("engine"))
            reasoning_parts.append(f"Slayt motoru: {plan.engine}")

        # Citeproc
        if analysis.get("has_citations") or prefs.get("citeproc"):
            plan.citeproc = True
            reasoning_parts.append("Citeproc aktifleştirildi (atıf algılandı)")

        # Matematik
        if analysis.get("has_math"):
            math_method = prefs.get("math_rendering") or suggestions.get("math_rendering", "mathjax")
            plan.math_rendering = math_method
            reasoning_parts.append(f"Matematik işleme: {math_method}")

        # TOC
        if suggestions.get("toc") or prefs.get("toc"):
            plan.toc = True
            plan.toc_depth = prefs.get("toc_depth", 3)

        # Numbering
        if suggestions.get("number_sections") or prefs.get("number_sections"):
            plan.number_sections = True

        # Highlight style
        if analysis.get("has_code_blocks"):
            plan.highlight_style = prefs.get("highlight_style", "pygments")
            langs = analysis.get("languages_detected", [])
            if langs:
                reasoning_parts.append(f"Kod dilleri: {', '.join(langs)}")

        # Kullanıcı tercihleri override
        if prefs.get("smart") is not None:
            plan.smart = prefs["smart"]

        if prefs.get("bibliography"):
            plan.bibliography = prefs["bibliography"]

        if prefs.get("csl_style"):
            plan.csl_style = prefs["csl_style"]

        if prefs.get("reference_doc"):
            plan.reference_doc = prefs["reference_doc"]

        if prefs.get("template"):
            plan.template = prefs["template"]

        if prefs.get("variables"):
            plan.variables = prefs["variables"]

        if prefs.get("extract_media"):
            plan.extract_media = True

        if prefs.get("filters"):
            plan.filters = prefs["filters"]

        # Güven skoru hesapla
        plan.confidence = self._calculate_confidence(analysis, plan)
        plan.reasoning = " | ".join(reasoning_parts)

        logger.info(f"Plan oluşturuldu: {plan.reasoning} (güven: {plan.confidence:.1%})")

        return plan

    def build_command(self, plan: ConversionPlan, input_path: str, output_path: str) -> PandocCommandBuilder:
        """
        Dönüşüm planından PandocCommandBuilder oluşturur.
        """
        builder = PandocCommandBuilder(input_path, output_path)

        builder.set_input_format(plan.input_format)

        if plan.output_format != "pdf":
            builder.set_output_format(plan.output_format)

        if plan.engine:
            builder.add_engine(plan.engine)

        if plan.standalone:
            builder.set_standalone()

        if plan.smart:
            builder.enable_smart_typography()

        if plan.toc:
            builder.add_toc(plan.toc_depth)

        if plan.number_sections:
            builder.set_number_sections()

        if plan.citeproc:
            builder.enable_citeproc()

        if plan.bibliography:
            builder.add_bibliography(plan.bibliography)

        if plan.csl_style:
            builder.add_csl_style(plan.csl_style)

        if plan.reference_doc:
            builder.add_reference_doc(plan.reference_doc)

        if plan.template:
            builder.add_template(plan.template)

        if plan.highlight_style:
            builder.set_highlight_style(plan.highlight_style)

        if plan.math_rendering:
            builder.set_math_rendering(plan.math_rendering)

        if plan.variables:
            builder.set_variables(plan.variables)

        for key, value in plan.metadata.items():
            builder.set_metadata(key, value)

        if plan.extract_media:
            builder.extract_media("./extracted_media")

        for filter_path in plan.filters:
            if filter_path.endswith(".lua"):
                builder.add_lua_filter(filter_path)
            elif filter_path.endswith(".py"):
                builder.add_python_filter(filter_path)

        return builder

    def _calculate_confidence(self, analysis: Dict, plan: ConversionPlan) -> float:
        """Dönüşüm planının güven skorunu hesaplar (0.0 - 1.0)."""
        score = 0.5  # Taban skor

        # Motor mevcut mu?
        if plan.engine:
            if EngineRouter.check_engine_availability(plan.engine):
                score += 0.2
            else:
                score -= 0.3

        # Atıf varsa ve citeproc aktif mi?
        if analysis.get("has_citations") and plan.citeproc:
            score += 0.1

        # Atıf var ama citeproc kapalı?
        if analysis.get("has_citations") and not plan.citeproc:
            score -= 0.1

        # Matematik varsa uygun motor mu?
        if analysis.get("has_math") and plan.engine in ("xelatex", "lualatex", "typst"):
            score += 0.1

        # İçerik analizi yapılabildi mi?
        if analysis.get("word_count", 0) > 0:
            score += 0.1

        return min(max(score, 0.0), 1.0)
