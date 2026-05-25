"""
Pandoc Orchestrator — AST Parser & Format Analyzer
Girdi dosyalarını analiz eder, format algılar, YAML front-matter çıkarır.
"""

import json
import subprocess
import logging
import re
from typing import Optional, Dict, Any, List
from pathlib import Path

from app.config import settings

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
        Markdown dosyasından YAML front-matter bloğunu çıkarır.

        Desteklenen format:
        ---
        title: Başlık
        author: Yazar
        date: 2026-01-01
        ---
        """
        metadata: Dict[str, Any] = {}

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # YAML front-matter bloğunu bul
            yaml_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)

            if yaml_match:
                yaml_block = yaml_match.group(1)

                # Basit YAML ayrıştırma (karmaşık yapılar için PyYAML kullanılmalı)
                for line in yaml_block.strip().split("\n"):
                    line = line.strip()
                    if ":" in line and not line.startswith("#"):
                        key, _, value = line.partition(":")
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if value:
                            metadata[key] = value

                logger.info(f"YAML metadata çıkarıldı: {list(metadata.keys())}")

        except FileNotFoundError:
            logger.error(f"Dosya bulunamadı: {file_path}")
        except Exception as e:
            logger.error(f"Metadata çıkarma hatası: {e}")

        return metadata

    @staticmethod
    def analyze_content(file_path: str) -> Dict[str, Any]:
        """
        Doküman içeriğini analiz eder.

        Returns:
            dict: {
                "has_math": bool,
                "has_citations": bool,
                "has_code_blocks": bool,
                "has_tables": bool,
                "has_images": bool,
                "heading_count": int,
                "max_heading_level": int,
                "word_count": int,
                "languages_detected": list  # kod blokları için
            }
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
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Matematik ifadeleri ($...$, $$...$$, \(...\), \[...\])
            analysis["has_math"] = bool(
                re.search(r'\$[^$]+\$|\$\$[^$]+\$\$|\\\(.*?\\\)|\\\[.*?\\\]', content)
            )

            # Atıflar (@cite_key, [@key], \cite{key})
            analysis["has_citations"] = bool(
                re.search(r'@[\w:-]+|\[@[\w:-]+\]|\\cite\{[\w,]+\}', content)
            )

            # Kod blokları (```)
            code_blocks = re.findall(r'```(\w*)', content)
            analysis["has_code_blocks"] = len(code_blocks) > 0
            analysis["languages_detected"] = list(set(
                lang for lang in code_blocks if lang
            ))

            # Tablolar (| --- |)
            analysis["has_tables"] = bool(
                re.search(r'\|.*\|.*\n\|[\s-:|]+\|', content)
            )

            # Görseller (![alt](url))
            analysis["has_images"] = bool(
                re.search(r'!\[.*?\]\(.*?\)', content)
            )

            # Başlıklar
            headings = re.findall(r'^(#{1,6})\s', content, re.MULTILINE)
            analysis["heading_count"] = len(headings)
            if headings:
                analysis["max_heading_level"] = min(len(h) for h in headings)

            # Kelime sayısı (yaklaşık)
            # YAML front-matter hariç
            text_content = re.sub(r'^---\s*\n.*?\n---\s*\n', '', content, flags=re.DOTALL)
            analysis["word_count"] = len(text_content.split())

        except FileNotFoundError:
            logger.error(f"Dosya bulunamadı: {file_path}")
        except Exception as e:
            logger.error(f"İçerik analizi hatası: {e}")

        return analysis

    @staticmethod
    def suggest_conversion_options(analysis: Dict[str, Any], target_format: str) -> Dict[str, Any]:
        """
        İçerik analizine dayalı olarak önerilen dönüşüm seçeneklerini döndürür.

        Returns:
            dict: Önerilen Pandoc parametreleri
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
                suggestions["math_rendering"] = "native"  # LaTeX doğal destek
            else:
                suggestions["math_rendering"] = "webtex"  # SVG fallback

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
