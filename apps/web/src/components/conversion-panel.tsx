"use client";

import { useState } from "react";
import {
  Play,
  Settings2,
  ChevronDown,
  BookOpen,
  Hash,
  Sparkles,
  Code2,
  FileType,
  Zap,
  Calculator,
} from "lucide-react";

// =============================================
// Format & Engine Data
// =============================================

const OUTPUT_FORMATS = [
  { value: "pdf", label: "PDF", icon: "📕", group: "Doküman" },
  { value: "docx", label: "Word (.docx)", icon: "📄", group: "Doküman" },
  { value: "odt", label: "OpenDocument (.odt)", icon: "📄", group: "Doküman" },
  { value: "rtf", label: "Rich Text (.rtf)", icon: "📄", group: "Doküman" },
  { value: "html", label: "HTML", icon: "🌐", group: "Web" },
  { value: "epub", label: "EPUB E-Kitap", icon: "📚", group: "Yayıncılık" },
  { value: "latex", label: "LaTeX", icon: "📐", group: "Akademik" },
  { value: "typst", label: "Typst", icon: "📐", group: "Akademik" },
  { value: "revealjs", label: "reveal.js Slayt", icon: "📊", group: "Sunum" },
  { value: "pptx", label: "PowerPoint (.pptx)", icon: "📊", group: "Sunum" },
  { value: "beamer", label: "Beamer (LaTeX Slayt)", icon: "📊", group: "Sunum" },
  { value: "markdown", label: "Markdown", icon: "📝", group: "Markup" },
  { value: "gfm", label: "GitHub Markdown", icon: "📝", group: "Markup" },
  { value: "rst", label: "reStructuredText", icon: "📝", group: "Markup" },
  { value: "mediawiki", label: "MediaWiki", icon: "📝", group: "Wiki" },
  { value: "json", label: "Pandoc JSON AST", icon: "📋", group: "Veri" },
  { value: "plain", label: "Düz Metin", icon: "📋", group: "Veri" },
];

const PDF_ENGINES = [
  { value: "xelatex", label: "XeLaTeX", desc: "Akademik standart, tam Unicode" },
  { value: "typst", label: "Typst", desc: "Modern ve hızlı" },
  { value: "weasyprint", label: "WeasyPrint", desc: "HTML/CSS tabanlı" },
  { value: "pdflatex", label: "pdfLaTeX", desc: "Klasik LaTeX" },
  { value: "lualatex", label: "LuaLaTeX", desc: "Lua genişletilebilir" },
  { value: "tectonic", label: "Tectonic", desc: "Otomatik bağımlılık" },
];

const CSL_STYLES = [
  { value: "apa", label: "APA (7th Edition)" },
  { value: "mla", label: "MLA (9th Edition)" },
  { value: "harvard", label: "Harvard" },
  { value: "ieee", label: "IEEE" },
  { value: "chicago", label: "Chicago" },
];

const MATH_METHODS = [
  { value: "mathjax", label: "MathJax" },
  { value: "katex", label: "KaTeX" },
  { value: "mathml", label: "MathML" },
];

// =============================================
// Types
// =============================================

export interface ConversionSettings {
  outputFormat: string;
  engine: string;
  citeproc: boolean;
  cslStyle: string;
  toc: boolean;
  tocDepth: number;
  smart: boolean;
  numberSections: boolean;
  highlightStyle: string;
  mathRendering: string;
  extractMedia: boolean;
  standalone: boolean;
}

interface ConversionPanelProps {
  settings: ConversionSettings;
  onSettingsChange: (settings: ConversionSettings) => void;
  onConvert: () => void;
  isConverting: boolean;
}

// =============================================
// Component
// =============================================

