"use client";

import { useState } from "react";
import { Eye, Download, ExternalLink, FileText, Maximize2, Minimize2 } from "lucide-react";

// =============================================
// Types
// =============================================

interface PreviewProps {
  outputUrl?: string | null;
  outputFormat?: string;
  status?: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
  executionTimeMs?: number;
}

// =============================================
// Component
// =============================================

export default function Preview({
  outputUrl,
  outputFormat,
  status,
  errorMessage,
  executionTimeMs,
}: PreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isPDF = outputFormat === "pdf" || outputFormat === "beamer";
  const isHTML = ["html", "html5", "revealjs", "slidy", "slideous", "s5", "dzslides"].includes(
    outputFormat || ""
  );
  const canPreview = (isPDF || isHTML) && outputUrl;

  return (
    <div className="flex flex-col h-full" id="preview-panel">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Eye size={18} style={{ color: "var(--accent)" }} />
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Önizleme
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {canPreview && (
            <button
              className="btn-ghost p-1.5"
              onClick={() => setIsFullscreen(!isFullscreen)}
              data-tooltip={isFullscreen ? "Küçült" : "Tam Ekran"}
              id="toggle-fullscreen"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
          {outputUrl && (
            <>
              <a
                href={outputUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost p-1.5"
                data-tooltip="Yeni sekmede aç"
                id="open-in-tab"
              >
                <ExternalLink size={15} />
              </a>
              <a
                href={outputUrl}
                download
                className="btn-ghost p-1.5"
                data-tooltip="İndir"
                id="download-output"
              >
                <Download size={15} />
              </a>
            </>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden relative">
        {/* Idle State */}
        {!status && (
          <EmptyState
            icon={<FileText size={40} />}
            title="Henüz çıktı yok"
            description="Bir dosya yükleyin veya metin girin, ardından dönüştür butonuna basın."
          />
        )}

        {/* Pending State */}
        {status === "pending" && (
          <EmptyState
            icon={<div className="spinner spinner-lg" />}
            title="Sırada bekliyor..."
            description="Dönüşüm işlemi kuyruğa alındı."
          />
        )}

        {/* Processing State */}
        {status === "processing" && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="relative">
              <div className="spinner spinner-lg animate-pulse-glow" />
            </div>
            <div className="text-center">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Dönüştürülüyor...
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--foreground-muted)" }}
              >
                Pandoc dönüşüm motoru çalışıyor
              </p>
            </div>
            <div className="progress-bar progress-bar-indeterminate w-48">
              <div className="progress-bar-fill" />
            </div>
          </div>
        )}

        {/* Error State */}
        {status === "failed" && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
              style={{
                background: "var(--error-bg)",
                color: "var(--error)",
              }}
            >
              ✕
            </div>
            <p
              className="text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Dönüşüm Başarısız
            </p>
            {errorMessage && (
              <div
                className="p-3 rounded-lg text-xs text-left max-w-md w-full overflow-auto"
                style={{
                  background: "var(--error-bg)",
                  color: "var(--error)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  fontFamily: "var(--font-geist-mono)",
                  maxHeight: "200px",
                }}
              >
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Completed — Preview Available */}
        {status === "completed" && canPreview && (
          <div className="h-full animate-fade-in">
            <iframe
              src={outputUrl!}
              className="w-full h-full border-0"
              title="Doküman Önizleme"
              sandbox="allow-scripts allow-same-origin"
              id="preview-iframe"
            />
          </div>
        )}

        {/* Completed — No Preview (download only) */}
        {status === "completed" && !canPreview && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: "var(--success-bg)",
                color: "var(--success)",
              }}
            >
              ✓
            </div>
            <div className="text-center">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Dönüşüm Tamamlandı
              </p>
              {executionTimeMs && (
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  {(executionTimeMs / 1000).toFixed(1)} saniyede tamamlandı
                </p>
              )}
            </div>
            {outputUrl && (
              <a href={outputUrl} download className="btn-primary" id="download-btn">
                <Download size={16} />
                Dosyayı İndir
              </a>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      {status === "completed" && executionTimeMs && (
        <div
          className="px-4 py-2 flex items-center justify-between text-xs"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--foreground-muted)",
          }}
        >
          <span className="badge badge-success">Tamamlandı</span>
          <span>{(executionTimeMs / 1000).toFixed(1)}s</span>
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
    <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
      <div style={{ color: "var(--foreground-muted)" }}>{icon}</div>
      <div>
        <p
          className="text-sm font-medium"
          style={{ color: "var(--foreground-secondary)" }}
        >
          {title}
        </p>
        <p
          className="text-xs mt-1"
          style={{ color: "var(--foreground-muted)" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
