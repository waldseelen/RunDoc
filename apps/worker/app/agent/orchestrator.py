"""
Pandoc Orchestrator — Agent Orchestrator
Ana ajan karar motoru. Kullanıcı talebini analiz eder, strateji belirler,
dönüşüm pipeline'ı kurar ve hata kurtarma yapar.
"""

import asyncio
import os
import logging
import re
from typing import Dict, Any, Optional, List, Callable, Mapping
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
    warnings: List[str] = field(default_factory=list)


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

    VALID_MATH_RENDERING = {"mathjax", "katex", "mathml", "gladtex", "webtex"}
    CLI_TOKEN_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")

    def __init__(
        self,
        parser: Optional[DocumentParser] = None,
        parser_factory: Optional[Callable[[], DocumentParser]] = None,
    ):
        # Thread-safe tasarım: parser istek bazında üretilecek şekilde factory kullanılır.
        # parser argümanı geriye dönük uyumluluk için "prototype" olarak tutulur.
        self.parser = parser or DocumentParser()

        if parser_factory is not None:
            self._parser_factory = parser_factory
        elif parser is not None:
            parser_cls = parser.__class__
            try:
                _ = parser_cls()
                self._parser_factory = parser_cls
            except Exception:
                logger.warning(
                    "Parser sınıfı parametresiz üretilemedi. Paylaşımlı parser instance kullanılacak; "
                    "eşzamanlı kullanımda parser'ın stateless olması gerekir."
                )
                self._parser_factory = lambda: parser
        else:
            self._parser_factory = DocumentParser

    @staticmethod
    def _normalize_text(value: Any) -> str:
        """Görünmez karakterleri temizler ve kırpar."""
        if value is None:
            return ""
        text = str(value)
        for ch in ("\u200b", "\u200c", "\u200d", "\ufeff"):
            text = text.replace(ch, "")
        return text.strip()

    def _normalize_cli_option(self, value: Any, field_name: str, default: str) -> str:
        """CLI option alanlarını normalize/validate eder."""
        normalized = self._normalize_text(value).lower()
        if not normalized:
            return default

        if field_name == "math_rendering":
            if normalized not in self.VALID_MATH_RENDERING:
                logger.warning(
                    f"Geçersiz math_rendering değeri alındı: {value!r}. Varsayılan ({default}) kullanılacak."
                )
                return default
            return normalized

        # highlight_style gibi token alanları
        if not self.CLI_TOKEN_RE.fullmatch(normalized):
            logger.warning(
                f"Geçersiz {field_name} değeri alındı: {value!r}. Varsayılan ({default}) kullanılacak."
            )
            return default

        return normalized

    def _validate_string_map(self, raw_map: Any, field_name: str) -> Dict[str, str]:
        """Dict[str, str] tip güvenliğini zorunlu kılar."""
        if raw_map is None:
            return {}

        if not isinstance(raw_map, Mapping):
            raise ValueError(f"'{field_name}' bir sözlük (dict) olmalıdır")

        sanitized: Dict[str, str] = {}
        for key, value in raw_map.items():
            if not isinstance(key, str):
                raise ValueError(f"'{field_name}' anahtarları string olmalıdır")
            if not isinstance(value, str):
                raise ValueError(
                    f"'{field_name}.{key}' değeri string olmalıdır (alınan tip: {type(value).__name__})"
                )

            clean_key = self._normalize_text(key)
            clean_value = self._normalize_text(value)

            if not clean_key:
                raise ValueError(f"'{field_name}' içinde boş anahtar kullanılamaz")

            sanitized[clean_key] = clean_value

        return sanitized

    def _build_parser(self) -> DocumentParser:
        parser = self._parser_factory()
        return parser

    def _safe_path_resolve(self, path: Optional[str], base_dir: str) -> Optional[str]:
        """
        Kullanıcı tercihlerinden (filters, bibliography, reference_doc vb.) gelebilecek
        yol geçişi (Path Traversal) zafiyetlerini önlemek üzere güvenli çözümleme yapar.
        """
        if not path:
            return None

        normalized_input = self._normalize_text(path)
        if not normalized_input:
            return None

        # Normalleştir ve temizle
        normalized = os.path.normpath(normalized_input)

        # Yol geçişi ve mutlak yol enjeksiyonunu engelle
        if normalized.startswith("..") or os.path.isabs(normalized):
            logger.warning(f"Güvenlik Uyarısı: Şüpheli yol geçişi (path traversal) engellendi: {path}")
            # Güvenli fallback: Sadece dosya adını alıp çalışma dizinine bağla
            basename = os.path.basename(normalized)
            return os.path.join(base_dir, basename)

        # Çalışma diziniyle birleştir ve doğrula
        resolved = os.path.abspath(os.path.join(base_dir, normalized))
        base_abs = os.path.abspath(base_dir)

        if not resolved.startswith(base_abs):
            logger.warning(f"Güvenlik Uyarısı: Yol dışarı taşmaya çalışıyor: {resolved}")
            return os.path.join(base_dir, os.path.basename(normalized))

        return resolved

    async def analyze_and_plan_async(
        self,
        input_path: str,
        target_format: str,
        user_preferences: Optional[Dict[str, Any]] = None,
    ) -> ConversionPlan:
        """
        Async ortamlarda event loop bloklamamak için analyze_and_plan metodunu
        worker thread üzerinde çalıştırır.
        """
        return await asyncio.to_thread(
            self.analyze_and_plan,
            input_path,
            target_format,
            user_preferences,
        )

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
        warnings: List[str] = []
        base_dir = os.path.dirname(os.path.abspath(input_path))
        parser = self._build_parser()

        # Performans Optimizasyonu: Disk G/Ç (I/O) darboğazını engellemek için,
        # dosya içeriği tek bir kez okunup bellek tamponuna (buffer) alınır.
        try:
            with open(input_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except OSError as e:
            logger.error(f"Dosya okuma hatası: {e}")
            raise ValueError(f"Dönüştürülecek girdi dosyası okunamadı: {e}")

        try:
            # 1. Format algılama (dosya uzantısından)
            detected_format = parser.detect_format(input_path)
            input_format = prefs.get("input_format") or detected_format or "markdown"
            reasoning_parts.append(f"Girdi formatı: {input_format}")

            # 2. İçerik analizi (Bellek içi content ile - Sıfır mükerrer dosya okuma)
            analysis = parser.analyze_content(input_path, content=content)
            reasoning_parts.append(
                f"İçerik: {analysis.get('word_count', 0)} kelime, "
                f"math={'var' if analysis.get('has_math') else 'yok'}, "
                f"atıf={'var' if analysis.get('has_citations') else 'yok'}"
            )

            # 3. Metadata (Bellek içi content ile - Sıfır mükerrer dosya okuma)
            metadata = parser.extract_yaml_metadata(input_path, content=content)

            # 4. Önerilen seçenekler
            suggestions = parser.suggest_conversion_options(analysis, target_format)

            # 5. Plan oluştur
            plan = ConversionPlan(
                input_format=input_format,
                output_format=target_format,
            )

            # Motor seçimi ve Kararlılık (Engine Availability check & Fallbacks)
            if target_format == "pdf":
                preferred_engine = prefs.get("engine") or suggestions.get("engine")
                plan.engine = EngineRouter.select_pdf_engine(preferred_engine)

                # Motor kurululuk kontrolü (subprocess runtime çökmelerini önlemek için)
                if plan.engine and not EngineRouter.check_engine_availability(plan.engine):
                    logger.warning(f"Seçilen PDF motoru '{plan.engine}' sistemde bulunamadı. Fallback başlatılıyor...")
                    plan.engine = EngineRouter.select_pdf_engine()  # Kullanılabilir ilk PDF motorunu bul

                if plan.engine is None:
                    logger.warning("Hiçbir PDF motoru bulunamadı, HTML fallback uygulanıyor")
                    plan.output_format = "html"
                    reasoning_parts.append("PDF motoru bulunamadı, çıktı HTML'e düşürüldü")
                else:
                    reasoning_parts.append(f"PDF motoru: {plan.engine}")

            elif target_format in ("revealjs", "beamer", "slidy", "pptx"):
                preferred_engine = prefs.get("engine")
                plan.engine = EngineRouter.select_slide_engine(preferred_engine)

                # Motor kurululuk kontrolü
                if plan.engine and not EngineRouter.check_engine_availability(plan.engine):
                    logger.warning(f"Seçilen slayt motoru '{plan.engine}' sistemde bulunamadı. Fallback başlatılıyor...")
                    plan.engine = None
                    for slide_opt in ["revealjs", "pptx", "slidy"]:
                        if EngineRouter.check_engine_availability(slide_opt):
                            plan.engine = slide_opt
                            break

                if plan.engine:
                    reasoning_parts.append(f"Slayt motoru: {plan.engine}")
                else:
                    reasoning_parts.append("Uyumlu slayt motoru bulunamadı")

            # Kullanıcı tercihleri ve Yol/Girdi validasyonları (Path Traversal ve Injection mitigation)
            if prefs.get("smart") is not None:
                plan.smart = bool(prefs["smart"])

            plan.bibliography = self._safe_path_resolve(prefs.get("bibliography"), base_dir)
            plan.csl_style = self._safe_path_resolve(prefs.get("csl_style"), base_dir)
            plan.reference_doc = self._safe_path_resolve(prefs.get("reference_doc"), base_dir)
            plan.template = self._safe_path_resolve(prefs.get("template"), base_dir)

            # Front-matter üzerinden bibliography tanımı geldiyse fallback olarak kullan
            metadata_bibliography = metadata.get("bibliography")
            if not plan.bibliography and isinstance(metadata_bibliography, str):
                plan.bibliography = self._safe_path_resolve(metadata_bibliography, base_dir)

            # Citeproc: atıf algılanması tek başına yeterli değil,
            # en az bir kaynakça kaynağı da bulunmalı.
            has_citations = bool(analysis.get("has_citations"))
            wants_citeproc = bool(prefs.get("citeproc")) or has_citations
            citation_source_available = bool(
                plan.bibliography
                or (isinstance(metadata.get("bibliography"), str) and metadata.get("bibliography").strip())
                or metadata.get("references")
            )

            if wants_citeproc and citation_source_available:
                plan.citeproc = True
                reasoning_parts.append("Citeproc aktifleştirildi (atıf + kaynakça kaynağı mevcut)")
            elif wants_citeproc and not citation_source_available:
                warn = "Atıf tespit edildi ancak bibliography kaynağı bulunamadı; citeproc devre dışı bırakıldı"
                warnings.append(warn)
                reasoning_parts.append(warn)

            # Matematik
            if analysis.get("has_math"):
                math_method = prefs.get("math_rendering") or suggestions.get("math_rendering", "mathjax")
                plan.math_rendering = self._normalize_cli_option(math_method, "math_rendering", "mathjax")
                reasoning_parts.append(f"Matematik işleme: {plan.math_rendering}")

            # DoS Koruması (Limitsiz toc_depth parametre kontrolü)
            if suggestions.get("toc") or prefs.get("toc"):
                plan.toc = True
                toc_depth = prefs.get("toc_depth", 3)
                try:
                    toc_depth = int(toc_depth)
                    if not (1 <= toc_depth <= 6):
                        logger.warning(f"Geçersiz toc_depth ({toc_depth}) sınırlandırıldı (Değer 3 olarak ayarlandı)")
                        toc_depth = 3
                except (ValueError, TypeError):
                    toc_depth = 3
                plan.toc_depth = toc_depth

            # Numbering
            if suggestions.get("number_sections") or prefs.get("number_sections"):
                plan.number_sections = True

            # Highlight style
            if analysis.get("has_code_blocks"):
                style = prefs.get("highlight_style") or suggestions.get("highlight_style") or "pygments"
                plan.highlight_style = self._normalize_cli_option(style, "highlight_style", "pygments")

                langs = analysis.get("languages_detected", [])
                if langs:
                    reasoning_parts.append(f"Kod dilleri: {', '.join(langs)}")
            else:
                plan.highlight_style = self._normalize_cli_option(
                    prefs.get("highlight_style", plan.highlight_style),
                    "highlight_style",
                    "pygments",
                )

            # Değişkenlerin ve Metaverilerin sanitizasyonu (girdi injection koruması)
            plan.variables = self._validate_string_map(prefs.get("variables", {}), "variables")

            sanitized_meta: Dict[str, str] = {}
            for k, v in metadata.items():
                if isinstance(k, str) and isinstance(v, str):
                    clean_key = self._normalize_text(k)
                    if clean_key:
                        sanitized_meta[clean_key] = self._normalize_text(v)

            pref_meta = self._validate_string_map(prefs.get("metadata", {}), "metadata")
            sanitized_meta.update(pref_meta)
            plan.metadata = sanitized_meta

            if prefs.get("extract_media"):
                plan.extract_media = True

            # Filtre yollarının sanitizasyonu
            raw_filters = prefs.get("filters", [])
            if raw_filters is None:
                raw_filters = []
            if not isinstance(raw_filters, list):
                raise ValueError("'filters' alanı liste (list) olmalıdır")

            sanitized_filters = []
            for f_path in raw_filters:
                if not isinstance(f_path, str):
                    raise ValueError("'filters' listesi yalnızca string yol değerleri içermelidir")
                safe_f = self._safe_path_resolve(f_path, base_dir)
                if safe_f:
                    sanitized_filters.append(safe_f)
            plan.filters = sanitized_filters

            plan.warnings = warnings

            # Güven skoru hesapla
            plan.confidence = self._calculate_confidence(analysis, plan)
            plan.reasoning = " | ".join(reasoning_parts)

            logger.info(f"Plan oluşturuldu: {plan.reasoning} (güven: {plan.confidence:.1%})")
            return plan

        except Exception as e:
            logger.error(f"Planlama sırasında beklenmeyen hata: {e}")
            raise ValueError(f"Doküman dönüştürme planı oluşturulamadı: {e}")

    def build_command(self, plan: ConversionPlan, input_path: str, output_path: str) -> PandocCommandBuilder:
        """
        Dönüşüm planından PandocCommandBuilder oluşturur.
        Komut inşa detayları builder katmanına devredilir (sızıntılı soyutlama önlenir).
        """
        try:
            return PandocCommandBuilder.from_plan(plan, input_path, output_path)
        except Exception as e:
            logger.error(f"Pandoc komut inşası sırasında hata: {e}")
            raise ValueError(f"Pandoc derleme komutu hazırlanamadı: {e}")

    def _calculate_confidence(self, analysis: Dict[str, Any], plan: ConversionPlan) -> float:
        """
        Deterministik güven skoru (0.0 - 1.0).

        Yaklaşım:
        - Her kritik doğrulama bir "kontrol" olarak ele alınır.
        - Nihai skor = başarılı kontroller / toplam kontroller.
        - Fallback senaryoları (örn. PDF → HTML) açıkça desteklenir.
        """
        checks: List[bool] = []

        # 1) Temel plan bütünlüğü
        checks.append(bool(plan.input_format))
        checks.append(bool(plan.output_format))

        # 2) Çıktı motoru hazır mı?
        if plan.output_format == "pdf":
            checks.append(bool(plan.engine) and EngineRouter.check_engine_availability(plan.engine))
        else:
            # PDF dışı formatlarda engine zorunlu değil
            checks.append(True)

        # 3) Atıf zinciri hazır mı?
        has_citations = bool(analysis.get("has_citations"))
        if has_citations:
            checks.append(plan.citeproc and bool(plan.bibliography))
        else:
            checks.append(True)

        # 4) Matematik zinciri hazır mı?
        has_math = bool(analysis.get("has_math"))
        if has_math:
            if plan.output_format == "pdf":
                # PDF için geçerli bir PDF engine varsa yeterli kabul edilir
                checks.append(bool(plan.engine))
            else:
                checks.append(plan.math_rendering in self.VALID_MATH_RENDERING)
        else:
            checks.append(True)

        # 5) İçerik analiz edilebildi mi?
        checks.append(analysis.get("word_count", 0) > 0)

        passed = sum(1 for item in checks if item)
        total = len(checks) if checks else 1
        return round(passed / total, 2)
