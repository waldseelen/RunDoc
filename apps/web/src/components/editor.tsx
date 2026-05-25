"use client";

import { useRef, useCallback, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";

// =============================================
// Types
// =============================================

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
}

// =============================================
// Language Map
// =============================================

const LANGUAGE_MAP: Record<string, string> = {
  markdown: "markdown",
  md: "markdown",
  html: "html",
  latex: "latex",
  tex: "latex",
  lua: "lua",
  python: "python",
  py: "python",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  css: "css",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  xml: "xml",
  sql: "sql",
  bibtex: "plaintext",
  bib: "plaintext",
  rst: "plaintext",
};

// =============================================
// Component
// =============================================

export default function CodeEditor({
  value,
  onChange,
  language = "markdown",
  readOnly = false,
  height = "100%",
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  const monacoLanguage = LANGUAGE_MAP[language] || "plaintext";

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    setIsReady(true);

    // Custom dark theme
    monaco.editor.defineTheme("rundoc-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "keyword", foreground: "818cf8" },
        { token: "string", foreground: "34d399" },
        { token: "number", foreground: "f59e0b" },
        { token: "type", foreground: "60a5fa" },
        { token: "function", foreground: "c084fc" },
        { token: "variable", foreground: "e8eaed" },
        { token: "constant", foreground: "fb923c" },
        { token: "tag", foreground: "f87171" },
        { token: "attribute.name", foreground: "818cf8" },
        { token: "attribute.value", foreground: "34d399" },
        // Markdown specific
        { token: "markup.heading", foreground: "818cf8", fontStyle: "bold" },
        { token: "markup.bold", fontStyle: "bold" },
        { token: "markup.italic", fontStyle: "italic" },
        { token: "markup.inline", foreground: "fb923c" },
      ],
      colors: {
        "editor.background": "#0f1117",
        "editor.foreground": "#e8eaed",
        "editor.lineHighlightBackground": "#1a1d2610",
        "editor.selectionBackground": "#6366f130",
        "editor.inactiveSelectionBackground": "#6366f115",
        "editorCursor.foreground": "#6366f1",
        "editorLineNumber.foreground": "#3a3d4a",
        "editorLineNumber.activeForeground": "#6b7280",
        "editorIndentGuide.background": "#1f2230",
        "editorIndentGuide.activeBackground": "#2a2d3a",
        "editor.selectionHighlightBackground": "#6366f115",
        "editorBracketMatch.background": "#6366f120",
        "editorBracketMatch.border": "#6366f140",
        "scrollbar.shadow": "#00000000",
        "scrollbarSlider.background": "#2a2d3a60",
        "scrollbarSlider.hoverBackground": "#3a3d4a80",
        "scrollbarSlider.activeBackground": "#4a4d5a80",
      },
    });

    monaco.editor.setTheme("rundoc-dark");

    // Word wrap for markdown
    if (monacoLanguage === "markdown") {
      editor.updateOptions({ wordWrap: "on" });
    }

    // Focus editor
    editor.focus();
  }, [monacoLanguage]);

  return (
    <div className="monaco-container" style={{ height }} id="code-editor">
      {!isReady && (
        <div
          className="flex items-center justify-center h-full"
          style={{ background: "var(--background-secondary)" }}
        >
          <div className="flex items-center gap-3">
            <div className="spinner" />
            <span style={{ color: "var(--foreground-muted)", fontSize: "14px" }}>
              Editör yükleniyor...
            </span>
          </div>
        </div>
      )}
      <Editor
        height={height}
        language={monacoLanguage}
        value={value}
        onChange={(val) => onChange(val || "")}
        onMount={handleMount}
        theme="rundoc-dark"
        loading={null}
        options={{
          fontSize: 14,
          lineHeight: 22,
          fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          renderLineHighlight: "line",
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          suggest: { showWords: false },
          readOnly,
          tabSize: 2,
          wordWrap: "off",
          lineNumbers: "on",
          folding: true,
          glyphMargin: false,
          lineDecorationsWidth: 8,
          lineNumbersMinChars: 3,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
        }}
      />
    </div>
  );
}
