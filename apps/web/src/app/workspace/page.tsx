"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Zap,
  FileText,
  FileUp,
  PenLine,
  Download,
  Eye,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Globe,
  Sun,
  Moon,
  AlertCircle,
  Trash2,
  Settings2
} from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import BrandLogo from "@/components/brand-logo";
import Uploader from "@/components/uploader";

const CodeEditor = dynamic(() => import("@/components/editor"), { ssr: false });

const OUTPUT_FORMATS = [
  { value: "pdf", labelTr: "PDF", labelEn: "PDF" },
  { value: "docx", labelTr: "Word (.docx)", labelEn: "Word (.docx)" },
  { value: "html", labelTr: "HTML5", labelEn: "HTML5" },
  { value: "epub", labelTr: "EPUB e-Kitap", labelEn: "EPUB eBook" },
  { value: "latex", labelTr: "LaTeX", labelEn: "LaTeX" },
  { value: "typst", labelTr: "Typst", labelEn: "Typst" },
  { value: "markdown", labelTr: "Markdown", labelEn: "Markdown" },
];

const OUTPUT_EXT_MAP: Record<string, string> = {
  pdf: "pdf", docx: "docx", html: "html",
  epub: "epub", latex: "tex", markdown: "md", typst: "typ",
};

const DEFAULT_MARKDOWN = `# RunDoc Workspace

Write on the left, keep conversion settings in the middle, and preview on the right.

$$E = mc^2$$

\`\`\`python
print("Hello World")
\`\`\`
`;

type InputMode = "editor" | "upload";
type ConversionState = "idle" | "converting" | "completed" | "failed";

