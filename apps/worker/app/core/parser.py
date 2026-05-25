"""
Pandoc Orchestrator — AST Parser & Format Analyzer
Girdi dosyalarını analiz eder, format algılar, YAML front-matter çıkarır.
Performans optimizasyonlu ve ReDoS (Regex Backtracking) korumalı mimari.
"""

import json
import subprocess
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path

logger = logging.getLogger(__name__)

# Dosya uzantısına göre format eşleme
EXTENSION_FORMAT_MAP: Dict[str, str] = {
    ".md": "markdown",
    ".markdown": "markdown",
    ".txt": "markdown",
    ".html": "html",
    ".htm": "html",
    ".xhtml": "html",
    ".tex": "latex",
    ".latex": "latex",
    ".docx": "docx",
    ".odt": "odt",
    ".rtf": "rtf",
    ".epub": "epub",
    ".rst": "rst",
    ".adoc": "asciidoc",
    ".asciidoc": "asciidoc",
    ".org": "org",
    ".textile": "textile",
    ".wiki": "mediawiki",
    ".mediawiki": "mediawiki",
    ".dokuwiki": "dokuwiki",
    ".ipynb": "ipynb",
    ".json": "json",
    ".csv": "csv",
    ".tsv": "tsv",
    ".bib": "bibtex",
    ".fb2": "fb2",
    ".djot": "djot",
    ".typ": "typst",
    ".xml": "jats",
    ".man": "man",
}


