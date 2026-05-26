import os
import tempfile
import pytest
from app.agent.orchestrator import AgentOrchestrator, ConversionPlan
from app.core.parser import DocumentParser
from app.core.engines import EngineRouter


def test_orchestrator_dependency_injection():
    """Bağımlılık enjeksiyonu (Dependency Injection) özelliğini test eder."""
    mock_parser = DocumentParser()
    orchestrator = AgentOrchestrator(parser=mock_parser)
    assert orchestrator.parser is mock_parser


def test_orchestrator_single_io_read():
    """Bellek içi (in-memory) tampon kullanımı ile mükerrer I/O okuma optimizasyonunu test eder."""
    orchestrator = AgentOrchestrator()

    with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8") as tmp:
        tmp.write("---\ntitle: Test\nbibliography: refs.bib\n---\n# Giriş\nMatematik: $x^2$\nAtıf: @ref1\n")
        tmp_name = tmp.name

    try:
        # Tek okumada planlama yap
        plan = orchestrator.analyze_and_plan(tmp_name, "html")
        assert plan.input_format == "markdown"
        assert plan.citeproc is True
        assert plan.math_rendering == "mathjax"
    finally:
        os.remove(tmp_name)


def test_citeproc_not_enabled_without_bibliography_source():
    """Atıf tespit edilse bile bibliography/references kaynağı yoksa citeproc açılmamalı."""
    orchestrator = AgentOrchestrator()

    with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8") as tmp:
        tmp.write("# Atıf Testi\nBu bir atıf: @key1\n")
        tmp_name = tmp.name

    try:
        plan = orchestrator.analyze_and_plan(tmp_name, "html")
        assert plan.citeproc is False
        assert any("citeproc" in w.lower() for w in plan.warnings)
    finally:
        os.remove(tmp_name)


def test_path_traversal_sanitization():
    """Şüpheli ve zararlı yol geçişi (Path Traversal) denemelerinin sanitasyonunu test eder."""
    orchestrator = AgentOrchestrator()
    
    with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8") as tmp:
        tmp.write("# Test")
        tmp_name = tmp.name

    try:
        base_dir = os.path.dirname(os.path.abspath(tmp_name))
        
        # Güvenlik zafiyetli yol girdileri
        user_prefs = {
            "bibliography": "../../../etc/passwd",
            "csl_style": "/absolute/path/to/malicious.csl",
            "reference_doc": "sub/../../secret.docx",
            "filters": ["../../attack.lua"]
        }
        
        plan = orchestrator.analyze_and_plan(tmp_name, "html", user_preferences=user_prefs)
        
        # Değerlerin güvenli dizine çözümlenip çözümlenmediğini denetle
        assert ".." not in plan.bibliography
        assert "passwd" in plan.bibliography
        assert plan.bibliography.startswith(base_dir)
        
        assert ".." not in plan.reference_doc
        assert "secret.docx" in plan.reference_doc
        assert plan.reference_doc.startswith(base_dir)
        
        assert len(plan.filters) == 1
        assert ".." not in plan.filters[0]
        assert "attack.lua" in plan.filters[0]
        assert plan.filters[0].startswith(base_dir)

    finally:
        os.remove(tmp_name)


def test_dos_memory_limits_toc_depth():
    """Çok yüksek toc_depth değerlerinin OOM/DoS koruması sınırlandırmasını test eder."""
    orchestrator = AgentOrchestrator()
    
    with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8") as tmp:
        tmp.write("# H1\n## H2\n### H3")
        tmp_name = tmp.name

    try:
        # toc_depth aşırı yüksek verilirse varsayılan 3 limitine çekilmeli
        user_prefs = {"toc": True, "toc_depth": 99999}
        plan = orchestrator.analyze_and_plan(tmp_name, "html", user_preferences=user_prefs)
        assert plan.toc_depth == 3

        # Geçersiz karakter veya tip durumunda varsayılan 3 verilmeli
        user_prefs_invalid = {"toc": True, "toc_depth": "invalid_value"}
        plan_invalid = orchestrator.analyze_and_plan(tmp_name, "html", user_preferences=user_prefs_invalid)
        assert plan_invalid.toc_depth == 3

    finally:
        os.remove(tmp_name)


def test_engine_mismatch_and_fallbacks():
    """Kurulu olmayan motor atamalarında otomatik PDF/Slayt fallback algoritmalarını doğrular."""
    orchestrator = AgentOrchestrator()
    
    with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8") as tmp:
        tmp.write("# Slayt İçeriği")
        tmp_name = tmp.name

    try:
        # Sistemde kurulu olmayan hayali bir PDF motoru talep et
        user_prefs = {"engine": "non-existent-compiler"}
        plan = orchestrator.analyze_and_plan(tmp_name, "pdf", user_preferences=user_prefs)
        
        # Motor otomatik olarak kurulu olan bir motora düşürülmeli veya HTML çıkışına düşmeli
        assert plan.engine != "non-existent-compiler"
        assert plan.engine is None or EngineRouter.check_engine_availability(plan.engine)

    finally:
        os.remove(tmp_name)


def test_dynamic_workdir_media_extraction():
    """extract_media dizininin static relative yerine dinamik UUID tabanlı iş akışı dizinine atandığını doğrular."""
    orchestrator = AgentOrchestrator()

    plan = ConversionPlan(
        input_format="markdown",
        output_format="pdf",
        extract_media=True
    )

    with tempfile.TemporaryDirectory() as temp_dir:
        output_path = os.path.join(temp_dir, "my_job_folder", "compiled_output.pdf")

        # Komutu inşa et
        builder = orchestrator.build_command(plan, "input.md", output_path)

        # extract_media dizininin relative ./extracted_media değil,
        # output_path'in parent dizinindeki extracted_media olması gerekir
        expected_dir = os.path.join(os.path.dirname(os.path.abspath(output_path)), "extracted_media")
        cmd_list = builder.build()
        assert f"--extract-media={expected_dir}" in cmd_list


def test_rejects_non_string_variables_map_values():
    """variables alanında string dışı değerler açık hata ile reddedilmeli."""
    orchestrator = AgentOrchestrator()

    with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8") as tmp:
        tmp.write("# Test")
        tmp_name = tmp.name

    try:
        with pytest.raises(ValueError):
            orchestrator.analyze_and_plan(
                tmp_name,
                "html",
                user_preferences={"variables": {"author": ["Yazar 1", "Yazar 2"]}},
            )
    finally:
        os.remove(tmp_name)


def test_sanitizes_highlight_and_math_options_with_invisible_whitespace():
    """Görünmez/trailing whitespace içeren seçenekler normalize edilmeli."""
    orchestrator = AgentOrchestrator()

    with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8") as tmp:
        tmp.write("# Başlık\n```python\nprint('x')\n```\n$E=mc^2$")
        tmp_name = tmp.name

    try:
        plan = orchestrator.analyze_and_plan(
            tmp_name,
            "html",
            user_preferences={
                "highlight_style": "  pygments\u200b  ",
                "math_rendering": "  MathJax\u200b ",
            },
        )
        assert plan.highlight_style == "pygments"
        assert plan.math_rendering == "mathjax"
    finally:
        os.remove(tmp_name)
