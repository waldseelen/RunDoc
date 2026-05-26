"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Zap,
  FileText,
  FileUp,
  PenLine,
  Download,
  Eye,
  Loader2,
  CheckCircle2,
  Shield,
  Globe,
  Sun,
  Moon,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Clock,
  FileCode,
  AlertCircle,
  ChevronDown,
  Trash2,
  Upload,
} from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import BrandLogo from "@/components/brand-logo";
import Uploader from "@/components/uploader";

// Monaco Editor'ü SSR devre dışı bırakarak yükle
const CodeEditor = dynamic(() => import("@/components/editor"), { ssr: false });

// =============================================
// Format & Engine Data
// =============================================

const OUTPUT_FORMATS = [
  { value: "pdf", label: "📕 PDF", group: "Doküman" },
  { value: "docx", label: "📄 Word (.docx)", group: "Doküman" },
  { value: "html", label: "🌐 HTML5", group: "Web" },
  { value: "epub", label: "📚 EPUB eBook", group: "Yayıncılık" },
  { value: "pptx", label: "📊 PowerPoint", group: "Sunum" },
  { value: "odt", label: "📄 OpenDocument", group: "Doküman" },
  { value: "latex", label: "📐 LaTeX", group: "Akademik" },
  { value: "typst", label: "📐 Typst", group: "Akademik" },
  { value: "revealjs", label: "📊 reveal.js Slayt", group: "Sunum" },
  { value: "markdown", label: "📝 Markdown", group: "Markup" },
  { value: "rst", label: "📝 reStructuredText", group: "Markup" },
  { value: "rtf", label: "📄 Rich Text", group: "Doküman" },
  { value: "plain", label: "📋 Düz Metin", group: "Veri" },
];

const OUTPUT_EXT_MAP: Record<string, string> = {
  pdf: "pdf", docx: "docx", odt: "odt", html: "html",
  html5: "html", epub: "epub", epub3: "epub", latex: "tex",
  pptx: "pptx", revealjs: "html", beamer: "pdf",
  markdown: "md", gfm: "md", rst: "rst", json: "json",
  plain: "txt", rtf: "rtf", typst: "typ",
};

const DEFAULT_MARKDOWN = `# Merhaba Dünya! 🌍

Bu belge **RunDoc** ile dönüştürülecektir.

## Matematiksel Formül

$$E = mc^2$$

## Özellikler

- ⚡ **Hızlı:** Saniyeler içinde dönüşüm
- 🔒 **Güvenli:** Dosyalar sunucuda saklanmaz
- 🆓 **Ücretsiz:** Hesap gerektirmez

## Kod Örneği

\`\`\`python
def merhaba():
    print("RunDoc ile dönüştürüldü!")
\`\`\`

| Format | Destek |
|--------|--------|
| PDF    | ✅     |
| DOCX   | ✅     |
| HTML   | ✅     |
| EPUB   | ✅     |
`;

type InputMode = "editor" | "upload";
type ConversionState = "idle" | "converting" | "completed" | "failed";

