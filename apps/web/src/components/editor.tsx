"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import Editor, { type OnMount, useMonaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";

// =============================================
// Types
// =============================================

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
  theme?: "dark" | "light";
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
  theme = "dark",
}: CodeEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [isReady, setIsReady] = useState(false);
  const monaco = useMonaco();

  const monacoLanguage = LANGUAGE_MAP[language] || "plaintext";

  // Register themes when monaco is available
  useEffect(() => {
    if (monaco) {
      // Dark Theme (Nordic Green)
      monaco.editor.defineTheme("rundoc-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "7b8a81", fontStyle: "italic" },
          { token: "keyword", foreground: "3e8b6a" },
          { token: "string", foreground: "49a67d" },
          { token: "number", foreground: "d9a441" },
          { token: "type", foreground: "4c7db3" },
          { token: "function", foreground: "3e8b6a" },
          { token: "variable", foreground: "e6efe8" },
          { token: "constant", foreground: "d9a441" },
          { token: "tag", foreground: "3e8b6a" },
          { token: "attribute.name", foreground: "3e8b6a" },
          { token: "attribute.value", foreground: "49a67d" },
          { token: "markup.heading", foreground: "3e8b6a", fontStyle: "bold" },
          { token: "markup.bold", fontStyle: "bold" },
          { token: "markup.italic", fontStyle: "italic" },
          { token: "markup.inline", foreground: "49a67d" },
        ],
        colors: {
          "editor.background": "#0b1310",
          "editor.foreground": "#e6efe8",
          "editor.lineHighlightBackground": "#ffffff05",
          "editor.selectionBackground": "#3e8b6a33",
          "editor.inactiveSelectionBackground": "#3e8b6a15",
          "editorCursor.foreground": "#3e8b6a",
          "editorLineNumber.foreground": "#2a3b31",
          "editorLineNumber.activeForeground": "#9fb0a5",
          "editorIndentGuide.background": "rgba(255, 255, 255, 0.04)",
          "editorIndentGuide.activeBackground": "rgba(255, 255, 255, 0.08)",
          "editor.selectionHighlightBackground": "#3e8b6a15",
          "editorBracketMatch.background": "#3e8b6a20",
          "editorBracketMatch.border": "#3e8b6a40",
          "scrollbar.shadow": "#00000000",
          "scrollbarSlider.background": "rgba(255, 255, 255, 0.04)",
          "scrollbarSlider.hoverBackground": "rgba(255, 255, 255, 0.07)",
          "scrollbarSlider.activeBackground": "rgba(255, 255, 255, 0.10)",
          "editorError.foreground": "#e45656",
          "editorWarning.foreground": "#d9a441",
          "editorInfo.foreground": "#4c7db3",
          "editorError.border": "#00000000",
          "editorWarning.border": "#00000000",
          "editorOverviewRuler.errorForeground": "#00000000",
          "editorOverviewRuler.warningForeground": "#00000000",
          "editorOverviewRuler.infoForeground": "#00000000",
          "editorOverviewRuler.border": "#00000000",
          "editorOverviewRuler.background": "#00000000",
          "editorGutter.background": "#0b1310",
          "editorGutter.addedBackground": "#49a67d40",
          "editorGutter.modifiedBackground": "#3e8b6a40",
          "editorGutter.deletedBackground": "#e4565640",
          "minimap.background": "#0b1310",
          "minimap.errorHighlight": "#e4565640",
        },
      });

      // Light Theme (Nordic Cream/Brown)
      monaco.editor.defineTheme("rundoc-light", {
        base: "vs",
        inherit: true,
        rules: [
          { token: "comment", foreground: "9a8d80", fontStyle: "italic" },
          { token: "keyword", foreground: "8a5a2b" },
          { token: "string", foreground: "2f805d" },
          { token: "number", foreground: "c4912d" },
          { token: "type", foreground: "8a5a2b" },
          { token: "function", foreground: "8a5a2b" },
          { token: "variable", foreground: "2b241d" },
          { token: "constant", foreground: "c4912d" },
          { token: "tag", foreground: "8a5a2b" },
          { token: "attribute.name", foreground: "8a5a2b" },
          { token: "attribute.value", foreground: "2f805d" },
          { token: "markup.heading", foreground: "8a5a2b", fontStyle: "bold" },
          { token: "markup.bold", fontStyle: "bold" },
          { token: "markup.italic", fontStyle: "italic" },
          { token: "markup.inline", foreground: "2f805d" },
        ],
        colors: {
          "editor.background": "#fbf7f0",
          "editor.foreground": "#2b241d",
          "editor.lineHighlightBackground": "#00000005",
          "editor.selectionBackground": "#8a5a2b25",
          "editor.inactiveSelectionBackground": "#8a5a2b10",
          "editorCursor.foreground": "#8a5a2b",
          "editorLineNumber.foreground": "#e3d7c8",
          "editorLineNumber.activeForeground": "#9a8d80",
          "editorIndentGuide.background": "rgba(0, 0, 0, 0.04)",
          "editorIndentGuide.activeBackground": "rgba(0, 0, 0, 0.08)",
          "editor.selectionHighlightBackground": "#8a5a2b10",
          "editorBracketMatch.background": "#8a5a2b20",
          "editorBracketMatch.border": "#8a5a2b40",
          "scrollbar.shadow": "#00000000",
          "scrollbarSlider.background": "rgba(0, 0, 0, 0.04)",
          "scrollbarSlider.hoverBackground": "rgba(0, 0, 0, 0.07)",
          "scrollbarSlider.activeBackground": "rgba(0, 0, 0, 0.10)",
          "editorError.foreground": "#c94444",
          "editorWarning.foreground": "#c4912d",
          "editorInfo.foreground": "#3d6ea6",
          "editorError.border": "#00000000",
          "editorWarning.border": "#00000000",
          "editorOverviewRuler.errorForeground": "#00000000",
          "editorOverviewRuler.warningForeground": "#00000000",
          "editorOverviewRuler.infoForeground": "#00000000",
          "editorOverviewRuler.border": "#00000000",
          "editorOverviewRuler.background": "#00000000",
          "editorGutter.background": "#fbf7f0",
          "editorGutter.addedBackground": "#2f805d40",
          "editorGutter.modifiedBackground": "#8a5a2b40",
          "editorGutter.deletedBackground": "#c9444440",
          "minimap.background": "#fbf7f0",
          "minimap.errorHighlight": "#c9444440",
        },
      });

      // Apply theme based on current prop
      monaco.editor.setTheme(theme === "dark" ? "rundoc-dark" : "rundoc-light");
    }
  }, [monaco, theme]);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    setIsReady(true);

    if (monacoLanguage === "markdown") {
      editor.updateOptions({ wordWrap: "on" });
    }

    editor.focus();
  }, [monacoLanguage]);

  return (
    <div className="monaco-container" style={{ height }} id="code-editor">
      {!isReady && (
        <div
          className="flex items-center justify-center h-full"
          style={{ background: "var(--background)" }}
        >
          <div className="flex items-center gap-3">
            <span style={{ color: "var(--foreground-muted)", fontSize: "12px", fontWeight: 500 }}>
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
        theme={theme === "dark" ? "rundoc-dark" : "rundoc-light"}
        loading={null}
        options={{
          fontSize: 14,
          lineHeight: 24, // better readability
          fontFamily: "var(--font-mono), 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          padding: { top: 24, bottom: 24 }, // increased padding
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
          lineDecorationsWidth: 16,
          lineNumbersMinChars: 3,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          renderValidationDecorations: "off",
        }}
      />
    </div>
  );
}
