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

    // Custom dark theme — softer, no harsh red error markers
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
        { token: "tag", foreground: "818cf8" },
        { token: "attribute.name", foreground: "818cf8" },
        { token: "attribute.value", foreground: "34d399" },
        // Markdown specific
        { token: "markup.heading", foreground: "818cf8", fontStyle: "bold" },
        { token: "markup.bold", fontStyle: "bold" },
        { token: "markup.italic", fontStyle: "italic" },
        { token: "markup.inline", foreground: "fb923c" },
      ],
      colors: {
        "editor.background": "#0c0c16",
        "editor.foreground": "#f0f0f5",
        "editor.lineHighlightBackground": "#ffffff05",
        "editor.selectionBackground": "#5e61e633",
        "editor.inactiveSelectionBackground": "#5e61e615",
        "editorCursor.foreground": "#818cf8",
        "editorLineNumber.foreground": "#2a2a42",
        "editorLineNumber.activeForeground": "#9d9db5",
        "editorIndentGuide.background": "rgba(255, 255, 255, 0.04)",
        "editorIndentGuide.activeBackground": "rgba(255, 255, 255, 0.08)",
        "editor.selectionHighlightBackground": "#5e61e615",
        "editorBracketMatch.background": "#5e61e620",
        "editorBracketMatch.border": "#5e61e640",
        "scrollbar.shadow": "#00000000",
        "scrollbarSlider.background": "rgba(255, 255, 255, 0.04)",
        "scrollbarSlider.hoverBackground": "rgba(255, 255, 255, 0.07)",
        "scrollbarSlider.activeBackground": "rgba(255, 255, 255, 0.10)",
        // ✅ Fix: Override error/warning marker colors — no red stripes
        "editorError.foreground": "#fbbf24",
        "editorWarning.foreground": "#fbbf24",
        "editorInfo.foreground": "#60a5fa",
        "editorError.border": "#00000000",
        "editorWarning.border": "#00000000",
        // ✅ Fix: Overview ruler colors — remove red strips
        "editorOverviewRuler.errorForeground": "#00000000",
        "editorOverviewRuler.warningForeground": "#00000000",
        "editorOverviewRuler.infoForeground": "#00000000",
        "editorOverviewRuler.border": "#00000000",
        "editorOverviewRuler.background": "#00000000",
        // ✅ Fix: Gutter/margin — no red decorations
        "editorGutter.background": "#0c0c16",
        "editorGutter.addedBackground": "#34d39940",
        "editorGutter.modifiedBackground": "#60a5fa40",
        "editorGutter.deletedBackground": "#fbbf2440",
        // Minimap
        "minimap.background": "#0c0c16",
        "minimap.errorHighlight": "#fbbf2440",
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
            <span style={{ color: "var(--foreground-muted)", fontSize: "13px" }}>
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
          // ✅ Fix: Completely disable red overview ruler and error decorations
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          renderValidationDecorations: "off" as any,
          // Disable red squiggly underlines for markdown content
          "semanticHighlighting.enabled": false as any,
        }}
      />
    </div>
  );
}