export default function HomePage() {
  const { theme, language, toggleTheme, toggleLanguage, t, mounted } = useAppSettings();

  // Input State
  const [inputMode, setInputMode] = useState<InputMode>("editor");
  const [editorContent, setEditorContent] = useState(DEFAULT_MARKDOWN);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Conversion State
  const [outputFormat, setOutputFormat] = useState("pdf");
  const [conversionState, setConversionState] = useState<ConversionState>("idle");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [executionTimeMs, setExecutionTimeMs] = useState<number | undefined>(undefined);
  const [progress, setProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced options
  const [engine, setEngine] = useState("typst");
  const [toc, setToc] = useState(false);
  const [smart, setSmart] = useState(true);
  const [standalone, setStandalone] = useState(true);

  const handleFilesSelected = useCallback((files: File[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Progress animation
  const startProgress = useCallback(() => {
    setProgress(5);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        const increment = prev < 50 ? 8 : prev < 75 ? 4 : 1.5;
        return Math.min(prev + increment, 95);
      });
    }, 250);
    return interval;
  }, []);

  // Convert handler
  const handleConvert = useCallback(async () => {
    setConversionState("converting");
    setErrorMessage("");
    setOutputUrl(null);
    setExecutionTimeMs(undefined);

    const progressInterval = startProgress();

    try {
      const formData = new FormData();

      if (inputMode === "upload" && uploadedFiles.length > 0) {
        formData.append("file", uploadedFiles[0]);
      } else {
        formData.append("text", editorContent);
      }

      formData.append("output_format", outputFormat);
      formData.append("engine", engine);
      formData.append("toc", toc ? "true" : "false");
      formData.append("smart", smart ? "true" : "false");
      formData.append("standalone", standalone ? "true" : "false");
      formData.append("math_rendering", "mathjax");

      const response = await fetch(`${process.env.NEXT_PUBLIC_WORKER_API_URL || "http://localhost:8000"}/api/v1/convert-direct`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Dönüşüm başarısız: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      if (result.status === "completed") {
        setProgress(100);
        setConversionState("completed");
        setOutputUrl(result.output_url);
        setExecutionTimeMs(result.execution_time_ms);
      } else {
        setConversionState("failed");
        setErrorMessage(result.error_message || "Derleme hatası oluştu.");
        setProgress(0);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setConversionState("failed");
      setErrorMessage(err.message || "Bağlantı hatası: Python worker ayakta mı?");
      setProgress(0);
    }
  }, [editorContent, inputMode, uploadedFiles, outputFormat, engine, toc, smart, standalone, startProgress]);

  // Reset
  const handleReset = useCallback(() => {
    setConversionState("idle");
    setOutputUrl(null);
    setErrorMessage("");
    setProgress(0);
    setExecutionTimeMs(undefined);
  }, []);

  // Preview checks
  const isPDF = outputFormat === "pdf" || outputFormat === "beamer";
  const isHTML = ["html", "html5", "revealjs"].includes(outputFormat);
  const canPreview = (isPDF || isHTML) && outputUrl;

  const hasInput = inputMode === "upload" ? uploadedFiles.length > 0 : editorContent.trim().length > 0;

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col text-[var(--foreground)] transition-colors duration-200" style={{ background: "var(--background)" }}>
      {/* Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)", zIndex: 0 }} />

      {/* Top Navigation */}
      <header className="relative z-20 px-6 py-3 border-b border-[var(--border)] bg-[var(--background-secondary)]/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size={28} />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold tracking-tight">RunDoc</span>
            <span className="text-[10px] text-[var(--foreground-muted)]">
              {language === "tr" ? "Ücretsiz Doküman Dönüştürücü" : "Free Document Converter"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer" title={theme === "dark" ? "Light Mode" : "Dark Mode"}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={toggleLanguage} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer" title={language === "tr" ? "English" : "Türkçe"}>
            <Globe size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto px-6 py-10 space-y-8">

          {/* Hero */}
          <div className="text-center space-y-4 animate-fade-in">
            <div className="flex items-center justify-center gap-3">
              <BrandLogo size={48} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {language === "tr" ? "Dosyalarınızı Anında Dönüştürün" : "Convert Your Files Instantly"}
            </h1>
            <p className="text-sm text-[var(--foreground-secondary)] max-w-xl mx-auto leading-relaxed">
              {language === "tr"
                ? "40+ format arasında ücretsiz, güvenli ve hızlı dönüşüm. Kayıt gerektirmez. Dosyalarınız sunucuda saklanmaz."
                : "Free, secure & fast conversion between 40+ formats. No sign-up required. Your files are never stored."}
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--foreground-muted)]">
                <Shield size={13} className="text-[var(--success)]" />
                <span>{language === "tr" ? "Dosyalar saklanmaz" : "Files never stored"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--foreground-muted)]">
                <Zap size={13} className="text-[var(--warning)]" />
                <span>{language === "tr" ? "Anında dönüşüm" : "Instant conversion"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--foreground-muted)]">
                <Sparkles size={13} className="text-[var(--accent)]" />
                <span>{language === "tr" ? "40+ format" : "40+ formats"}</span>
              </div>
            </div>
          </div>

          {/* Main Converter Card */}
          <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>

            {/* Step 1: Input Mode Tabs */}
            <div className="p-4 border-b border-[var(--border)] bg-[var(--background-secondary)]/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex bg-[var(--background-tertiary)] p-0.5 rounded-lg border border-[var(--border)]">
                  <button
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      inputMode === "editor"
                        ? "bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-sm"
                        : "text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] border border-transparent"
                    }`}
                    onClick={() => setInputMode("editor")}
                    id="tab-editor"
                  >
                    <PenLine size={13} />
                    {language === "tr" ? "Editör" : "Editor"}
                  </button>
                  <button
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      inputMode === "upload"
                        ? "bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-sm"
                        : "text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] border border-transparent"
                    }`}
                    onClick={() => setInputMode("upload")}
                    id="tab-upload"
                  >
                    <FileUp size={13} />
                    {language === "tr" ? "Dosya Yükle" : "Upload File"}
                  </button>
                </div>
              </div>

              {/* Format Selector */}
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] hidden sm:block">
                  {language === "tr" ? "Çıktı:" : "Output:"}
                </label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="select-field text-xs h-9 min-w-[160px]"
                  id="output-format-select"
                >
                  {OUTPUT_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Input Area */}
            <div className="relative" style={{ minHeight: inputMode === "editor" ? "360px" : "auto" }}>
              {inputMode === "editor" ? (
                <div style={{ height: "360px" }}>
                  <CodeEditor
                    value={editorContent}
                    onChange={setEditorContent}
                    language="markdown"
                    height="100%"
                  />
                </div>
              ) : (
                <div className="p-8 space-y-4">
                  <Uploader
                    onFilesSelected={handleFilesSelected}
                    accept=".md,.markdown,.tex,.docx,.doc,.html,.htm,.epub,.rst,.adoc,.org,.json,.csv,.bib,.odt,.rtf,.txt,.ipynb,.typ,.pptx"
                    maxSizeMB={50}
                    multiple={false}
                    label={language === "tr" ? "Dosyaları sürükleyin veya tıklayarak seçin" : "Drag files here or click to browse"}
                  />

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={14} className="text-[var(--accent)] flex-shrink-0" />
                            <span className="font-medium text-[var(--foreground)] truncate">{file.name}</span>
                            <span className="text-[10px] text-[var(--foreground-muted)] font-mono flex-shrink-0">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(idx)}
                            className="p-1.5 rounded-md hover:bg-[var(--error-bg)] text-[var(--foreground-muted)] hover:text-[var(--error)] transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Advanced Options Toggle */}
            <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--background-secondary)]/30">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-[11px] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <ChevronDown size={12} style={{ transform: showAdvanced ? "rotate(180deg)" : "rotate(0)", transition: "transform 200ms" }} />
                {language === "tr" ? "Gelişmiş Seçenekler" : "Advanced Options"}
              </button>

              {showAdvanced && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up">
                  {outputFormat === "pdf" && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                        {language === "tr" ? "PDF Motoru" : "PDF Engine"}
                      </label>
                      <select value={engine} onChange={(e) => setEngine(e.target.value)} className="select-field text-xs w-full h-8">
                        <option value="typst">⚡ Typst (Hızlı)</option>
                        <option value="xelatex">📐 XeLaTeX</option>
                        <option value="weasyprint">🌐 WeasyPrint</option>
                      </select>
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-[11px] text-[var(--foreground-secondary)] cursor-pointer">
                    <input type="checkbox" checked={toc} onChange={(e) => setToc(e.target.checked)} className="accent-[var(--accent)]" />
                    {language === "tr" ? "İçindekiler" : "Table of Contents"}
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-[var(--foreground-secondary)] cursor-pointer">
                    <input type="checkbox" checked={smart} onChange={(e) => setSmart(e.target.checked)} className="accent-[var(--accent)]" />
                    {language === "tr" ? "Akıllı Tipografi" : "Smart Typography"}
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-[var(--foreground-secondary)] cursor-pointer">
                    <input type="checkbox" checked={standalone} onChange={(e) => setStandalone(e.target.checked)} className="accent-[var(--accent)]" />
                    {language === "tr" ? "Bağımsız Dosya" : "Standalone"}
                  </label>
                </div>
              )}
            </div>

            {/* Convert Button Bar */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--background-secondary)]/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleConvert}
                  disabled={conversionState === "converting" || !hasInput}
                  className="btn-primary flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2.5 cursor-pointer font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  id="convert-button"
                >
                  {conversionState === "converting" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{language === "tr" ? "Dönüştürülüyor..." : "Converting..."}</span>
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      <span>{language === "tr" ? "Dönüştür" : "Convert"}</span>
                    </>
                  )}
                </button>

                {conversionState === "completed" && (
                  <button
                    onClick={handleReset}
                    className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                    title={language === "tr" ? "Yeni Dönüşüm" : "New Conversion"}
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              {conversionState === "converting" && (
                <div className="progress-bar mt-3">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          </div>

          {/* Result Section */}
          {conversionState === "completed" && outputUrl && (
            <div className="space-y-4 animate-slide-up">
              {/* Success Banner + Download */}
              <div className="glass-card p-5 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-bg)]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--success-bg)] border border-[var(--success)]/20 text-[var(--success)] flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {language === "tr" ? "Başarıyla Dönüştürüldü!" : "Successfully Converted!"}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-[var(--foreground-muted)] mt-0.5">
                      {executionTimeMs && (
                        <span className="flex items-center gap-1"><Clock size={10} /> {(executionTimeMs / 1000).toFixed(1)}s</span>
                      )}
                      <span className="flex items-center gap-1"><FileCode size={10} /> {outputFormat.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canPreview && (
                    <a
                      href={outputUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-4 rounded-lg border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--foreground-secondary)] flex items-center gap-1.5 transition-colors"
                      style={{ textDecoration: "none" }}
                    >
                      <Eye size={14} />
                      {language === "tr" ? "Yeni Sekmede Aç" : "Open in Tab"}
                    </a>
                  )}
                  <a
                    href={outputUrl}
                    download={`converted.${OUTPUT_EXT_MAP[outputFormat] || outputFormat}`}
                    className="btn-primary py-2.5 px-5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    style={{ textDecoration: "none" }}
                    id="download-button"
                  >
                    <Download size={14} />
                    {language === "tr" ? "İndir" : "Download"}
                  </a>
                </div>
              </div>

              {/* Inline Preview (for PDF/HTML) */}
              {canPreview && (
                <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
                  <div className="p-3 border-b border-[var(--border)] bg-[var(--background-secondary)]/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye size={12} className="text-[var(--foreground-muted)]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                        {language === "tr" ? "Önizleme" : "Preview"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                        {outputFormat.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <iframe
                    src={outputUrl}
                    className="w-full border-0 bg-white"
                    style={{ height: "600px" }}
                    title="Document Preview"
                    sandbox="allow-scripts allow-same-origin"
                    id="preview-iframe"
                  />
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {conversionState === "failed" && (
            <div className="glass-card p-6 rounded-2xl border border-[var(--error)]/15 animate-slide-up space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--error-bg)] text-[var(--error)] flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {language === "tr" ? "Dönüşüm Hatası" : "Conversion Error"}
                  </p>
                  {errorMessage && (
                    <pre className="mt-2 p-3 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)] text-[10px] font-mono text-[var(--foreground-secondary)] overflow-auto max-h-[150px] whitespace-pre-wrap">
                      {errorMessage}
                    </pre>
                  )}
                </div>
              </div>
              <button
                onClick={handleReset}
                className="btn-primary py-2.5 px-5 text-xs rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw size={12} />
                {language === "tr" ? "Tekrar Dene" : "Try Again"}
              </button>
            </div>
          )}

          {/* How it Works Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="glass-card p-5 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mx-auto">
                <Upload size={18} />
              </div>
              <h3 className="text-xs font-bold text-[var(--foreground)]">
                {language === "tr" ? "1. Yükle veya Yaz" : "1. Upload or Write"}
              </h3>
              <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                {language === "tr" ? "Markdown, LaTeX, Word veya diğer desteklenen formatları yükleyin." : "Upload Markdown, LaTeX, Word or other supported formats."}
              </p>
            </div>
            <div className="glass-card p-5 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
                <Zap size={18} />
              </div>
              <h3 className="text-xs font-bold text-[var(--foreground)]">
                {language === "tr" ? "2. Dönüştür" : "2. Convert"}
              </h3>
              <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                {language === "tr" ? "Çıktı formatını seçin ve anında dönüştürün." : "Choose output format and convert instantly."}
              </p>
            </div>
            <div className="glass-card p-5 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <Download size={18} />
              </div>
              <h3 className="text-xs font-bold text-[var(--foreground)]">
                {language === "tr" ? "3. İndir" : "3. Download"}
              </h3>
              <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                {language === "tr" ? "Dosyanızı indirin. 30 dakika sonra otomatik silinir." : "Download your file. Auto-deleted after 30 minutes."}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 border-t border-[var(--border)] bg-[var(--background-secondary)]/20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-[var(--foreground-muted)]">
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-[var(--success)]" />
            <p>RunDoc · {language === "tr" ? "Dosyalarınız sunucuda saklanmaz" : "Your files are never stored"} · Powered by Pandoc</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/support" className="hover:text-[var(--foreground)] transition-colors">{language === "tr" ? "Destek" : "Support"}</Link>
            <Link href="/api-docs" className="hover:text-[var(--foreground)] transition-colors">API</Link>
            <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">{language === "tr" ? "Kullanım Koşulları" : "Terms"}</Link>
            <Link href="/terms#privacy" className="hover:text-[var(--foreground)] transition-colors font-semibold">{language === "tr" ? "Gizlilik" : "Privacy"}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
