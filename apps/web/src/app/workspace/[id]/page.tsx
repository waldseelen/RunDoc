"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  PanelLeftClose,
  PanelRightClose,
  Sparkles,
  FileUp,
  PenLine,
  Keyboard,
  Sun,
  Moon,
  Globe,
  Settings as SettingsIcon,
  HelpCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import Uploader from "@/components/uploader";
import ConversionPanel, { type ConversionSettings } from "@/components/conversion-panel";
import Preview from "@/components/preview";
import { useAppSettings } from "@/hooks/useAppSettings";

// Monaco Editor'ü SSR devre dışı bırakarak yükle
const CodeEditor = dynamic(() => import("@/components/editor"), { ssr: false });

// =============================================
// Default Settings
// =============================================

const DEFAULT_SETTINGS: ConversionSettings = {
  outputFormat: "pdf",
  engine: "xelatex",
  citeproc: false,
  cslStyle: "",
  toc: false,
  tocDepth: 3,
  smart: true,
  numberSections: false,
  highlightStyle: "pygments",
  mathRendering: "mathjax",
  extractMedia: false,
  standalone: true,
};

const DEFAULT_MARKDOWN = `---
title: "Kuantum Hesaplama ve Gelecek"
author: "Dr. Ahmet Yılmaz"
date: ${new Date().toISOString().split("T")[0]}
---

# Giriş

Kuantum hesaplama, klasik bilgisayarların çözmekte yetersiz kaldığı karmaşık problemleri çözmek için **kuantum mekaniği** ilkelerini (süperpozisyon ve dolanıklık) kullanan yeni nesil bir hesaplama paradigmasıdır.

## 1. Temel Kavramlar

Kuantum bilgisayarlar, klasik bilgisayarlardaki 0 ve 1 bitleri yerine **kubitleri** (quantum bits) kullanır. Bir kubit aynı anda hem 0 hem de 1 durumunda bulunabilir.

### Dirac Notasyonu ile Matematiksel İfade

Kuantum durumları genellikle ket vektörleri ile temsil edilir:

$$|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$$

Burada $\\alpha$ ve $\\beta$ karmaşık sayılardır ve olasılıkların toplamı 1'e eşittir:

$$|\\alpha|^2 + |\\beta|^2 = 1$$

## 2. Kuantum Algoritmaları

En popüler kuantum algoritmaları şunlardır:

1. **Shor Algoritması:** Büyük sayıları asal çarpanlarına çok hızlı ayırır.
2. **Grover Algoritması:** Veritabanı aramalarını karekök hızında yapar.

\`\`\`python
# Grover Algoritması Genlik Yükseltme Adımı
def genlik_yukselt(kubitler):
    for k in kubitler:
        k.uygula_hadamard()
    print("Genlik yükseltildi.")
\`\`\`

## 3. Karşılaştırma Tablosu

| Özellik | Klasik Bilgisayar | Kuantum Bilgisayarı |
|---------|-------------------|---------------------|
| Temel Birim | Bit (0 veya 1) | Kubit (Süperpozisyon) |
| İşlem Gücü | Lineer | Üstel (2^n) |
| Fizik İlkeleri | Klasik Fizik | Kuantum Mekaniği |
`;

type InputMode = "editor" | "upload";

