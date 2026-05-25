"""
Pandoc Orchestrator — Dynamic CLI Command Builder
Builder Pattern ile güvenli Pandoc komut zincirleri oluşturur.
"""

import subprocess
import logging
from typing import List, Optional, Dict, Any
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


class PandocCommandBuilder:
    """
    Pandoc CLI komutlarını güvenli bir şekilde oluşturan ve çalıştıran Builder.

    Kullanım:
        result = (
            PandocCommandBuilder("input.md", "output.pdf")
            .set_input_format("markdown")
            .set_output_format("pdf")
            .add_engine("xelatex")
            .enable_citeproc()
            .add_bibliography("refs.bib")
            .add_csl_style("apa.csl")
            .enable_smart_typography()
            .add_toc()
            .execute()
        )
    """

    # İzin verilen PDF motorları
    VALID_PDF_ENGINES = {
        "xelatex", "pdflatex", "lualatex", "tectonic",
        "typst", "weasyprint", "prince", "context", "pdfroff",
        "wkhtmltopdf", "pagedjs-cli"
    }

    # İzin verilen çıktı formatları
    VALID_OUTPUT_FORMATS = {
        "pdf", "docx", "odt", "rtf", "html", "html5",
        "epub", "epub3", "fb2", "latex", "beamer",
        "pptx", "revealjs", "slidy", "slideous", "s5", "dzslides",
        "markdown", "gfm", "commonmark", "rst", "asciidoc",
        "mediawiki", "dokuwiki", "jira", "textile",
        "org", "texinfo", "man", "ms",
        "json", "native", "plain", "icml",
        "ipynb", "typst", "context"
    }

    # İzin verilen girdi formatları
    VALID_INPUT_FORMATS = {
        "markdown", "gfm", "commonmark", "commonmark_x",
        "html", "latex", "docx", "odt", "rtf", "epub",
        "rst", "asciidoc", "mediawiki", "dokuwiki",
        "jira", "textile", "org", "t2t", "twiki",
        "vimwiki", "json", "native", "csv", "tsv",
        "ipynb", "fb2", "man", "typst", "djot", "bibtex"
    }

    def __init__(self, input_path: str, output_path: str):
        self.input_path = input_path
        self.output_path = output_path
        self._cmd: List[str] = [settings.pandoc_path]
        self._input_files: List[str] = [input_path]
        self._options: List[str] = []
        self._output_set = False

    def set_input_format(self, fmt: str) -> "PandocCommandBuilder":
        """Girdi formatını belirtir (--from)."""
        if fmt in self.VALID_INPUT_FORMATS:
            self._options.extend([f"--from={fmt}"])
        else:
            logger.warning(f"Bilinmeyen girdi formatı: {fmt}")
        return self

    def set_output_format(self, fmt: str) -> "PandocCommandBuilder":
        """Çıktı formatını belirtir (--to)."""
        if fmt in self.VALID_OUTPUT_FORMATS:
            self._options.extend([f"--to={fmt}"])
        else:
            logger.warning(f"Bilinmeyen çıktı formatı: {fmt}")
        return self

    def add_engine(self, engine: str) -> "PandocCommandBuilder":
        """PDF motorunu belirtir (--pdf-engine)."""
        if engine in self.VALID_PDF_ENGINES:
            self._options.append(f"--pdf-engine={engine}")
        else:
            logger.warning(f"Bilinmeyen PDF motoru: {engine}")
        return self

    def add_reference_doc(self, ref_path: str) -> "PandocCommandBuilder":
        """Kurumsal şablon dosyası ekler (--reference-doc)."""
        if ref_path:
            self._options.append(f"--reference-doc={ref_path}")
        return self

    def add_template(self, template_path: str) -> "PandocCommandBuilder":
        """Özel şablon dosyası ekler (--template)."""
        if template_path:
            self._options.append(f"--template={template_path}")
        return self

    def add_lua_filter(self, filter_path: str) -> "PandocCommandBuilder":
        """Lua filtresi ekler (--lua-filter)."""
        if filter_path:
            self._options.append(f"--lua-filter={filter_path}")
        return self

    def add_python_filter(self, filter_path: str) -> "PandocCommandBuilder":
        """Python filtresi ekler (--filter)."""
        if filter_path:
            self._options.append(f"--filter={filter_path}")
        return self

    def add_bibliography(self, bib_path: str) -> "PandocCommandBuilder":
        """Kaynakça dosyası ekler (--bibliography)."""
        if bib_path:
            self._options.append(f"--bibliography={bib_path}")
        return self

    def add_csl_style(self, csl_path: str) -> "PandocCommandBuilder":
        """CSL atıf stili dosyası ekler (--csl)."""
        if csl_path:
            self._options.append(f"--csl={csl_path}")
        return self

    def enable_citeproc(self) -> "PandocCommandBuilder":
        """Atıf işlemcisini aktifleştirir (--citeproc)."""
        self._options.append("--citeproc")
        return self

    def enable_smart_typography(self) -> "PandocCommandBuilder":
        """Akıllı tipografiyi aktifleştirir (düz tırnaklar → eğri tırnaklar)."""
        # Pandoc 3.x+ sürümlerinde --smart parametresi kaldırılmıştır.
        # Bu yüzden --smart parametresini listede tutup build() aşamasında dinamik olarak +smart uzantısına çeviriyoruz.
        self._options.append("--smart")
        return self

    def add_toc(self, depth: int = 3) -> "PandocCommandBuilder":
        """İçindekiler tablosu ekler (--toc)."""
        self._options.append("--toc")
        self._options.append(f"--toc-depth={depth}")
        return self

    def set_standalone(self) -> "PandocCommandBuilder":
        """Bağımsız dosya çıktısı üretir (--standalone)."""
        self._options.append("--standalone")
        return self

    def set_variable(self, key: str, value: str) -> "PandocCommandBuilder":
        """Tek bir değişken ayarlar (-V key=value)."""
        self._options.append(f"-V {key}:{value}")
        return self

    def set_variables(self, variables: Dict[str, str]) -> "PandocCommandBuilder":
        """Birden fazla değişken ayarlar."""
        for key, value in variables.items():
            self._options.append(f"-V {key}:{value}")
        return self

    def set_metadata(self, key: str, value: str) -> "PandocCommandBuilder":
        """Metadata değeri ayarlar (-M key=value)."""
        self._options.append(f"-M {key}={value}")
        return self

    def extract_media(self, media_dir: str) -> "PandocCommandBuilder":
        """Medya ayıklama dizinini belirtir (--extract-media)."""
        self._options.append(f"--extract-media={media_dir}")
        return self

    def add_extra_input(self, file_path: str) -> "PandocCommandBuilder":
        """Birleştirme için ek girdi dosyası ekler."""
        self._input_files.append(file_path)
        return self

    def set_highlight_style(self, style: str = "pygments") -> "PandocCommandBuilder":
        """Kod renklendirme stilini belirtir."""
        self._options.append(f"--highlight-style={style}")
        return self

    def set_math_rendering(self, method: str = "mathjax") -> "PandocCommandBuilder":
        """Matematik işleme yöntemini belirtir."""
        valid_methods = {"mathjax", "katex", "mathml", "gladtex", "webtex"}
        if method in valid_methods:
            self._options.append(f"--{method}")
        return self

    def set_number_sections(self) -> "PandocCommandBuilder":
        """Bölüm numaralandırmasını aktifleştirir."""
        self._options.append("--number-sections")
        return self

    def set_slide_level(self, level: int = 2) -> "PandocCommandBuilder":
        """Slayt bölüm seviyesini belirtir."""
        self._options.append(f"--slide-level={level}")
        return self

    def add_custom_args(self, args: List[str]) -> "PandocCommandBuilder":
        """Özel argümanlar ekler."""
        self._options.extend(args)
        return self

    def build(self) -> List[str]:
        """Tam komutu döndürür (çalıştırmadan)."""
        cmd = list(self._cmd)
        cmd.extend(self._input_files)
        
        # Pandoc 3.x+ smart typography (--smart kaldırıldı, +smart uzantısı kullanılmalı)
        options = []
        has_smart = False
        from_format = None
        
        for opt in self._options:
            if opt == "--smart":
                has_smart = True
            elif opt.startswith("--from="):
                from_format = opt.split("=", 1)[1]  # Correctly extract format
                options.append(opt)
            else:
                options.append(opt)
                
        # Smart typography işleme (Pandoc 3.x+ uyumluluğu)
        if has_smart:
            if from_format and not from_format.endswith("+smart"):
                # Mevcut from format'ına +smart ekle
                for i, opt in enumerate(options):
                    if opt.startswith("--from="):
                        options[i] = f"--from={from_format}+smart"
                        break
            elif not from_format:
                # --from belirtilmemişse varsayılan markdown+smart ekle
                options.append("--from=markdown+smart")
                
        cmd.extend(options)
        cmd.extend(["-o", self.output_path])
        return cmd

    def execute(self, timeout: Optional[int] = None) -> Dict[str, Any]:
        """
        Komutu güvenli bir şekilde çalıştırır.

        Returns:
            dict: {"status": "success"|"error", "stdout": str, "stderr": str, "cmd": str, "execution_time_ms": int}
        """
        import time

        cmd = self.build()
        effective_timeout = timeout or settings.max_timeout

        logger.info(f"Pandoc komutu çalıştırılıyor: {' '.join(cmd)}")

        start_time = time.time()

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=effective_timeout
            )
            elapsed_ms = int((time.time() - start_time) * 1000)

            logger.info(f"Dönüşüm başarılı ({elapsed_ms}ms)")

            return {
                "status": "success",
                "stdout": result.stdout,
                "stderr": result.stderr,
                "cmd": " ".join(cmd),
                "execution_time_ms": elapsed_ms
            }

        except subprocess.CalledProcessError as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Pandoc hatası: {e.stderr}")

            return {
                "status": "error",
                "stdout": e.stdout or "",
                "stderr": e.stderr or "",
                "cmd": " ".join(cmd),
                "execution_time_ms": elapsed_ms
            }

        except subprocess.TimeoutExpired:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Pandoc zaman aşımı ({effective_timeout}s)")

            return {
                "status": "error",
                "stdout": "",
                "stderr": f"İşlem zaman aşımına uğradı ({effective_timeout} saniye).",
                "cmd": " ".join(cmd),
                "execution_time_ms": elapsed_ms
            }

        except FileNotFoundError:
            return {
                "status": "error",
                "stdout": "",
                "stderr": f"Pandoc bulunamadı: {settings.pandoc_path}. Pandoc'un kurulu olduğundan emin olun.",
                "cmd": " ".join(cmd),
                "execution_time_ms": 0
            }
