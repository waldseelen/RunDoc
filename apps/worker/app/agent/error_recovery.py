"""
Pandoc Orchestrator — Error Recovery
LaTeX hata loglarını analiz eder ve otomatik düzeltme stratejileri uygular.
"""

import re
import logging
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ErrorDiagnosis:
    """Hata teşhis raporu."""
    error_type: str
    description: str
    suggested_fix: str
    auto_fixable: bool
    fix_params: Dict = None

    def __post_init__(self):
        if self.fix_params is None:
            self.fix_params = {}


class ErrorRecovery:
    """
    LaTeX ve Pandoc hata loglarını analiz eder,
    otomatik düzeltme stratejileri önerir ve uygular.
    """

    # Bilinen hata kalıpları ve düzeltmeleri
    ERROR_PATTERNS: List[Tuple[str, str, str, bool, Dict]] = [
        # (regex_pattern, error_type, description, auto_fixable, fix_params)
        (
            r"! LaTeX Error: File `(.+?)' not found",
            "missing_package",
            "Eksik LaTeX paketi",
            True,
            {"action": "install_package"}
        ),
        (
            r"! Font .+ not found|fontspec error",
            "missing_font",
            "Eksik font dosyası",
            True,
            {"action": "fallback_font", "fallback": "DejaVu Sans"}
        ),
        (
            r"Undefined control sequence",
            "undefined_command",
            "Tanımsız LaTeX komutu",
            True,
            {"action": "switch_engine", "fallback_engine": "lualatex"}
        ),
        (
            r"! Missing \$ inserted",
            "math_mode_error",
            "Matematik modu hatası — $ işareti eksik",
            False,
            {"action": "notify_user"}
        ),
        (
            r"Conversion failed|pandoc: Error",
            "pandoc_error",
            "Pandoc genel dönüşüm hatası",
            False,
            {"action": "notify_user"}
        ),
        (
            r"Could not find data file",
            "missing_data",
            "Pandoc veri dosyası bulunamadı",
            False,
            {"action": "check_installation"}
        ),
        (
            r"UTF-8.*decod|codec can't decode",
            "encoding_error",
            "Dosya kodlama hatası",
            True,
            {"action": "force_encoding", "encoding": "utf-8"}
        ),
        (
            r"Process timeout expired|timed out",
            "timeout",
            "İşlem zaman aşımına uğradı",
            True,
            {"action": "increase_timeout", "multiplier": 2}
        ),
        (
            r"memory|TeX capacity exceeded",
            "memory_error",
            "TeX bellek sınırı aşıldı",
            True,
            {"action": "switch_engine", "fallback_engine": "typst"}
        ),
    ]

    @classmethod
    def diagnose(cls, error_output: str) -> List[ErrorDiagnosis]:
        """
        Hata çıktısını analiz eder ve teşhis raporları döndürür.

        Args:
            error_output: Pandoc/LaTeX stderr çıktısı

        Returns:
            List[ErrorDiagnosis]: Teşhis edilmiş hatalar listesi
        """
        diagnoses = []

        for pattern, err_type, description, auto_fixable, fix_params in cls.ERROR_PATTERNS:
            match = re.search(pattern, error_output, re.IGNORECASE)
            if match:
                # Dinamik açıklama
                desc = description
                params = dict(fix_params)

                # Eksik paket adını yakala
                if err_type == "missing_package" and match.groups():
                    params["package_name"] = match.group(1)
                    desc = f"Eksik LaTeX paketi: {match.group(1)}"

                suggested_fix = cls._get_fix_description(err_type, params)

                diagnoses.append(ErrorDiagnosis(
                    error_type=err_type,
                    description=desc,
                    suggested_fix=suggested_fix,
                    auto_fixable=auto_fixable,
                    fix_params=params
                ))

        # Bilinmeyen hata
        if not diagnoses:
            diagnoses.append(ErrorDiagnosis(
                error_type="unknown",
                description="Bilinmeyen hata",
                suggested_fix="Hata logunu kontrol edin ve farklı bir motor deneyin.",
                auto_fixable=False,
                fix_params={"raw_error": error_output[:500]}
            ))

        return diagnoses

    @classmethod
    def suggest_retry_params(
        cls,
        diagnoses: List[ErrorDiagnosis],
        current_engine: Optional[str] = None,
        timeout: Optional[int] = None,
        current_timeout: Optional[int] = None
    ) -> Optional[Dict]:
        """
        Teşhislere dayalı olarak yeniden deneme parametreleri önerir.

        Args:
            diagnoses: Teşhis listesi
            current_engine: Şu anki motor
            timeout: Alternatif parametrize (legacy support)
            current_timeout: Güncel timeout değeri (default: 120)

        Returns:
            Dict veya None: Yeniden deneme parametreleri
        """
        # Parametrize uyumluluğu: timeout → current_timeout
        effective_timeout = current_timeout or timeout or 120
        retry_params = {}

        for diagnosis in diagnoses:
            if not diagnosis.auto_fixable:
                continue

            action = diagnosis.fix_params.get("action")

            if action == "switch_engine":
                fallback = diagnosis.fix_params.get("fallback_engine", "typst")
                if fallback != current_engine:
                    retry_params["engine"] = fallback
                    logger.info(f"Motor değiştiriliyor: {current_engine} → {fallback}")

            elif action == "fallback_font":
                fallback_font = diagnosis.fix_params.get("fallback", "DejaVu Sans")
                retry_params.setdefault("variables", {})["mainfont"] = fallback_font
                logger.info(f"Yedek font uygulanıyor: {fallback_font}")

            elif action == "increase_timeout":
                multiplier = diagnosis.fix_params.get("multiplier", 2)
                retry_params["timeout"] = min(effective_timeout * multiplier, 600)
                logger.info(f"Timeout artırılıyor: {effective_timeout} → {retry_params['timeout']}")

            elif action == "force_encoding":
                retry_params["encoding"] = diagnosis.fix_params.get("encoding", "utf-8")

        return retry_params if retry_params else None

    @staticmethod
    def _get_fix_description(error_type: str, params: Dict) -> str:
        """Hata tipine göre düzeltme açıklaması oluşturur."""
        fix_map = {
            "missing_package": f"LaTeX paketi '{params.get('package_name', '?')}' kurulacak.",
            "missing_font": f"Yedek font kullanılacak: {params.get('fallback', 'varsayılan')}",
            "undefined_command": f"Motor değiştirilecek: {params.get('fallback_engine', 'lualatex')}",
            "math_mode_error": "Matematik ifadesini $ işaretleri arasına alın.",
            "pandoc_error": "Girdi dosyasını ve format ayarlarını kontrol edin.",
            "missing_data": "Pandoc kurulumunu doğrulayın.",
            "encoding_error": "Dosya UTF-8 olarak yeniden kodlanacak.",
            "timeout": f"Zaman aşımı {params.get('multiplier', 2)}x artırılacak.",
            "memory_error": f"Daha hafif motor denenecek: {params.get('fallback_engine', 'typst')}",
        }
        return fix_map.get(error_type, "Manuel müdahale gerekli.")

    @classmethod
    def get_max_retries(cls) -> int:
        """Maksimum yeniden deneme sayısı."""
        return 3