class DocumentParser:
    """Doküman analizi ve AST işlemleri."""

    @staticmethod
    def detect_format(file_path: str) -> Optional[str]:
        """Dosya uzantısına göre girdi formatını algılar."""
        ext = Path(file_path).suffix.lower()
        fmt = EXTENSION_FORMAT_MAP.get(ext)

        if fmt:
            logger.info(f"Format algılandı: {file_path} → {fmt}")
        else:
            logger.warning(f"Bilinmeyen dosya uzantısı: {ext}")

        return fmt

    @staticmethod
    def get_pandoc_ast(file_path: str, input_format: Optional[str] = None) -> Optional[Dict]:
        """
        Pandoc ile dokümanı JSON AST formatına çevirir.

        Returns:
            dict: Pandoc JSON AST yapısı veya hata durumunda None
        """
        from app.config import settings
        cmd = [settings.pandoc_path]

        if input_format:
            cmd.extend([f"--from={input_format}"])

        cmd.extend([file_path, "-t", "json"])

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=30
            )
            return json.loads(result.stdout)

        except subprocess.CalledProcessError as e:
            logger.error(f"AST çıkarımı başarısız: {e.stderr}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse hatası: {e}")
            return None

    @staticmethod
    def extract_yaml_metadata(file_path: str) -> Dict[str, Any]:
        """
        ReDoS (Regex Denial of Service) zafiyetlerinden arındırılmış, 
        yüksek hızlı satır bazlı YAML front-matter ayrıştırıcısı.
        """
        metadata: Dict[str, Any] = {}

        try:
            if not os.path.exists(file_path):
                return metadata

            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()

            if not lines:
                return metadata

            # Dosyanın ilk satırı geçerli bir YAML başlangıcı mı? (---)
            if lines[0].strip() == "---":
                yaml_lines = []
                for line in lines[1:]:
                    stripped = line.strip()
                    if stripped == "---":
                        break
                    yaml_lines.append(stripped)

                # Satırları ayrıştır
                for line in yaml_lines:
                    if ":" in line and not line.startswith("#"):
                        key, _, value = line.partition(":")
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if value:
                            metadata[key] = value

                logger.info(f"YAML metadata çıkarıldı: {list(metadata.keys())}")

        except Exception as e:
            logger.error(f"Metadata çıkarma hatası: {e}")

        return metadata

    @staticmethod
    def analyze_content(file_path: str) -> Dict[str, Any]:
        """
        ReDoS ve katlanarak artan zaman karmaşıklıklarından (backtracking) kaçınmak üzere 
        lineer O(N) zaman karmaşıklığıyla doküman içeriğini analiz eder.
        """
        analysis = {
            "has_math": False,
            "has_citations": False,
            "has_code_blocks": False,
            "has_tables": False,
            "has_images": False,
            "heading_count": 0,
            "max_heading_level": 0,
            "word_count": 0,
            "languages_detected": []
        }

        try:
            if not os.path.exists(file_path):
                return analysis

            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            if not content:
                return analysis

            # 1. Hızlı string taramaları (ReDoS Koruması)
            analysis["has_math"] = "$" in content or "\\(" in content or "\\[" in content
            analysis["has_citations"] = "@" in content or "\\cite" in content
            analysis["has_code_blocks"] = "```" in content
            analysis["has_images"] = "![" in content

            # 2. Kelime Sayısı Hesaplama (Basit ve hızlı)
            # YAML bloğunu çıkararak kelime sayısını bulalım
            lines = content.splitlines()
            body_start_idx = 0
            if lines and lines[0].strip() == "---":
                for idx, line in enumerate(lines[1:], start=1):
                    if line.strip() == "---":
                        body_start_idx = idx + 1
                        break

            body_lines = lines[body_start_idx:]
            total_words = 0
            min_heading = 7

            # Lineer O(N) dikey satır analizi
            in_code_block = False
            for idx, line in enumerate(body_lines):
                stripped = line.strip()
                total_words += len(stripped.split())

                # Kod blok dilleri toplama
                if stripped.startswith("```"):
                    in_code_block = not in_code_block
                    if in_code_block:
                        lang = stripped[3:].strip()
                        if lang and lang not in analysis["languages_detected"]:
                            analysis["languages_detected"].append(lang)
                    continue

                # Başlıkları topla
                if not in_code_block and stripped.startswith("#"):
                    parts = stripped.split(None, 1)
                    if parts:
                        hashes = parts[0]
                        if all(char == "#" for char in hashes) and len(hashes) <= 6:
                            analysis["heading_count"] += 1
                            min_heading = min(min_heading, len(hashes))

                # Tablo tespiti: bir satırda | varsa ve sonraki satır tablo ayırıcıysa (-|-)
                if not in_code_block and "|" in stripped:
                    if idx + 1 < len(body_lines):
                        next_line = body_lines[idx + 1].strip()
                        if "|" in next_line and ("-" in next_line or ":" in next_line):
                            analysis["has_tables"] = True

            analysis["word_count"] = total_words
            if analysis["heading_count"] > 0:
                analysis["max_heading_level"] = min_heading

        except Exception as e:
            logger.error(f"İçerik analizi hatası: {e}")

        return analysis

    @staticmethod
    def suggest_conversion_options(analysis: Dict[str, Any], target_format: str) -> Dict[str, Any]:
        """
        İçerik analizine dayalı olarak önerilen dönüşüm seçeneklerini döndürür.
        """
        suggestions: Dict[str, Any] = {
            "standalone": True,
            "smart": True,
        }

        # Matematik varsa → uygun matematik motoru öner
        if analysis.get("has_math"):
            if target_format in ("html", "html5", "revealjs", "slidy"):
                suggestions["math_rendering"] = "mathjax"
            elif target_format in ("pdf", "latex", "beamer"):
                suggestions["math_rendering"] = "native"
            else:
                suggestions["math_rendering"] = "webtex"

        # Atıf varsa → citeproc aktifleştir
        if analysis.get("has_citations"):
            suggestions["citeproc"] = True

        # Kod blokları varsa → syntax highlighting
        if analysis.get("has_code_blocks"):
            suggestions["highlight_style"] = "pygments"

        # Çok sayıda başlık varsa → toc öner
        if analysis.get("heading_count", 0) > 5:
            suggestions["toc"] = True
            suggestions["toc_depth"] = 3

        # Bölüm numaralandırma
        if analysis.get("heading_count", 0) > 3:
            suggestions["number_sections"] = True

        # PDF çıktısı için motor önerisi
        if target_format == "pdf":
            if analysis.get("has_math") or analysis.get("has_citations"):
                suggestions["engine"] = "xelatex"
            else:
                suggestions["engine"] = "typst"

        return suggestions
import os