export default function WorkspacePage() {
  const router = useRouter();
  const { theme, language, toggleTheme, toggleLanguage, t, mounted } = useAppSettings();

  // States
  const [inputMode, setInputMode] = useState<InputMode>("editor");
  const [editorContent, setEditorContent] = useState(DEFAULT_MARKDOWN);
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState<
    "pending" | "processing" | "completed" | "failed" | null
  >(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [executionTimeMs, setExecutionTimeMs] = useState<number | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  // Check query params for simulated/onboard jobs on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlJobId = params.get("job_id");
      if (urlJobId) {
        setConversionStatus("completed");
        
        // Output format mapping
        const outputExtMap: Record<string, string> = {
          pdf: "pdf", docx: "docx", odt: "odt", html: "html",
          epub: "epub", latex: "tex", pptx: "pptx", revealjs: "html",
          beamer: "pdf", markdown: "md", typst: "typ"
        };
        const ext = outputExtMap[settings.outputFormat] || "pdf";
        const resolvedUrl = `${process.env.NEXT_PUBLIC_WORKER_API_URL || "http://localhost:8000"}/outputs/${urlJobId}/compiled_output.${ext}`;
        setOutputUrl(resolvedUrl);
      }
    }
  }, [settings.outputFormat]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
  }, []);

  // Connect Monaco Editor directly to compile-direct FastAPI Endpoint
  const handleConvert = useCallback(async () => {
    setIsConverting(true);
    setConversionStatus("pending");
    setErrorMessage("");
    setOutputUrl(null);

    // Give visual cue
    setTimeout(() => setConversionStatus("processing"), 300);

    try {
      const formData = new FormData();
      
      // If we uploaded a file, use it. Otherwise use Monaco editor text
      if (inputMode === "upload" && uploadedFiles.length > 0) {
        formData.append("file", uploadedFiles[0]);
      } else {
        formData.append("text", editorContent);
      }

      formData.append("output_format", settings.outputFormat);
      formData.append("engine", settings.engine);
      formData.append("citeproc", settings.citeproc ? "true" : "false");
      formData.append("toc", settings.toc ? "true" : "false");
      formData.append("toc_depth", String(settings.tocDepth));
      formData.append("smart", settings.smart ? "true" : "false");
      formData.append("number_sections", settings.numberSections ? "true" : "false");
      formData.append("standalone", settings.standalone ? "true" : "false");
      formData.append("highlight_style", settings.highlightStyle);
      formData.append("math_rendering", settings.mathRendering);
      formData.append("extract_media", settings.extractMedia ? "true" : "false");

      const response = await fetch(`${process.env.NEXT_PUBLIC_WORKER_API_URL || "http://localhost:8000"}/convert-direct`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Dönüşüm başarısız: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      if (result.status === "completed") {
        setConversionStatus("completed");
        setOutputUrl(result.output_url);
        setExecutionTimeMs(result.execution_time_ms);
      } else {
        setConversionStatus("failed");
        setErrorMessage(result.error_message || "Pandoc derleme hatası oluştu.");
      }
    } catch (err: any) {
      setConversionStatus("failed");
      setErrorMessage(err.message || "Bağlantı hatası: Python worker'ın açık olduğundan emin olun.");
    } finally {
      setIsConverting(false);
    }
  }, [editorContent, inputMode, uploadedFiles, settings]);

  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)] font-sans selection:bg-[rgba(94,97,230,0.3)] transition-colors">
      {/* Immersive Top Navigation Bar (High Gravity) */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--background-secondary)]/60 backdrop-blur-md shrink-0">
        {/* Left: Breadcrumbs & Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            id="back-to-dashboard"
          >
            <ArrowLeft size={14} />
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-medium">
            <span className="text-[var(--foreground-muted)]">{t("nav_projects")}</span>
            <span className="text-[var(--border)]">/</span>
            <span className="text-[var(--foreground-secondary)]">{t("brand_title")}</span>
          </div>

          <div className="w-[1px] h-3 bg-[var(--border)] mx-2" />

          {/* Core System Status */}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">{t("system_ready")}</span>
          </div>
        </div>

        {/* Center: Input Mode Tabs */}
        <div className="flex bg-[var(--background-tertiary)] p-0.5 rounded-lg border border-[var(--border)]">
          <button
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all ${
              inputMode === "editor"
                ? "bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-sm"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] border border-transparent"
            }`}
            onClick={() => setInputMode("editor")}
            id="tab-editor"
          >
            <PenLine size={10} />
            {t("editor_tab")}
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all ${
              inputMode === "upload"
                ? "bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-sm"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] border border-transparent"
            }`}
            onClick={() => setInputMode("upload")}
            id="tab-upload"
          >
            <FileUp size={10} />
            {t("upload_tab")}
          </button>
        </div>

        {/* Right: Shortcuts & Panel Toggles */}
        <div className="flex items-center gap-1">
          {/* Theme Switcher next to help icon */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title={theme === "dark" ? "Light Mode" : "Dark Mode"}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Language Selector icon */}
          <button
            onClick={toggleLanguage}
            className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title={language === "tr" ? "English" : "Türkçe"}
          >
            <Globe size={14} />
          </button>

          <div className="w-[1px] h-3 bg-[var(--border)] mx-2" />

          <button
            className={`p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all cursor-pointer ${
              !showSettings ? "opacity-40" : ""
            }`}
            onClick={() => setShowSettings(!showSettings)}
            data-tooltip={showSettings ? t("toggle_settings_hide") : t("toggle_settings_show")}
            id="toggle-settings-panel"
          >
            <PanelRightClose size={14} />
          </button>
          <button
            className={`p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all cursor-pointer ${
              !showPreview ? "opacity-40" : ""
            }`}
            onClick={() => setShowPreview(!showPreview)}
            data-tooltip={showPreview ? t("toggle_preview_hide") : t("toggle_preview_show")}
            id="toggle-preview-panel"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>
      </header>

      {/* Main 3-Panel Split Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative bg-[var(--background)] divide-x divide-[var(--border)]">
        
        {/* Panel 1: Main Source Input Panel */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-[var(--background)] min-w-0">
          {inputMode === "editor" ? (
            <div className="flex-1 p-0 overflow-hidden flex flex-col">
              <div className="flex-1 relative overflow-hidden bg-[var(--background-secondary)]">
                <CodeEditor
                  value={editorContent}
                  onChange={setEditorContent}
                  language="markdown"
                  height="100%"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center bg-[var(--background)]">
              <div className="max-w-lg w-full space-y-8">
                <div className="space-y-3 text-center">
                  <div className="w-10 h-10 border border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground-secondary)] flex items-center justify-center mx-auto mb-6">
                    <FileUp size={18} />
                  </div>
                  <h3 className="text-sm font-medium text-[var(--foreground)] tracking-tight">
                    {t("upload_title")}
                  </h3>
                  <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto leading-relaxed">
                    {t("upload_desc")}
                  </p>
                </div>
                <div className="p-1 border border-[var(--border)] bg-[var(--background-secondary)]">
                  <Uploader
                    onFilesSelected={handleFilesSelected}
                    accept=".md,.markdown,.tex,.docx,.doc,.html,.htm,.epub,.rst,.adoc,.org,.json,.csv,.bib,.lua,.py,.csl,.odt,.rtf,.txt,.ipynb,.typ"
                    maxSizeMB={50}
                    multiple
                    label={t("upload_drag_label")}
                  />
                </div>
                
                {/* Uploaded Files Registry */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-bold tracking-widest text-[var(--foreground-muted)] uppercase">{t("uploaded_files_title")} ({uploadedFiles.length})</p>
                    <div className="border border-[var(--border)] divide-y divide-[var(--border)] bg-[var(--background-secondary)]">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 text-xs hover:bg-[var(--surface-hover)] transition-none cursor-default">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText size={14} className="text-[var(--foreground-muted)]" />
                            <span className="font-medium text-[var(--foreground-secondary)] truncate">{file.name}</span>
                          </div>
                          <span className="text-[10px] text-[var(--foreground-muted)] font-mono">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Panel 2: Conversion Settings Panel */}
        {showSettings && (
          <div className="flex-shrink-0 overflow-hidden flex flex-col relative w-[320px] bg-[var(--background-secondary)]">
            <ConversionPanel
              settings={settings}
              onSettingsChange={setSettings}
              onConvert={handleConvert}
              isConverting={isConverting}
            />
          </div>
        )}

        {/* Panel 3: Premium Output Preview Panel */}
        {showPreview && (
          <div className="flex-shrink-0 overflow-hidden flex flex-col relative w-[420px] bg-[var(--background-secondary)]">
            <Preview
              outputUrl={outputUrl}
              status={conversionStatus ?? undefined}
              outputFormat={settings.outputFormat}
              errorMessage={errorMessage}
              executionTimeMs={executionTimeMs}
              onRetry={handleConvert}
            />
          </div>
        )}
      </div>
    </div>
  );
}