export default function WorkspacePage() {
  const { theme, language, toggleTheme, toggleLanguage, mounted, t } = useAppSettings();

  const [inputMode, setInputMode] = useState<InputMode>("editor");
  const [editorContent, setEditorContent] = useState(DEFAULT_MARKDOWN);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const [outputFormat, setOutputFormat] = useState("pdf");
  const [conversionState, setConversionState] = useState<ConversionState>("idle");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [executionTimeMs, setExecutionTimeMs] = useState<number | undefined>(undefined);
  const [progress, setProgress] = useState(0);

  // Advanced options (Now inline)
  const [engine, setEngine] = useState("typst");
  const [toc, setToc] = useState(false);
  const [smart, setSmart] = useState(true);
  const [standalone, setStandalone] = useState(true);
  const [mathRendering, setMathRendering] = useState("mathjax");
  const [highlightStyle, setHighlightStyle] = useState("pygments");
  const [citeproc, setCiteproc] = useState(false);
  const [tocDepth, setTocDepth] = useState(3);
  const [numberSections, setNumberSections] = useState(false);
  const [extractMedia, setExtractMedia] = useState(false);
  const [cslStyle, setCslStyle] = useState("");

  const handleFilesSelected = useCallback((files: File[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

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

  const handleConvert = useCallback(async () => {
    setConversionState("converting");
    setErrorMessage("");
    setOutputUrl(null);
    // Revoke old blob URL to free memory
    setPreviewBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
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
      formData.append("toc_depth", String(tocDepth));
      formData.append("smart", smart ? "true" : "false");
      formData.append("number_sections", numberSections ? "true" : "false");
      formData.append("standalone", standalone ? "true" : "false");
      formData.append("math_rendering", mathRendering);
      formData.append("citeproc", citeproc ? "true" : "false");
      if (cslStyle) {
        formData.append("csl_style", cslStyle);
      }
      formData.append("highlight_style", highlightStyle);
      formData.append("extract_media", extractMedia ? "true" : "false");

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
        // Fetch output as blob for CORS-safe iframe preview
        try {
          const blobRes = await fetch(result.output_url);
          if (blobRes.ok) {
            const blob = await blobRes.blob();
            setPreviewBlobUrl(URL.createObjectURL(blob));
          }
        } catch {
          // Preview fetch failed — download link still works
        }
      } else {
        setConversionState("failed");
        setErrorMessage(result.error_message || "Derleme hatası oluştu.");
        setProgress(0);
      }
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setConversionState("failed");
      const message = err instanceof Error ? err.message : "Bağlantı hatası: Python worker ayakta mı?";
      setErrorMessage(message);
      setProgress(0);
    }
  }, [
    editorContent,
    inputMode,
    uploadedFiles,
    outputFormat,
    engine,
    toc,
    tocDepth,
    smart,
    numberSections,
    standalone,
    mathRendering,
    citeproc,
    cslStyle,
    highlightStyle,
    extractMedia,
    startProgress,
  ]);

  const isPDF = outputFormat === "pdf";
  const isHTML = ["html", "html5", "revealjs"].includes(outputFormat);
  const canPreview = (isPDF || isHTML) && outputUrl;
  const hasInput = inputMode === "upload" ? uploadedFiles.length > 0 : editorContent.trim().length > 0;

  if (!mounted) return null;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-[var(--foreground)] bg-[var(--background)]">
      {/* Top Bar */}
      <header className="h-12 flex-shrink-0 px-5 border-b border-[var(--border)] bg-[var(--background-secondary)] flex items-center justify-between z-20">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <BrandLogo size={20} />
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-tight">RunDoc</span>
            <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider font-semibold">Workspace</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-1.5 rounded text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors">
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={toggleLanguage} className="p-1.5 rounded text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors">
            <Globe size={14} />
          </button>
        </div>
      </header>

      {/* Control Strip */}
      <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--surface)] z-10 shadow-sm px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-4 min-w-max flex-nowrap">
          {/* Input Mode Tabs */}
          <div className="flex bg-[var(--background)] p-1 rounded-md border border-[var(--border)] h-[32px] items-center">
            <button
              className={`flex items-center gap-1.5 px-3 h-full rounded-sm text-[11px] font-semibold transition-colors ${
                inputMode === "editor"
                  ? "bg-[var(--surface-hover)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
              onClick={() => setInputMode("editor")}
            >
              <PenLine size={12} /> {t("editor_tab")}
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 h-full rounded-sm text-[11px] font-semibold transition-colors ${
                inputMode === "upload"
                  ? "bg-[var(--surface-hover)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
              onClick={() => setInputMode("upload")}
            >
              <FileUp size={12} /> {t("upload_tab")}
            </button>
          </div>

          <div className="w-[1px] h-[20px] bg-[var(--border)] mx-1" />

          {/* Target Format */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] whitespace-nowrap">
              {t("settings_format")}
            </span>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="select-field w-[150px] h-[32px] py-0 text-[12px] font-semibold"
              title="Target Format"
            >
              {OUTPUT_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {language === "tr" ? f.labelTr : f.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Engine Select (PDF only) */}
          {outputFormat === "pdf" && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] whitespace-nowrap">
                {t("settings_pdf_engine")}
              </span>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className="select-field w-[130px] h-[32px] py-0 text-[11px]"
                title="PDF Engine"
              >
                <option value="typst">Typst</option>
                <option value="xelatex">XeLaTeX</option>
                <option value="weasyprint">WeasyPrint</option>
              </select>
            </div>
          )}

          {/* Advanced Selects */}
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-[var(--foreground-muted)] ml-1" />
            <select
              value={mathRendering}
              onChange={(e) => setMathRendering(e.target.value)}
              className="select-field w-[120px] h-[32px] py-0 text-[11px]"
              title={t("settings_math_rendering")}
            >
              <option value="mathjax">MathJax</option>
              <option value="katex">KaTeX</option>
              <option value="mathml">MathML</option>
            </select>
            <select
              value={highlightStyle}
              onChange={(e) => setHighlightStyle(e.target.value)}
              className="select-field w-[120px] h-[32px] py-0 text-[11px]"
              title={t("settings_highlight_style")}
            >
              <option value="pygments">Pygments</option>
              <option value="tango">Tango</option>
              <option value="espresso">Espresso</option>
              <option value="zenburn">Zenburn</option>
            </select>
          </div>

          {/* Inline Toggles */}
          <div className="flex items-center gap-4 bg-[var(--background)] px-3 h-[32px] rounded-md border border-[var(--border)]">
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--foreground)] cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={toc} onChange={(e) => setToc(e.target.checked)} className="w-3 h-3 accent-[var(--accent)]" />
              TOC
            </label>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--foreground)] cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={citeproc} onChange={(e) => setCiteproc(e.target.checked)} className="w-3 h-3 accent-[var(--accent)]" />
              Cite
            </label>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--foreground)] cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={smart} onChange={(e) => setSmart(e.target.checked)} className="w-3 h-3 accent-[var(--accent)]" />
              {language === "tr" ? "Akıllı" : "Smart"}
            </label>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--foreground)] cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={numberSections} onChange={(e) => setNumberSections(e.target.checked)} className="w-3 h-3 accent-[var(--accent)]" />
              {language === "tr" ? "Numara" : "Number"}
            </label>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--foreground)] cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={extractMedia} onChange={(e) => setExtractMedia(e.target.checked)} className="w-3 h-3 accent-[var(--accent)]" />
              {language === "tr" ? "Medya" : "Media"}
            </label>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--foreground)] cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={standalone} onChange={(e) => setStandalone(e.target.checked)} className="w-3 h-3 accent-[var(--accent)]" />
              {language === "tr" ? "Bağımsız" : "Standalone"}
            </label>
          </div>

          {toc && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] whitespace-nowrap">
                {t("settings_toc_depth")}
              </span>
              <select
                className="select-field w-[90px] h-[32px] py-0 text-[11px]"
                value={tocDepth}
                onChange={(e) => setTocDepth(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((depth) => (
                  <option key={depth} value={depth}>
                    {depth}
                  </option>
                ))}
              </select>
            </div>
          )}

          {citeproc && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] whitespace-nowrap">
                {t("settings_csl_style")}
              </span>
              <select
                className="select-field w-[120px] h-[32px] py-0 text-[11px]"
                value={cslStyle}
                onChange={(e) => setCslStyle(e.target.value)}
              >
                <option value="">{language === "tr" ? "Varsayılan" : "Default"}</option>
                <option value="apa">APA</option>
                <option value="mla">MLA</option>
                <option value="ieee">IEEE</option>
                <option value="chicago">Chicago</option>
                <option value="harvard">Harvard</option>
              </select>
            </div>
          )}

          <div className="flex-1" />

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={!hasInput || conversionState === "converting"}
            className="btn-primary h-[32px] px-6 ml-auto shadow-sm whitespace-nowrap"
          >
            {conversionState === "converting" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            {language === "tr" ? "Dönüştür" : "Convert"}
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 relative overflow-hidden">
        {conversionState === "converting" && (
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--border)] z-50">
            <div className="h-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="h-full grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] overflow-hidden">
          {/* EDITOR COLUMN */}
          <div className="flex flex-col border-r border-[var(--border)] bg-[var(--background)]">
            <div className={inputMode === "editor" ? "flex-1 overflow-hidden" : "hidden"}>
              <CodeEditor
                value={editorContent}
                onChange={setEditorContent}
                language="markdown"
                height="100%"
                theme={theme as "dark" | "light"}
              />
            </div>
            <div className={inputMode === "upload" ? "flex-1 overflow-y-auto p-8 flex flex-col bg-[var(--background-secondary)]" : "hidden"}>
              <Uploader
                onFilesSelected={handleFilesSelected}
                accept=".md,.markdown,.tex,.docx,.doc,.html,.htm,.epub,.rst,.adoc,.org,.json,.csv,.bib,.odt,.rtf,.txt,.ipynb,.typ,.pptx"
                maxSizeMB={50}
                multiple={false}
                label={language === "tr" ? "Dosyaları sürükleyin veya seçin" : "Drag files here or browse"}
              />
              {uploadedFiles.length > 0 && (
                <div className="mt-6 space-y-3">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--foreground-muted)] transition-colors shadow-sm">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="text-[var(--accent)]">
                          <FileText size={20} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-[var(--foreground)] truncate text-sm">{file.name}</span>
                          <span className="text-[11px] text-[var(--foreground-muted)] font-mono">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(idx)}
                        className="p-2 rounded hover:bg-[var(--error-bg)] text-[var(--foreground-muted)] hover:text-[var(--error)] transition-colors cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PREVIEW COLUMN */}
          <div className="flex flex-col bg-[var(--background-secondary)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={14} className="text-[var(--foreground-muted)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                  {t("preview_title")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {outputUrl && (
                  <>
                    <a
                      href={outputUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                      title="Open in new tab"
                    >
                      <ExternalLink size={12} />
                    </a>
                    <a
                      href={outputUrl}
                      download={`converted.${OUTPUT_EXT_MAP[outputFormat] || outputFormat}`}
                      className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                      title="Download file"
                    >
                      <Download size={12} />
                    </a>
                  </>
                )}
              </div>
            </div>

            {conversionState === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--foreground-muted)] opacity-60 p-8 text-center gap-4">
                <Eye size={40} strokeWidth={1} />
                <div>
                  <p className="text-sm font-medium">{language === "tr" ? "Önizleme Alanı" : "Preview Area"}</p>
                  <p className="text-xs mt-1">
                    {language === "tr" ? "Dönüştürme işleminden sonra sonuç burada görünecek." : "Results will appear here after conversion."}
                  </p>
                </div>
              </div>
            )}

            {conversionState === "converting" && (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--accent)] gap-4 p-8">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-sm font-medium tracking-wide animate-pulse">
                  {language === "tr" ? "Derleniyor..." : "Compiling..."}
                </p>
              </div>
            )}

            {conversionState === "completed" && outputUrl && (
              <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                <div className="flex-shrink-0 flex items-center justify-between p-3 bg-[var(--success-bg)] border-b border-[var(--success)]/20">
                  <div className="flex items-center gap-2 text-[var(--success)]">
                    <CheckCircle2 size={16} />
                    <span className="text-sm font-medium">{language === "tr" ? "Başarılı!" : "Success!"}</span>
                    {executionTimeMs && <span className="text-[11px] opacity-70 font-mono ml-2">({(executionTimeMs / 1000).toFixed(2)}s)</span>}
                  </div>
                  <a href={outputUrl} download={`converted.${OUTPUT_EXT_MAP[outputFormat] || outputFormat}`} className="btn-primary py-1 px-3 bg-[var(--success)] text-white shadow-none text-[11px]">
                    <Download size={12} /> {language === "tr" ? "İndir" : "Download"}
                  </a>
                </div>

                {canPreview && previewBlobUrl ? (
                  <iframe
                    src={previewBlobUrl}
                    className="w-full flex-1 border-0 bg-white"
                    title="Document Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-[var(--foreground-muted)] gap-4 p-8 text-center">
                    <FileText size={40} strokeWidth={1} />
                    <p className="text-sm">
                      {language === "tr" ? "Bu format için tarayıcı içi önizleme desteklenmiyor." : "In-browser preview is not supported for this format."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {conversionState === "failed" && (
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="p-4 rounded-md border border-[var(--error)]/50 bg-[var(--error-bg)] space-y-3 animate-slide-up">
                  <div className="flex items-center gap-2 text-[var(--error)]">
                    <AlertCircle size={18} />
                    <span className="text-sm font-medium">{language === "tr" ? "Derleme Hatası" : "Compilation Error"}</span>
                  </div>
                  <pre className="text-xs text-[var(--foreground)] whitespace-pre-wrap font-mono bg-black/20 p-3 rounded border border-black/10">
                    {errorMessage}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
