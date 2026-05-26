"use client";

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  X,
  AlertCircle,
} from "lucide-react";

// =============================================
// Types
// =============================================

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface UploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  label?: string;
}

// =============================================
// Helpers
// =============================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const icons: Record<string, string> = {
    md: "📝", markdown: "📝",
    tex: "📐", latex: "📐",
    docx: "📄", doc: "📄",
    pdf: "📕",
    html: "🌐", htm: "🌐",
    epub: "📚",
    pptx: "📊", ppt: "📊",
    bib: "📎",
    lua: "🔧",
    py: "🐍",
    json: "📋",
    csv: "📊",
    csl: "📎",
  };
  return icons[ext] || "📄";
}

// =============================================
// Component
// =============================================

export default function Uploader({
  onFilesSelected,
  accept,
  maxSizeMB = 50,
  multiple = true,
  label = "Dosya yükleyin veya sürükleyip bırakın",
}: UploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;

      const maxBytes = maxSizeMB * 1024 * 1024;
      const newFiles: UploadedFile[] = [];
      const validFiles: File[] = [];

      Array.from(fileList).forEach((file) => {
        const uploadedFile: UploadedFile = {
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: "pending",
        };

        if (file.size > maxBytes) {
          uploadedFile.status = "error";
          uploadedFile.error = `Dosya çok büyük (max ${maxSizeMB}MB)`;
        } else {
          uploadedFile.status = "done";
          uploadedFile.progress = 100;
          validFiles.push(file);
        }

        newFiles.push(uploadedFile);
      });

      setFiles((prev) => [...prev, ...newFiles]);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [maxSizeMB, onFilesSelected]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="animate-fade-in">
      {/* Drop Zone */}
      <div
        className={`dropzone ${isDragging ? "dropzone-active" : ""}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        id="file-dropzone"
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="file-input"
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: "var(--accent-subtle)",
              color: "var(--accent)",
            }}
          >
            <Upload size={24} />
          </div>
          <div>
            <p style={{ color: "var(--foreground)", fontWeight: 500 }}>
              {label}
            </p>
            <p
              style={{
                color: "var(--foreground-muted)",
                fontSize: "13px",
                marginTop: "4px",
              }}
            >
              Maksimum {maxSizeMB}MB · {multiple ? "Çoklu dosya desteklenir" : "Tek dosya"}
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg animate-slide-up"
              style={{
                background: "var(--background-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span className="text-lg">{getFileIcon(file.name)}</span>

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm truncate"
                  style={{ color: "var(--foreground)" }}
                >
                  {file.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  {formatFileSize(file.size)}
                </p>
              </div>

              {file.status === "done" && (
                <span className="badge badge-success">✓</span>
              )}

              {file.status === "error" && (
                <div className="flex items-center gap-1">
                  <AlertCircle size={14} style={{ color: "var(--error)" }} />
                  <span className="text-xs" style={{ color: "var(--error)" }}>
                    {file.error}
                  </span>
                </div>
              )}

              {file.status === "uploading" && (
                <div className="spinner" />
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.id);
                }}
                className="btn-ghost p-1"
                style={{ color: "var(--foreground-muted)" }}
                id={`remove-file-${file.id}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
