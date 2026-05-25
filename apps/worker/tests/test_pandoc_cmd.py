"""
Pandoc Orchestrator — Worker Unit Tests
PandocCommandBuilder ve diğer core modüllerin birim testleri.
"""

import pytest
from app.core.pandoc_cmd import PandocCommandBuilder
from app.core.engines import EngineRouter
from app.core.parser import DocumentParser
from app.agent.error_recovery import ErrorRecovery


class TestPandocCommandBuilder:
    """PandocCommandBuilder birim testleri."""

    def test_basic_command(self):
        """Temel komut oluşturma."""
        builder = PandocCommandBuilder("input.md", "output.pdf")
        cmd = builder.build()
        assert cmd[0] == "pandoc"
        assert "input.md" in cmd
        assert "-o" in cmd
        assert "output.pdf" in cmd

    def test_set_input_format(self):
        """Girdi formatı ayarlama."""
        builder = PandocCommandBuilder("input.md", "output.pdf")
        builder.set_input_format("markdown")
        cmd = builder.build()
        assert "--from=markdown" in cmd

    def test_set_output_format(self):
        """Çıktı formatı ayarlama."""
        builder = PandocCommandBuilder("input.md", "output.html")
        builder.set_output_format("html5")
        cmd = builder.build()
        assert "--to=html5" in cmd

    def test_add_engine(self):
        """PDF motoru ekleme."""
        builder = PandocCommandBuilder("input.md", "output.pdf")
        builder.add_engine("xelatex")
        cmd = builder.build()
        assert "--pdf-engine=xelatex" in cmd

    def test_invalid_engine_ignored(self):
        """Geçersiz motor sessizce yok sayılır."""
        builder = PandocCommandBuilder("input.md", "output.pdf")
        builder.add_engine("invalid_engine")
        cmd = builder.build()
        assert not any("--pdf-engine" in c for c in cmd)

    def test_citeproc(self):
        """Citeproc aktifleştirme."""
        builder = PandocCommandBuilder("input.md", "output.pdf")
        builder.enable_citeproc()
        cmd = builder.build()
        assert "--citeproc" in cmd

    def test_bibliography(self):
        """Kaynakça ekleme."""
        builder = PandocCommandBuilder("input.md", "output.pdf")
        builder.add_bibliography("refs.bib")
        cmd = builder.build()
        assert "--bibliography=refs.bib" in cmd

    def test_toc(self):
        """İçindekiler tablosu."""
        builder = PandocCommandBuilder("input.md", "output.pdf")
        builder.add_toc(depth=2)
        cmd = builder.build()
        assert "--toc" in cmd
        assert "--toc-depth=2" in cmd

    def test_reference_doc(self):
        """Referans doküman ekleme."""
        builder = PandocCommandBuilder("input.md", "output.docx")
        builder.add_reference_doc("template.docx")
        cmd = builder.build()
        assert "--reference-doc=template.docx" in cmd

    def test_lua_filter(self):
        """Lua filtresi ekleme."""
        builder = PandocCommandBuilder("input.md", "output.pdf")
        builder.add_lua_filter("style.lua")
        cmd = builder.build()
        assert "--lua-filter=style.lua" in cmd

    def test_extract_media(self):
        """Medya ayıklama."""
        builder = PandocCommandBuilder("input.docx", "output.md")
        builder.extract_media("./media")
        cmd = builder.build()
        assert "--extract-media=./media" in cmd

    def test_chaining(self):
        """Method chaining çalışıyor."""
        cmd = (
            PandocCommandBuilder("input.md", "output.pdf")
            .set_input_format("markdown")
            .add_engine("xelatex")
            .enable_citeproc()
            .add_bibliography("refs.bib")
            .enable_smart_typography()
            .add_toc()
            .build()
        )
        assert "--from=markdown" in cmd
        assert "--pdf-engine=xelatex" in cmd
        assert "--citeproc" in cmd
        assert "--bibliography=refs.bib" in cmd
        assert "--toc" in cmd

    def test_academic_pdf_scenario(self):
        """Akademik PDF senaryosu."""
        cmd = (
            PandocCommandBuilder("paper.md", "paper.pdf")
            .set_input_format("markdown")
            .add_engine("xelatex")
            .enable_citeproc()
            .add_bibliography("refs.bib")
            .add_csl_style("apa.csl")
            .set_variable("geometry", "margin=1in")
            .add_toc()
            .set_number_sections()
            .enable_smart_typography()
            .set_standalone()
            .build()
        )
        assert "--pdf-engine=xelatex" in cmd
        assert "--citeproc" in cmd
        assert "--bibliography=refs.bib" in cmd
        assert "--csl=apa.csl" in cmd
        assert "--toc" in cmd
        assert "--number-sections" in cmd
        assert "--standalone" in cmd

    def test_corporate_docx_scenario(self):
        """Kurumsal Word raporu senaryosu."""
        cmd = (
            PandocCommandBuilder("report.md", "report.docx")
            .set_input_format("markdown")
            .add_reference_doc("company_template.docx")
            .enable_smart_typography()
            .add_toc()
            .build()
        )
        assert "--reference-doc=company_template.docx" in cmd
        assert "--toc" in cmd

    def test_multiple_inputs(self):
        """Birden fazla girdi dosyası birleştirme."""
        builder = PandocCommandBuilder("ch1.md", "book.pdf")
        builder.add_extra_input("ch2.md")
        builder.add_extra_input("ch3.md")
        cmd = builder.build()
        assert "ch1.md" in cmd
        assert "ch2.md" in cmd
        assert "ch3.md" in cmd


