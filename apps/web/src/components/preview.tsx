"use client";

import { useState, useEffect } from "react";
import { Eye, Download, ExternalLink, FileText, Maximize2, Minimize2, CheckCircle2, FileCode, Clock, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

// =============================================
// Types
// =============================================

interface PreviewProps {
  outputUrl?: string | null;
  outputFormat?: string;
  status?: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
  executionTimeMs?: number;
  onRetry?: () => void;
}

// =============================================
// Component
// =============================================

export default function Preview({
  outputUrl,
  outputFormat = "pdf",
  status,
  errorMessage,
  executionTimeMs,
  onRetry,
}: PreviewProps) {
  const { t, language } = useAppSettings();
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (status === "processing" || status === "pending") {
      setProgress(5);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) {
            return prev;
          }
          const increment = prev < 50 ? 8 : prev < 75 ? 4 : 1.5;
          return Math.min(prev + increment, 95);
        });
      }, 250);
      return () => clearInterval(interval);
    } else if (status === "completed") {
      setProgress(100);
    } else {
      setProgress(0);
    }
  }, [status]);

  const handleCopyLogs = () => {
    if (errorMessage) {
      navigator.clipboard.writeText(errorMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isPDF = outputFormat === "pdf" || outputFormat === "beamer";
  const isHTML = ["html", "html5", "revealjs", "slidy", "slideous", "s5", "dzslides"].includes(
    outputFormat || ""
  );

  const canPreview = (isPDF || isHTML) && outputUrl;

  return (
    <div className="flex flex-col h-full bg-[var(--background)]" id="preview-panel">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background-secondary)]">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-[var(--foreground-muted)]" />
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
            {t("preview_title")}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {canPreview && (
            <button
              className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              onClick={() => setIsFullscreen(!isFullscreen)}
              data-tooltip={isFullscreen ? "Minimize" : "Fullscreen"}
              id="toggle-fullscreen"
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}
          {outputUrl && (
            <>
              <a
                href={outputUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                title="Open in new tab"
                id="open-in-tab"
              >
                <ExternalLink size={12} />
              </a>
              <a
                href={outputUrl}
                download
                className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                title="Download file"
                id="download-output"
              >
                <Download size={12} />
              </a>
            </>
          )}
        </div>
      </div>

      {/* Preview Content Area */}
      <div className="flex-1 overflow-hidden relative bg-[var(--background)]">
        {/* Idle State */}
        {!status && (
          <EmptyState
            icon={<FileText size={28} />}
            title={t("preview_idle_title")}
            description={t("preview_idle_desc")}
          />
        )}

        {/* Pending State */}
        {status === "pending" && (
          <EmptyState
            icon={<Loader2 size={28} className="animate-spin text-[var(--accent)]" />}
            title={t("preview_pending_title")}
            description={t("preview_pending_desc")}
          />
        )}

        {/* Processing State — with Skeleton Shimmer */}
        {status === "processing" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-[var(--accent)]/20 animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold text-[var(--foreground)]">
                {t("preview_processing_title")}
              </p>
              <p className="text-[11px] text-[var(--foreground-muted)]">
                {t("preview_processing_desc")}
              </p>
            </div>
            {/* Skeleton Preview */}
            <div className="w-full max-w-xs space-y-2.5">
              <div className="skeleton h-3 w-3/4 mx-auto" />
              <div className="skeleton h-2 w-full" />
              <div className="skeleton h-2 w-5/6" />
              <div className="skeleton h-2 w-full" />
              <div className="skeleton h-2 w-2/3" />
              <div className="skeleton h-8 w-full mt-3" />
            </div>
            <div className="progress-bar w-48">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Error State — Softer, no harsh red stripes */}
        {status === "failed" && (
          <div className="flex flex-col h-full p-6 bg-[var(--background-secondary)] overflow-y-auto">
            <div className="my-auto max-w-sm w-full mx-auto space-y-5 text-center animate-slide-up">
              {/* Softer error icon — rose tint instead of harsh red */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto bg-[var(--error-bg)] text-[var(--error)] border border-[var(--error)]/10 shadow-md">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {t("preview_error_title")}
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)] max-w-xs mx-auto leading-relaxed">
                  {t("preview_error_desc")}
                </p>
              </div>

              {/* Error Log Console — subtle border, no red strips */}
              {errorMessage && (
                <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--background-tertiary)] text-left">
                  {/* Console Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--background)]">
                    <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-[var(--foreground-muted)]">
                      compiler_output.log
                    </span>
                    <button
                      onClick={handleCopyLogs}
                      className="px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider rounded-md bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                    >
                      {copied ? t("preview_copied") : t("preview_copy_logs")}
                    </button>
                  </div>
                  {/* Console Body */}
                  <pre
                    className="p-3 text-[10px] font-mono text-[var(--foreground-secondary)] overflow-auto leading-relaxed max-w-full"
                    style={{ maxHeight: "150px" }}
                  >
                    {errorMessage}
                  </pre>
                </div>
              )}

              {/* Retry Button */}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="btn-primary py-2.5 px-5 text-xs rounded-lg mx-auto flex items-center gap-2"
                >
                  <RotateCcw size={12} />
                  {t("preview_retry_btn")}
                </button>
              )}

              {/* Troubleshooting Tips — softer styling */}
              <div className="p-4 border border-[var(--border)] bg-[var(--background)]/50 text-left space-y-2 rounded-xl">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--foreground-muted)]">
                  💡 {t("preview_troubleshoot_title")}
                </p>
                <ul className="text-[10px] text-[var(--foreground-secondary)] leading-relaxed space-y-1.5 list-disc pl-3.5">
                  {outputFormat === "pdf" ? (
                    <>
                      <li>{t("preview_tip_math")}</li>
                      <li>{t("preview_tip_typst")}</li>
                    </>
                  ) : (
                    <>
                      <li>{t("preview_tip_yaml")}</li>
                      <li>{t("preview_tip_template")}</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Completed — Real PDF/HTML Preview Available */}
        {status === "completed" && canPreview && (
          <div className="h-full">
            <iframe
              src={outputUrl!}
              className="w-full h-full border-0 bg-white"
              title="Document Preview"
              sandbox="allow-scripts allow-same-origin"
              id="preview-iframe"
            />
          </div>
        )}

        {/* Completed — Simulation / Premium Mock View */}
        {status === "completed" && !canPreview && (
          <div className="h-full flex flex-col p-6 overflow-y-auto space-y-6 bg-[var(--background)]">
            {/* Visual Compiled PDF Canvas */}
            <div className="flex-1 rounded-xl border border-[var(--border)] bg-white p-8 shadow-lg min-h-[420px] flex flex-col relative select-none">
              <div className="absolute top-0 inset-x-0 h-1 rounded-t-xl" style={{ background: "var(--gradient-brand)" }} />

              <div className="space-y-6 flex-1">
                {/* Title */}
                <div className="border-b border-neutral-200 pb-4">
                  <h1 className="text-xl font-bold text-black tracking-tight">
                    {language === "tr" ? "Kuantum Hesaplama" : "Quantum Computing"}
                  </h1>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
                    <span>{language === "tr" ? "Dr. Ahmet Yılmaz" : "Dr. Ahmet Yilmaz"}</span>
                    <span>•</span>
                    <span>{new Date().toISOString().split("T")[0]}</span>
                  </div>
                </div>

                {/* Section 1 */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-black tracking-widest uppercase">1. Introduction</h2>
                  <p className="text-[11px] text-neutral-800 leading-relaxed font-serif">
                    {language === "tr"
                      ? "Kuantum hesaplama, klasik bilgisayarların çözmekte yetersiz kaldığı karmaşık problemleri çözmek için kuantum mekaniği ilkelerini kullanan yeni nesil bir hesaplama paradigmasıdır."
                      : "Quantum computing is a next-generation computing paradigm that utilizes quantum mechanics principles to solve complex problems that are intractable for classical computers."}
                  </p>
                </div>

                {/* Formula Box */}
                <div className="p-4 bg-neutral-50 border border-neutral-200 text-center rounded-lg">
                  <span className="font-serif text-sm text-black">|ψ⟩ = α|0⟩ + β|1⟩</span>
                </div>

                {/* Section 2 */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-black tracking-widest uppercase">2. Specifications</h2>
                  <div className="border border-neutral-200 rounded-lg overflow-hidden">
                    <table className="w-full text-[10px] text-neutral-800 border-collapse">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-200 text-left font-bold text-black uppercase tracking-widest">
                          <th className="p-2.5">Feature</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-neutral-100">
                          <td className="p-2.5">PDF Compilation</td>
                          <td className="p-2.5 text-neutral-900 font-semibold">Active (Typst Engine)</td>
                        </tr>
                        <tr>
                          <td className="p-2.5">Highlight Style</td>
                          <td className="p-2.5 text-neutral-900 font-semibold">Custom pygments</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-4 text-center text-[10px] text-neutral-400 font-mono mt-8">
                PAGE 1 / 1
              </div>
            </div>

            {/* Quick Actions for Compilation Success */}
            <div className="p-4 border border-[var(--border)] bg-[var(--background-secondary)] rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[var(--success)]" />
                <span className="font-semibold text-[var(--foreground)]">{t("preview_success_msg")}</span>
              </div>
              {outputUrl && (
                <a
                  href={outputUrl}
                  download={`compiled_document.${outputFormat === "beamer" || outputFormat === "pdf" ? "pdf" : outputFormat}`}
                  className="btn-primary py-2 px-4 text-[10px] flex items-center gap-1.5 rounded-lg"
                  style={{ textDecoration: "none" }}
                >
                  <Download size={12} />
                  {t("preview_download_btn")}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info bar */}
      {status === "completed" && (
        <div className="px-4 py-2.5 border-t border-[var(--border)] flex items-center justify-between text-[9px] uppercase tracking-widest bg-[var(--background-secondary)] text-[var(--foreground-muted)] font-semibold">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--success)]" />
            <span>{t("preview_compile_ok")}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Clock size={10} /> {executionTimeMs ? `${(executionTimeMs / 1000).toFixed(1)}s` : "1.8s"}</span>
            <span className="flex items-center gap-1.5"><FileCode size={10} /> {outputFormat.toUpperCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// Sub-components
// =============================================

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-6 text-center animate-fade-in">
      <div className="text-[var(--foreground-muted)]">{icon}</div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--foreground-secondary)]">
          {title}
        </p>
        <p className="text-[11px] text-[var(--foreground-muted)] max-w-[240px] mx-auto leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
