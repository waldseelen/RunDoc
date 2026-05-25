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
  Loader2,
} from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

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
  const { t } = useAppSettings();

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
    <div className="flex flex-col h-full bg-[var(--background-secondary)]" id="conversion-panel">
      {/* Header */}
      <div className="p-4 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--background)]">
        <Settings2 size={14} className="text-[var(--foreground-muted)]" />
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
          {t("settings_title")}
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Format Section */}
        <Section
          title={t("settings_format")}
          icon={<FileType size={12} />}
          expanded={expandedSections.format}
          onToggle={() => toggleSection("format")}
        >
          <select
            className="select-field w-full bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] h-9 text-[11px]"
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
            title={t("settings_pdf_engine")}
            icon={<Zap size={12} />}
            expanded={expandedSections.engine}
            onToggle={() => toggleSection("engine")}
          >
            <div className="space-y-1.5">
              {PDF_ENGINES.map((engine) => (
                <label
                  key={engine.value}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    settings.engine === engine.value
                      ? "border-[var(--accent)] bg-[var(--accent-subtle)] shadow-sm"
                      : "border-[var(--border)] bg-[var(--background)] hover:bg-[var(--surface-hover)] hover:border-[var(--foreground-muted)]"
                  }`}
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
                    <p className="text-[11px] font-semibold text-[var(--foreground-secondary)] tracking-tight">
                      {engine.label}
                    </p>
                    <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                      {engine.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            
            {/* Real-time Validation Hints */}
            {settings.engine === "xelatex" && (
              <div className="p-3 border border-[var(--info)]/15 bg-[var(--info-bg)] text-[var(--info)] text-[10px] rounded-lg leading-relaxed mt-2">
                💡 <strong>XeLaTeX:</strong> Zengin Unicode & TeX paket desteği sunar. PDF derlenmesi biraz uzun sürebilir.
              </div>
            )}
            {settings.engine === "typst" && (
              <div className="p-3 border border-[var(--success)]/15 bg-[var(--success-bg)] text-[var(--success)] text-[10px] rounded-lg leading-relaxed mt-2">
                ⚡ <strong>Typst:</strong> Milisaniyeler mertebesinde aşırı hızlı derleme sunan modern dizgi aracıdır.
              </div>
            )}
          </Section>
        )}

        {/* Academic Section */}
        <Section
          title={t("settings_academic")}
          icon={<BookOpen size={12} />}
          expanded={expandedSections.academic}
          onToggle={() => toggleSection("academic")}
        >
          <div className="space-y-4">
            <ToggleRow
              label={t("settings_citeproc")}
              checked={settings.citeproc}
              onChange={(v) => update({ citeproc: v })}
              id="toggle-citeproc"
            />

            {settings.citeproc && (
              <div className="space-y-2 animate-slide-up">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--foreground-muted)] mb-1.5 block">
                    {t("settings_csl_style")}
                  </label>
                  <select
                    className="select-field w-full bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] h-9 text-[11px]"
                    value={settings.cslStyle}
                    onChange={(e) => update({ cslStyle: e.target.value })}
                    id="csl-style-select"
                  >
                    <option value="">Varsayılan / Default</option>
                    {CSL_STYLES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-3 border border-[var(--warning)]/15 bg-[var(--warning-bg)] text-[var(--warning)] text-[10px] rounded-lg leading-relaxed">
                  ⚠️ <strong>Not:</strong> Citeproc kullanımı için workspace alanına bir bibliyografya dosyası (.bib) eklemelisiniz.
                </div>
              </div>
            )}

            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--foreground-muted)] mb-1.5 block">
                <Calculator size={10} className="inline mr-1" style={{ verticalAlign: "baseline" }} />
                {t("settings_math_rendering")}
              </label>
              <select
                className="select-field w-full bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] h-9 text-[11px]"
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
          title={t("settings_typography")}
          icon={<Sparkles size={12} />}
          expanded={expandedSections.typography}
          onToggle={() => toggleSection("typography")}
        >
          <div className="space-y-4">
            <ToggleRow
              label={t("settings_smart")}
              checked={settings.smart}
              onChange={(v) => update({ smart: v })}
              id="toggle-smart"
            />
            <ToggleRow
              label={t("settings_toc")}
              checked={settings.toc}
              onChange={(v) => update({ toc: v })}
              id="toggle-toc"
            />
            {settings.toc && (
              <div className="pl-3 space-y-1.5 border-l-2 border-[var(--accent)]/30 ml-1 animate-slide-up">
                <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--foreground-muted)] block">
                  {t("settings_toc_depth")}
                </label>
                <select
                  className="select-field w-full bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] h-9 text-[11px]"
                  value={settings.tocDepth}
                  onChange={(e) => update({ tocDepth: parseInt(e.target.value) })}
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
              label={t("settings_number_sections")}
              checked={settings.numberSections}
              onChange={(v) => update({ numberSections: v })}
              id="toggle-number-sections"
            />
          </div>
        </Section>

        {/* Advanced Section */}
        <Section
          title={t("settings_advanced")}
          icon={<Code2 size={12} />}
          expanded={expandedSections.advanced}
          onToggle={() => toggleSection("advanced")}
        >
          <div className="space-y-4">
            <ToggleRow
              label={t("settings_extract_media")}
              checked={settings.extractMedia}
              onChange={(v) => update({ extractMedia: v })}
              id="toggle-extract-media"
            />
            <ToggleRow
              label={t("settings_standalone")}
              checked={settings.standalone}
              onChange={(v) => update({ standalone: v })}
              id="toggle-standalone"
            />
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--foreground-muted)] mb-1.5 block">
                {t("settings_highlight_style")}
              </label>
              <select
                className="select-field w-full bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] h-9 text-[11px]"
                value={settings.highlightStyle}
                onChange={(e) => update({ highlightStyle: e.target.value })}
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

      {/* Convert Button */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]">
        <button
          className="btn-primary w-full py-3 text-[11px] uppercase tracking-wider font-bold flex items-center justify-center gap-2 cursor-pointer rounded-lg"
          onClick={onConvert}
          disabled={isConverting}
          id="convert-button"
        >
          {isConverting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>{t("settings_converting")}</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>{t("settings_convert_btn")}</span>
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
    <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--background)] transition-all">
      <button
        className="w-full flex items-center gap-2 p-3 text-left cursor-pointer transition-colors hover:bg-[var(--surface-hover)] text-[var(--foreground-secondary)]"
        onClick={onToggle}
      >
        <span className="text-[var(--foreground-muted)]">{icon}</span>
        <span className="text-[10px] font-bold tracking-widest uppercase flex-1">{title}</span>
        <ChevronDown
          size={12}
          className="text-[var(--foreground-muted)] transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        />
      </button>
      {expanded && (
        <div className="p-3 border-t border-[var(--border)] bg-[var(--background-secondary)] animate-slide-up">
          {children}
        </div>
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
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-[11px] font-medium text-[var(--foreground-secondary)] group-hover:text-[var(--foreground)] transition-colors">
        {label}
      </span>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-all cursor-pointer ${
          checked ? "bg-[#818cf8]" : "bg-[var(--background-tertiary)] border border-[var(--border)]"
        }`}
      >
        <span
          className="absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full transition-all shadow-sm"
          style={{
            background: checked ? "#ffffff" : "var(--foreground-muted)",
            transform: checked ? "translateX(16px)" : "translateX(0)",
          }}
        />
      </button>
    </label>
  );
}