class TestEngineRouter:
    """EngineRouter birim testleri."""

    def test_pdf_engines_defined(self):
        """PDF motorlarının tanımlı olduğunu doğrula."""
        assert len(EngineRouter.PDF_ENGINES) > 0
        assert "xelatex" in EngineRouter.PDF_ENGINES
        assert "typst" in EngineRouter.PDF_ENGINES
        assert "weasyprint" in EngineRouter.PDF_ENGINES

    def test_slide_engines_defined(self):
        """Slayt motorlarının tanımlı olduğunu doğrula."""
        assert len(EngineRouter.SLIDE_ENGINES) > 0
        assert "revealjs" in EngineRouter.SLIDE_ENGINES
        assert "pptx" in EngineRouter.SLIDE_ENGINES

    def test_all_engines_status(self):
        """Tüm motorların durumunu al."""
        status = EngineRouter.get_all_engines_status()
        assert "pdf_engines" in status
        assert "slide_engines" in status


class TestDocumentParser:
    """DocumentParser birim testleri."""

    def test_detect_markdown(self):
        """Markdown format algılama."""
        assert DocumentParser.detect_format("test.md") == "markdown"

    def test_detect_html(self):
        """HTML format algılama."""
        assert DocumentParser.detect_format("page.html") == "html"

    def test_detect_latex(self):
        """LaTeX format algılama."""
        assert DocumentParser.detect_format("paper.tex") == "latex"

    def test_detect_docx(self):
        """DOCX format algılama."""
        assert DocumentParser.detect_format("doc.docx") == "docx"

    def test_detect_unknown(self):
        """Bilinmeyen format."""
        result = DocumentParser.detect_format("file.xyz")
        assert result is None

    def test_suggest_pdf_options_with_math(self):
        """Matematik içerikli PDF önerileri."""
        analysis = {"has_math": True, "has_citations": False, "has_code_blocks": False, "heading_count": 2}
        suggestions = DocumentParser.suggest_conversion_options(analysis, "pdf")
        assert suggestions.get("engine") == "xelatex"

    def test_suggest_html_options_with_math(self):
        """Matematik içerikli HTML önerileri."""
        analysis = {"has_math": True, "has_citations": False, "has_code_blocks": False, "heading_count": 2}
        suggestions = DocumentParser.suggest_conversion_options(analysis, "html")
        assert suggestions.get("math_rendering") == "mathjax"

    def test_suggest_toc_for_many_headings(self):
        """Çok başlıklı doküman için TOC önerisi."""
        analysis = {"has_math": False, "has_citations": False, "has_code_blocks": False, "heading_count": 10}
        suggestions = DocumentParser.suggest_conversion_options(analysis, "pdf")
        assert suggestions.get("toc") is True


class TestErrorRecovery:
    """ErrorRecovery birim testleri."""

    def test_diagnose_missing_font(self):
        """Eksik font teşhisi."""
        error = "fontspec error: font 'Fira Sans' not found"
        diagnoses = ErrorRecovery.diagnose(error)
        assert len(diagnoses) > 0
        assert diagnoses[0].error_type == "missing_font"
        assert diagnoses[0].auto_fixable is True

    def test_diagnose_undefined_command(self):
        """Tanımsız komut teşhisi."""
        error = "! Undefined control sequence.\nl.42 \\newcommand"
        diagnoses = ErrorRecovery.diagnose(error)
        assert len(diagnoses) > 0
        assert diagnoses[0].error_type == "undefined_command"

    def test_diagnose_timeout(self):
        """Zaman aşımı teşhisi."""
        error = "Process timeout expired."
        diagnoses = ErrorRecovery.diagnose(error)
        assert len(diagnoses) > 0
        assert diagnoses[0].error_type == "timeout"

    def test_suggest_retry_engine_switch(self):
        """Motor değişikliği önerisi."""
        diagnoses = ErrorRecovery.diagnose("TeX capacity exceeded")
        retry = ErrorRecovery.suggest_retry_params(diagnoses, "xelatex")
        assert retry is not None
        assert "engine" in retry

    def test_suggest_retry_timeout(self):
        """Zaman aşımı artırma önerisi."""
        diagnoses = ErrorRecovery.diagnose("Process timeout expired")
        retry = ErrorRecovery.suggest_retry_params(diagnoses, timeout=120)
        assert retry is not None
        assert retry.get("timeout", 0) > 120

    def test_unknown_error(self):
        """Bilinmeyen hata."""
        diagnoses = ErrorRecovery.diagnose("Some completely random error xyz")
        assert len(diagnoses) > 0
        assert diagnoses[0].error_type == "unknown"
        assert diagnoses[0].auto_fixable is False
