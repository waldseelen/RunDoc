"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  PanelLeftClose,
  PanelRightClose,
  Sparkles,
  FileUp,
  PenLine,
} from "lucide-react";
import Uploader from "@/components/uploader";
import ConversionPanel, { type ConversionSettings } from "@/components/conversion-panel";
import Preview from "@/components/preview";

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
title: "Doküman Başlığı"
author: "Yazar Adı"
date: ${new Date().toISOString().split("T")[0]}
---

# Giriş

Hoş geldiniz! Bu, **RunDoc** platformunda oluşturulan örnek bir Markdown belgesidir.

## Özellikler

- **Çapraz format dönüşümü**: 40+ format desteği
- **Akademik yayıncılık**: LaTeX, atıf yönetimi, matematik
- **Modern tasarım**: Şablon ve tema desteği

## Matematik

Euler'in ünlü formülü:

$$e^{i\\pi} + 1 = 0$$

## Kod Örneği

\`\`\`python
def merhaba():
    print("Merhaba Dünya!")
    return True
\`\`\`

## Tablo

| Özellik | Durum | Açıklama |
|---------|-------|----------|
| PDF | ✅ | LaTeX, Typst, WeasyPrint |
| DOCX | ✅ | Şablon desteği |
| HTML | ✅ | Canlı önizleme |
| EPUB | ✅ | E-kitap formatı |
`;

// =============================================
// Types
// =============================================

type InputMode = "editor" | "upload";

// =============================================
// Page Component
// =============================================

export default function WorkspacePage() {
  // State
  const [inputMode, setInputMode] = useState<InputMode>("editor");
  const [editorContent, setEditorContent] = useState(DEFAULT_MARKDOWN);
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState<
    "pending" | "processing" | "completed" | "failed" | null
  >(null);
  const [showSettings, setShowSettings] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  // Handlers
  const handleFilesSelected = useCallback((files: File[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleConvert = useCallback(async () => {
    setIsConverting(true);
    setConversionStatus("pending");

    // Simülasyon — gerçek API bağlantısında useStartConversion kullanılacak
    setTimeout(() => setConversionStatus("processing"), 500);
    setTimeout(() => {
      setConversionStatus("completed");
      setIsConverting(false);
    }, 3000);
  }, []);

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Top Bar */}
      <header
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--background-secondary)",
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="btn-ghost p-1.5"
            data-tooltip="Dashboard"
            id="back-to-dashboard"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Sparkles size={12} color="white" />
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              RunDoc
            </span>
          </div>

          <div className="panel-divider h-5 mx-1" />

          <span
            className="text-sm"
            style={{ color: "var(--foreground-secondary)" }}
          >
            Yeni Dönüşüm
          </span>
        </div>

        {/* Center: Input Mode Tabs */}
        <div className="tab-list">
          <button
            className={`tab-trigger ${inputMode === "editor" ? "tab-trigger-active" : ""}`}
            onClick={() => setInputMode("editor")}
            id="tab-editor"
          >
            <PenLine size={13} className="inline mr-1.5" style={{ verticalAlign: "middle" }} />
            Editör
          </button>
          <button
            className={`tab-trigger ${inputMode === "upload" ? "tab-trigger-active" : ""}`}
            onClick={() => setInputMode("upload")}
            id="tab-upload"
          >
            <FileUp size={13} className="inline mr-1.5" style={{ verticalAlign: "middle" }} />
            Dosya Yükle
          </button>
        </div>

        {/* Right: Panel Toggles */}
        <div className="flex items-center gap-1">
          <button
            className={`btn-ghost p-1.5 ${!showSettings ? "opacity-50" : ""}`}
            onClick={() => setShowSettings(!showSettings)}
            data-tooltip={showSettings ? "Ayarları Gizle" : "Ayarları Göster"}
            id="toggle-settings-panel"
          >
            <PanelRightClose size={16} />
          </button>
          <button
            className={`btn-ghost p-1.5 ${!showPreview ? "opacity-50" : ""}`}
            onClick={() => setShowPreview(!showPreview)}
            data-tooltip={showPreview ? "Önizlemeyi Gizle" : "Önizlemeyi Göster"}
            id="toggle-preview-panel"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
      </header>

      {/* Main 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel 1: Editor / Upload */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            minWidth: 0,
            borderRight: showSettings || showPreview ? "1px solid var(--border)" : "none",
          }}
        >
          {inputMode === "editor" ? (
            <CodeEditor
              value={editorContent}
              onChange={setEditorContent}
              language="markdown"
              height="100%"
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-lg mx-auto">
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Dosya Yükle
                </h3>
                <p
                  className="text-sm mb-4"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  Markdown, LaTeX, Word, HTML ve diğer desteklenen formatları
                  sürükleyip bırakın.
                </p>
                <Uploader
                  onFilesSelected={handleFilesSelected}
                  accept=".md,.markdown,.tex,.docx,.doc,.html,.htm,.epub,.rst,.adoc,.org,.json,.csv,.bib,.lua,.py,.csl,.odt,.rtf,.txt,.ipynb,.typ"
                  maxSizeMB={50}
                  multiple
                  label="Dosyaları sürükleyin veya tıklayarak seçin"
                />
              </div>
            </div>
          )}
        </div>

        {/* Panel 2: Conversion Settings */}
        {showSettings && (
          <>
            <div
              className="flex-shrink-0 overflow-hidden flex flex-col"
              style={{
                width: "300px",
                background: "var(--background-secondary)",
                borderRight: showPreview ? "1px solid var(--border)" : "none",
              }}
            >
              <ConversionPanel
                settings={settings}
                onSettingsChange={setSettings}
                onConvert={handleConvert}
                isConverting={isConverting}
              />
            </div>
          </>
        )}

        {/* Panel 3: Preview */}
        {showPreview && (
          <div
            className="flex-shrink-0 overflow-hidden flex flex-col"
            style={{
              width: "400px",
              background: "var(--background-secondary)",
            }}
          >
            <Preview
              status={conversionStatus ?? undefined}
              outputFormat={settings.outputFormat}
              executionTimeMs={conversionStatus === "completed" ? 2450 : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