export default function ConversionPanel({
  settings,
  onSettingsChange,
  onConvert,
  isConverting,
}: ConversionPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    format: true,
    engine: true,
    academic: false,
    typography: false,
    advanced: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const update = (partial: Partial<ConversionSettings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  const needsEngine = settings.outputFormat === "pdf";

  return (
    <div className="flex flex-col h-full" id="conversion-panel">
      {/* Header */}
      <div
        className="p-4 flex items-center gap-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Settings2 size={18} style={{ color: "var(--accent)" }} />
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Dönüşüm Ayarları
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Format Section */}
        <Section
          title="Çıktı Formatı"
          icon={<FileType size={15} />}
          expanded={expandedSections.format}
          onToggle={() => toggleSection("format")}
        >
          <select
            className="select-field"
            value={settings.outputFormat}
            onChange={(e) => update({ outputFormat: e.target.value })}
            id="output-format-select"
          >
            {OUTPUT_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.icon} {f.label}
              </option>
            ))}
          </select>
        </Section>

        {/* Engine Section (only for PDF) */}
        {needsEngine && (
          <Section
            title="PDF Motoru"
            icon={<Zap size={15} />}
            expanded={expandedSections.engine}
            onToggle={() => toggleSection("engine")}
          >
            <div className="space-y-1.5">
              {PDF_ENGINES.map((engine) => (
                <label
                  key={engine.value}
                  className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background:
                      settings.engine === engine.value
                        ? "var(--accent-subtle)"
                        : "transparent",
                    border:
                      settings.engine === engine.value
                        ? "1px solid var(--accent)"
                        : "1px solid transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="pdf-engine"
                    value={engine.value}
                    checked={settings.engine === engine.value}
                    onChange={(e) => update({ engine: e.target.value })}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {engine.label}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--foreground-muted)" }}
                    >
                      {engine.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </Section>
        )}

        {/* Academic Section */}
        <Section
          title="Akademik"
          icon={<BookOpen size={15} />}
          expanded={expandedSections.academic}
          onToggle={() => toggleSection("academic")}
        >
          <div className="space-y-3">
            {/* Citeproc */}
            <ToggleRow
              label="Atıf İşleme (Citeproc)"
              checked={settings.citeproc}
              onChange={(v) => update({ citeproc: v })}
              id="toggle-citeproc"
            />

            {/* CSL Style */}
            {settings.citeproc && (
              <div className="animate-slide-up">
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: "var(--foreground-secondary)" }}
                >
                  Atıf Stili
                </label>
                <select
                  className="select-field"
                  value={settings.cslStyle}
                  onChange={(e) => update({ cslStyle: e.target.value })}
                  id="csl-style-select"
                >
                  <option value="">Varsayılan</option>
                  {CSL_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Math Rendering */}
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: "var(--foreground-secondary)" }}
              >
                <Calculator
                  size={12}
                  className="inline mr-1"
                  style={{ verticalAlign: "middle" }}
                />
                Matematik İşleme
              </label>
              <select
                className="select-field"
                value={settings.mathRendering}
                onChange={(e) => update({ mathRendering: e.target.value })}
                id="math-rendering-select"
              >
                {MATH_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        {/* Typography Section */}
        <Section
          title="Tipografi & Biçim"
          icon={<Sparkles size={15} />}
          expanded={expandedSections.typography}
          onToggle={() => toggleSection("typography")}
        >
          <div className="space-y-3">
            <ToggleRow
              label="Akıllı Tipografi"
              checked={settings.smart}
              onChange={(v) => update({ smart: v })}
              id="toggle-smart"
            />
            <ToggleRow
              label="İçindekiler Tablosu"
              checked={settings.toc}
              onChange={(v) => update({ toc: v })}
              id="toggle-toc"
            />
            {settings.toc && (
              <div className="animate-slide-up pl-4">
                <label
                  className="text-xs mb-1 block"
                  style={{ color: "var(--foreground-secondary)" }}
                >
                  TOC Derinliği
                </label>
                <select
                  className="select-field"
                  value={settings.tocDepth}
                  onChange={(e) =>
                    update({ tocDepth: parseInt(e.target.value) })
                  }
                  id="toc-depth-select"
                >
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <ToggleRow
              label="Bölüm Numaralandırma"
              checked={settings.numberSections}
              onChange={(v) => update({ numberSections: v })}
              id="toggle-number-sections"
            />
          </div>
        </Section>

        {/* Advanced Section */}
        <Section
          title="Gelişmiş"
          icon={<Code2 size={15} />}
          expanded={expandedSections.advanced}
          onToggle={() => toggleSection("advanced")}
        >
          <div className="space-y-3">
            <ToggleRow
              label="Medya Ayıklama"
              checked={settings.extractMedia}
              onChange={(v) => update({ extractMedia: v })}
              id="toggle-extract-media"
            />
            <ToggleRow
              label="Bağımsız Dosya"
              checked={settings.standalone}
              onChange={(v) => update({ standalone: v })}
              id="toggle-standalone"
            />
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: "var(--foreground-secondary)" }}
              >
                Kod Renklendirme
              </label>
              <select
                className="select-field"
                value={settings.highlightStyle}
                onChange={(e) =>
                  update({ highlightStyle: e.target.value })
                }
                id="highlight-style-select"
              >
                {["pygments", "tango", "espresso", "zenburn", "kate", "monochrome", "breezedark", "haddock"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </Section>
      </div>

      {/* Convert Button (sticky bottom) */}
      <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          className="btn-primary w-full"
          onClick={onConvert}
          disabled={isConverting}
          id="convert-button"
        >
          {isConverting ? (
            <>
              <div className="spinner" style={{ borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} />
              Dönüştürülüyor...
            </>
          ) : (
            <>
              <Play size={16} />
              Dönüştür
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// =============================================
// Sub-components
// =============================================

function Section({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--background-secondary)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <button
        className="w-full flex items-center gap-2 p-3 text-left"
        onClick={onToggle}
        style={{ color: "var(--foreground-secondary)" }}
      >
        {icon}
        <span className="text-sm font-medium flex-1">{title}</span>
        <ChevronDown
          size={14}
          className="transition-transform"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0)",
            color: "var(--foreground-muted)",
          }}
        />
      </button>
      {expanded && (
        <div className="px-3 pb-3 animate-slide-up">{children}</div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span
        className="text-sm"
        style={{ color: "var(--foreground-secondary)" }}
      >
        {label}
      </span>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-10 h-5 rounded-full transition-colors"
        style={{
          background: checked ? "var(--accent)" : "var(--surface-active)",
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
          style={{
            background: "white",
            transform: checked ? "translateX(20px)" : "translateX(0)",
          }}
        />
      </button>
    </label>
  );
}
