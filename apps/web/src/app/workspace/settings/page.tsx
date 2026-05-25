"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Settings,
  Server,
  Globe,
  Sliders,
  Sparkles,
  Save,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, language, toggleTheme, toggleLanguage, t, mounted } = useAppSettings();

  // Settings states stored in localStorage
  const [workerApiUrl, setWorkerApiUrl] = useState("http://localhost:8000");
  const [defaultEngine, setDefaultEngine] = useState("typst");
  const [defaultHighlight, setDefaultHighlight] = useState("pygments");
  const [authorName, setAuthorName] = useState("Dr. Ahmet Yılmaz");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUrl = localStorage.getItem("rundoc-worker-api-url");
      if (storedUrl) setWorkerApiUrl(storedUrl);

      const storedEngine = localStorage.getItem("rundoc-default-engine");
      if (storedEngine) setDefaultEngine(storedEngine);

      const storedHighlight = localStorage.getItem("rundoc-default-highlight");
      if (storedHighlight) setDefaultHighlight(storedHighlight);

      const storedAuthor = localStorage.getItem("rundoc-author-name");
      if (storedAuthor) setAuthorName(storedAuthor);
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rundoc-worker-api-url", workerApiUrl);
      localStorage.setItem("rundoc-default-engine", defaultEngine);
      localStorage.setItem("rundoc-default-highlight", defaultHighlight);
      localStorage.setItem("rundoc-author-name", authorName);
      
      // Emit event for state sync
      window.dispatchEvent(new Event("storage"));
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen flex flex-col text-[var(--foreground)]"
      style={{ background: "var(--background)" }}
    >
      {/* Ambient Radial Glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "var(--gradient-glow)",
          zIndex: 0,
        }}
      />

      {/* Top Header */}
      <header
        className="px-6 py-3 border-b sticky top-0 z-10 backdrop-blur-md flex items-center justify-between"
        style={{
          borderColor: "var(--border)",
          background: "var(--sidebar-bg)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 rounded hover:bg-[var(--surface-hover)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold">
              {language === "tr" ? "Çalışma Alanı Ayarları" : "Workspace Settings"}
            </span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="btn-primary py-1.5 px-4 text-xs rounded-md flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Save size={14} />
          <span>{language === "tr" ? "Ayarları Kaydet" : "Save Settings"}</span>
        </button>
      </header>

      {/* Main Settings Container */}
      <main className="max-w-3xl w-full mx-auto px-6 py-8 space-y-8 relative z-10 flex-1">
        
        {/* On Save Notification */}
        {isSaved && (
          <div className="p-3 border border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)] rounded-lg flex items-center gap-2 text-xs animate-slide-up">
            <CheckCircle2 size={15} />
            <span>{language === "tr" ? "Tüm ayarlar başarıyla tarayıcınıza kaydedildi." : "All configurations successfully saved to your browser."}</span>
          </div>
        )}

        {/* Section 1: Server Config */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: "var(--border)" }}>
            <Server size={16} className="text-[var(--accent)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
              {language === "tr" ? "GELİŞTİRİCİ VE BAĞLANTI AYARLARI" : "DEVELOPER & SERVER CONNECTIVITY"}
            </h3>
          </div>

          <div className="glass-card p-5 border border-[var(--border)] rounded-xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--foreground-secondary)]">
                {language === "tr" ? "Python Worker API Uç Noktası (WORKER_API_URL):" : "Python Worker API Endpoint (WORKER_API_URL):"}
              </label>
              <input
                type="text"
                value={workerApiUrl}
                onChange={(e) => setWorkerApiUrl(e.target.value)}
                className="input-field text-xs"
              />
              <p className="text-[10px] text-[var(--foreground-muted)]">
                {language === "tr" 
                  ? "Next.js uygulamasının yerel Pandoc derleyicisine bağlanmak için kullandığı FastAPI adresi." 
                  : "FastAPI server endpoint used by the Next.js frontend to dispatch direct Pandoc compilations."}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Default Compiler Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: "var(--border)" }}>
            <Sliders size={16} className="text-[var(--accent)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
              {language === "tr" ? "DERLEME VE PANDOC VARSAYILANLARI" : "COMPILER & PANDOC DEFAULTS"}
            </h3>
          </div>

          <div className="glass-card p-5 border border-[var(--border)] rounded-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Default PDF Engine */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--foreground-secondary)]">
                  {language === "tr" ? "Varsayılan PDF Motoru:" : "Default PDF Engine:"}
                </label>
                <select
                  value={defaultEngine}
                  onChange={(e) => setDefaultEngine(e.target.value)}
                  className="select-field text-xs"
                >
                  <option value="typst">Typst (Hızlı & Modern)</option>
                  <option value="xelatex">XeLaTeX (Akademik Standart)</option>
                  <option value="weasyprint">WeasyPrint (HTML/CSS)</option>
                </select>
              </div>

              {/* Default Highlight style */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--foreground-secondary)]">
                  {language === "tr" ? "Varsayılan Kod Stil Renklendirmesi:" : "Default Code Highlight Style:"}
                </label>
                <select
                  value={defaultHighlight}
                  onChange={(e) => setDefaultHighlight(e.target.value)}
                  className="select-field text-xs"
                >
                  <option value="pygments">Pygments</option>
                  <option value="monokai">Monokai</option>
                  <option value="espresso">Espresso</option>
                  <option value="zenburn">Zenburn</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Template Metadata */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: "var(--border)" }}>
            <Sparkles size={16} className="text-[var(--accent)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
              {language === "tr" ? "DOKÜMAN METADATA ŞABLONU" : "DOCUMENT METADATA TEMPLATE"}
            </h3>
          </div>

          <div className="glass-card p-5 border border-[var(--border)] rounded-xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--foreground-secondary)]">
                {language === "tr" ? "Varsayılan Yazar İsmi (YAML metadata):" : "Default Author Name (YAML metadata):"}
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="input-field text-xs"
              />
              <p className="text-[10px] text-[var(--foreground-muted)]">
                {language === "tr" 
                  ? "Yeni derlemelerde otomatik doldurulan yazar adı şablonu." 
                  : "Default author parameter pre-filled inside newly composed document YAML frontmatters."}
              </p>
            </div>
          </div>
        </div>

        {/* Security Info Card */}
        <div className="p-4 border rounded-xl flex gap-3 text-xs bg-[var(--background-tertiary)]" style={{ borderColor: "var(--border)" }}>
          <Lock className="text-[var(--accent)] flex-shrink-0" size={16} />
          <div className="space-y-1">
            <p className="font-semibold text-[var(--foreground-secondary)]">
              {language === "tr" ? "Sandbox Güvenlik ve Gizlilik Garantisi" : "Sandbox Security & Isolation Guarantee"}
            </p>
            <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
              {language === "tr" 
                ? "Çalışma alanı ve derleme ayarlarınız tamamen tarayıcınızın yerel depolama alanında (localStorage) barındırılır. Sunucularımıza hiçbir hassas API anahtarı veya kişisel veri aktarılmaz."
                : "Your workspace settings and layout configurations are exclusively stored inside your local browser sandbox (localStorage). No API keys or configurations are transmitted to remote cloud databases."}
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
