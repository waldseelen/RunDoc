"""
Pandoc Orchestrator — Agent Analyzer
Dosya tipi algılama, içerik analizi ve metadata çıkarımı.
Orchestrator'ın girdi analizi bileşeni.
"""

import logging
import mimetypes
from typing import Optional, Dict, Any
from pathlib import Path

from app.core.parser import DocumentParser, EXTENSION_FORMAT_MAP

logger = logging.getLogger(__name__)


class DocumentAnalyzer:
    """
    Doküman içerik analizi ve format algılama.
    Parser modülünün üzerine ek zeka katmanı ekler.
    """

    # MIME tipi → Pandoc format eşleme
    MIME_FORMAT_MAP = {
        "text/markdown": "markdown",
        "text/html": "html",
        "text/plain": "markdown",
        "text/x-latex": "latex",
        "text/x-rst": "rst",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/vnd.oasis.opendocument.text": "odt",
        "application/rtf": "rtf",
        "application/epub+zip": "epub",
        "application/json": "json",
        "text/csv": "csv",
        "text/tab-separated-values": "tsv",
        "application/x-ipynb+json": "ipynb",
    }

    @classmethod
    def detect_format_comprehensive(cls, file_path: str) -> Dict[str, Any]:
        """
        Kapsamlı format algılama.

        Returns:
            {
                "detected_format": str,
                "mime_type": str,
                "confidence": float,
                "method": str  # "extension" | "mime" | "content"
            }
        """
        result = {
            "detected_format": None,
            "mime_type": None,
            "confidence": 0.0,
            "method": "unknown"
        }

        path = Path(file_path)

        # 1. Uzantıdan algılama (en güvenilir)
        ext_format = EXTENSION_FORMAT_MAP.get(path.suffix.lower())
        if ext_format:
            result["detected_format"] = ext_format
            result["confidence"] = 0.9
            result["method"] = "extension"

        # 2. MIME tipinden algılama
        mime_type, _ = mimetypes.guess_type(file_path)
        result["mime_type"] = mime_type

        if mime_type and not result["detected_format"]:
            mime_format = cls.MIME_FORMAT_MAP.get(mime_type)
            if mime_format:
                result["detected_format"] = mime_format
                result["confidence"] = 0.7
                result["method"] = "mime"

        # 3. İçerikten algılama (fallback)
        if not result["detected_format"]:
            content_format = cls._detect_from_content(file_path)
            if content_format:
                result["detected_format"] = content_format
                result["confidence"] = 0.5
                result["method"] = "content"

        # Varsayılan
        if not result["detected_format"]:
            result["detected_format"] = "markdown"
            result["confidence"] = 0.3
            result["method"] = "default"

        return result

    @staticmethod
    def _detect_from_content(file_path: str) -> Optional[str]:
        """Dosya içeriğinden format tahmin eder."""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                # İlk 500 karakter yeterli
                header = f.read(500)

            # HTML
            if header.strip().startswith(("<!DOCTYPE", "<html", "<HTML")):
                return "html"

            # LaTeX
            if "\\documentclass" in header or "\\begin{document}" in header:
                return "latex"

            # YAML front-matter → Markdown
            if header.startswith("---"):
                return "markdown"

            # JSON
            if header.strip().startswith(("{", "[")):
                return "json"

            # Org-mode
            if header.startswith("#+"):
                return "org"

            # RST
            if "=====" in header or "-----" in header[:200]:
                return "rst"

        except Exception as e:
            logger.warning(f"İçerik algılama hatası: {e}")

        return None

    @classmethod
    def full_analysis(cls, file_path: str, target_format: str = "pdf") -> Dict[str, Any]:
        """
        Tam doküman analizi — format, metadata, içerik ve öneriler.

        Returns:
            Kapsamlı analiz raporu
        """
        report: Dict[str, Any] = {}

        # Format algılama
        format_info = cls.detect_format_comprehensive(file_path)
        report["format"] = format_info

        # İçerik analizi
        detected_format = format_info["detected_format"]
        if detected_format in ("markdown", "latex", "rst", "html", "org"):
            report["content"] = DocumentParser.analyze_content(file_path)
            report["metadata"] = DocumentParser.extract_yaml_metadata(file_path)
        else:
            report["content"] = {}
            report["metadata"] = {}

        # Önerilen parametreler
        report["suggestions"] = DocumentParser.suggest_conversion_options(
            report["content"], target_format
        )

        # Dosya istatistikleri
        path = Path(file_path)
        report["file_info"] = {
            "name": path.name,
            "extension": path.suffix,
            "size_bytes": path.stat().st_size if path.exists() else 0,
        }

        return report
