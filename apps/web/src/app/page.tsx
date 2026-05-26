"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderOpen,
  Clock,
  Zap,
  FileText,
  ArrowRight,
  Search,
  Settings,
  Layers,
  ChevronLeft,
  Menu,
  HelpCircle,
  TrendingUp,
  FileCode,
  CheckCircle2,
  Loader2,
  Globe,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  Code2,
  Shield,
  Star,
  Activity,
} from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import BrandLogo from "@/components/brand-logo";
import { getWorkerAuthToken } from "@/hooks/useConversion";

// =============================================
// Static Demo Projects
// =============================================
const INITIAL_PROJECTS = [
  {
    id: "demo-1",
    name: "Akademik Makale",
    description: "Kuantum Hesaplama araştırma makalesi ve formülleri",
    nameEn: "Academic Paper",
    descriptionEn: "Quantum Computing research paper and formulas",
    format: "PDF (XeLaTeX)",
    updatedAt: "2 saat önce",
    updatedAtEn: "2 hours ago",
    status: "completed" as const,
  },
  {
    id: "demo-2",
    name: "API Dokümantasyonu",
    description: "Pandoc worker modülü REST API teknik referansı",
    nameEn: "API Documentation",
    descriptionEn: "Pandoc worker module REST API technical reference",
    format: "HTML",
    updatedAt: "5 saat önce",
    updatedAtEn: "5 hours ago",
    status: "completed" as const,
  },
  {
    id: "demo-3",
    name: "Kurumsal Performans Raporu",
    description: "Q2 2026 finansal performans ve çıktı analizi",
    nameEn: "Corporate Performance Report",
    descriptionEn: "Q2 2026 financial performance and output analysis",
    format: "DOCX",
    updatedAt: "1 gün önce",
    updatedAtEn: "1 day ago",
    status: "processing" as const,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { theme, language, toggleTheme, toggleLanguage, t, mounted } = useAppSettings();
  
  // States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("all-projects");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Onboarding Wizard States
  const [onboardText, setOnboardText] = useState(
    `# RunDoc Deneme Belgesi\n\nBu doküman **sihirbaz** aracılığıyla derlenmektedir.\n\n$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$\n\n* **Kolay:** Kod yazmadan anında çıktı.\n* **Hızlı:** Yerel derleme gücü.\n`
  );
  const [onboardFormat, setOnboardFormat] = useState("pdf");
  const [onboardStatus, setOnboardStatus] = useState<"idle" | "compiling" | "success" | "failed">("idle");
  const [onboardJobId, setOnboardJobId] = useState<string | null>(null);
  const [onboardError, setOnboardError] = useState("");

  // Handle Onboarding Compilation (Direct API Connect)
  const handleOnboardCompile = async () => {
    setOnboardStatus("compiling");
    setOnboardError("");
    
    try {
      const formData = new FormData();
      formData.append("text", onboardText);
      formData.append("output_format", onboardFormat);
      formData.append("standalone", "true");
      formData.append("smart", "true");
      formData.append("math_rendering", "mathjax");

      const token = getWorkerAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_WORKER_API_URL || "http://localhost:8000"}/api/v1/convert-direct`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Dönüşüm başarısız: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status === "completed") {
        setOnboardStatus("success");
        setOnboardJobId(result.job_id);
      } else {
        setOnboardStatus("failed");
        setOnboardError(result.error_message || "Derleme hatası oluştu.");
      }
    } catch (err: any) {
      setOnboardStatus("failed");
      setOnboardError(err.message || "Bağlantı hatası: Python worker ayakta mı?");
    }
  };

  // Memoized Search Filter
  const filteredProjects = useMemo(() => {
    return INITIAL_PROJECTS.filter((proj) => {
      const name = language === "tr" ? proj.name : proj.nameEn;
      const desc = language === "tr" ? proj.description : proj.descriptionEn;
      const query = searchQuery.toLowerCase();
      return name.toLowerCase().includes(query) || desc.toLowerCase().includes(query) || proj.format.toLowerCase().includes(query);
    });
  }, [searchQuery, language]);

  if (!mounted) return null; // Avoid hydration flash

  return (
    <div className="min-h-screen flex text-[var(--foreground)] transition-colors duration-200" style={{ background: "var(--background)" }}>
      {/* Ambient Radial Glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "var(--gradient-glow)",
          zIndex: 0,
        }}
      />

      {/* Left Sidebar (Notion/Linear style) */}
      <aside
        className={`relative z-20 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out border-r border-[var(--border)]`}
        style={{
          width: sidebarOpen ? "260px" : "0px",
          opacity: sidebarOpen ? 1 : 0,
          background: "var(--sidebar-bg)",
          backdropFilter: "blur(16px)",
          overflow: "hidden",
        }}
      >
        {/* Workspace Brand Selector */}
        <div className="p-4 flex items-center justify-between border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={28} />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold tracking-tight truncate">{t("brand_title")}</span>
              <span className="text-[10px] text-[var(--foreground-muted)]">{t("brand_sub")}</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Global Search Input */}
        <div className="px-3 pt-4 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-[var(--foreground-muted)]" />
            <input
              type="text"
              placeholder={t("search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs text-[var(--foreground)] bg-[var(--background-tertiary)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] transition-all"
            />
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-6">
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold tracking-wider text-[var(--foreground-muted)] uppercase">{t("nav_workspace")}</p>
            <button
              onClick={() => setActiveTab("all-projects")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === "all-projects"
                  ? "bg-[var(--surface)] text-[var(--foreground)] font-semibold shadow-sm border border-[var(--border)]"
                  : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              }`}
            >
              <FolderOpen size={14} />
              <span>{t("nav_projects")}</span>
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === "templates"
                  ? "bg-[var(--surface)] text-[var(--foreground)] font-semibold shadow-sm border border-[var(--border)]"
                  : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              }`}
            >
              <FileText size={14} />
              <span>{t("nav_templates")}</span>
            </button>
            <button
              onClick={() => setActiveTab("filters")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === "filters"
                  ? "bg-[var(--surface)] text-[var(--foreground)] font-semibold shadow-sm border border-[var(--border)]"
                  : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              }`}
            >
              <Layers size={14} />
              <span>{t("nav_filters")}</span>
            </button>
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold tracking-wider text-[var(--foreground-muted)] uppercase">{t("nav_recent_updates")}</p>
            {INITIAL_PROJECTS.map((proj) => (
              <Link
                key={proj.id}
                href={`/workspace/${proj.id}`}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all truncate"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                <span className="truncate">{language === "tr" ? proj.name : proj.nameEn}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--foreground-muted)]">
          <div className="flex items-center gap-2">
            <BrandLogo size={20} />
            <span className="text-[10px] font-mono">{t("nav_version")}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button
              onClick={toggleLanguage}
              className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer font-bold text-[10px]"
              title={language === "tr" ? "English" : "Türkçe"}
            >
              <Globe size={14} />
            </button>

            <button 
              onClick={() => router.push("/workspace/settings")}
              className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title="Workspace Settings"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Closed Sidebar Floating Trigger */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 p-2 rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-all cursor-pointer shadow-lg backdrop-blur-sm"
        >
          <Menu size={16} />
        </button>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col relative z-10 overflow-y-auto">
        {/* Top Nav Header */}
        <header className="px-6 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background-secondary)]/60 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[var(--foreground-muted)]">Workspace</span>
              <span className="text-[var(--border)]">/</span>
              <span className="font-semibold text-[var(--foreground)]">
                {activeTab === "all-projects" ? t("nav_projects") : activeTab === "templates" ? t("nav_templates") : t("nav_filters")}
              </span>
            </div>
            <span className="badge badge-info text-[9px] font-bold px-1.5 py-0.5 rounded-full">{t("badge_beta")}</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/workspace/new" className="btn-primary py-2 px-4 text-xs rounded-lg shadow-sm transition-all" id="new-project-btn">
              <Plus size={14} />
              {t("new_project_btn")}
            </Link>
          </div>
        </header>

        {/* Dashboard Grid Container */}
        <div className="max-w-5xl w-full mx-auto px-6 py-10 space-y-10 flex-1">
          
          {/* ============================================= */}
          {/* HERO SECTION — Brand Identity + Trust Signals */}
          {/* ============================================= */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--background-secondary)] p-8 animate-fade-in">
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: "radial-gradient(ellipse 60% 50% at 70% 20%, rgba(94, 97, 230, 0.08) 0%, transparent 70%)"
            }} />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <BrandLogo size={40} />
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                      {t("welcome_title")}
                    </h1>
                    <p className="text-sm font-semibold bg-gradient-to-r from-[#818cf8] via-[#a78bfa] to-[#c084fc] bg-clip-text text-transparent">
                      {t("hero_tagline")}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--foreground-secondary)] max-w-lg leading-relaxed">
                  {t("hero_subtitle")}
                </p>
              </div>
              
              <button
                onClick={() => router.push("/workspace/new")}
                className="btn-primary py-3 px-6 text-sm rounded-xl whitespace-nowrap"
              >
                <Zap size={16} />
                {t("hero_cta")}
              </button>
            </div>

            {/* Trust Badges */}
            <div className="relative z-10 flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 text-xs text-[var(--foreground-secondary)]">
                <div className="w-7 h-7 rounded-lg bg-[var(--success-bg)] text-[var(--success)] flex items-center justify-center">
                  <TrendingUp size={14} />
                </div>
                <div>
                  <span className="font-bold text-[var(--foreground)]">500K+</span>{" "}
                  {t("trust_conversions")}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--foreground-secondary)]">
                <div className="w-7 h-7 rounded-lg bg-[var(--info-bg)] text-[var(--info)] flex items-center justify-center">
                  <Activity size={14} />
                </div>
                <div>
                  <span className="font-bold text-[var(--foreground)]">99.9%</span>{" "}
                  {t("trust_uptime")}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--foreground-secondary)]">
                <div className="w-7 h-7 rounded-lg bg-[var(--warning-bg)] text-[var(--warning)] flex items-center justify-center">
                  <Star size={14} />
                </div>
                <div>
                  <span className="font-bold text-[var(--foreground)]">4.8/5</span>{" "}
                  {t("trust_rating")}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--foreground-secondary)]">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
                  <Shield size={14} />
                </div>
                <div className="text-[var(--foreground-muted)]">
                  {t("footer_data_safe")}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--accent)] bg-[var(--accent-subtle)]">
                <TrendingUp size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-[var(--foreground)]">1,247</p>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--foreground-muted)]">{t("stats_total_conversions")}</p>
              </div>
            </div>
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--info)] bg-[var(--info-bg)]">
                <FileCode size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-[var(--foreground)]">40+</p>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--foreground-muted)]">{t("stats_formats")}</p>
              </div>
            </div>
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--success)] bg-[var(--success-bg)]">
                <FolderOpen size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{filteredProjects.length}</p>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--foreground-muted)]">{t("stats_active_projects")}</p>
              </div>
            </div>
          </div>

          {/* ONBOARDING COMPILER WIZARD */}
          <div className="glass-card p-6 rounded-xl space-y-5 bg-[var(--background-secondary)]/30 backdrop-blur-sm animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#818cf8] to-[#a78bfa] text-white flex items-center justify-center shadow-md">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("onboard_title")}</h3>
                <p className="text-[11px] text-[var(--foreground-muted)]">{t("onboard_desc")}</p>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2">
              {[
                { num: 1, label: t("onboard_step1") },
                { num: 2, label: t("onboard_step2") },
                { num: 3, label: t("onboard_step3") },
              ].map((step, i) => (
                <div key={step.num} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    (step.num === 1 && onboardText) || (step.num === 2 && onboardFormat) || (step.num === 3 && onboardStatus === "success")
                      ? "bg-gradient-to-r from-[#818cf8] to-[#a78bfa] text-white shadow-sm"
                      : "bg-[var(--background-tertiary)] text-[var(--foreground-muted)] border border-[var(--border)]"
                  }`}>
                    {(step.num === 3 && onboardStatus === "success") ? <CheckCircle2 size={12} /> : step.num}
                  </div>
                  <span className="text-[10px] text-[var(--foreground-secondary)] font-medium hidden sm:inline">{step.label}</span>
                  {i < 2 && <div className="w-6 h-[1px] bg-[var(--border)]" />}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Input Editor */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">{t("onboard_input_label")}</label>
                <textarea
                  value={onboardText}
                  onChange={(e) => setOnboardText(e.target.value)}
                  rows={6}
                  className="w-full p-3 text-xs font-mono rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] text-[var(--foreground)] resize-none transition-all"
                />
              </div>
              
              {/* Output Form & Trigger */}
              <div className="flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">{t("onboard_format_label")}</label>
                  <select
                    value={onboardFormat}
                    onChange={(e) => setOnboardFormat(e.target.value)}
                    className="select-field text-xs"
                  >
                    <option value="pdf">📕 PDF (Typst Engine)</option>
                    <option value="html">🌐 HTML5 Web Output</option>
                    <option value="docx">📄 Microsoft Word (.docx)</option>
                    <option value="epub">📚 EPUB eBook</option>
                  </select>
                </div>

                {/* Compilation Success Notification */}
                {onboardStatus === "success" && onboardJobId && (
                  <div className="p-3 rounded-lg border border-[var(--success)]/20 bg-[var(--success-bg)] text-[var(--success)] flex items-center justify-between text-xs animate-slide-up">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      <span className="font-medium">{t("onboard_success")}</span>
                    </div>
                    <button
                      onClick={() => router.push(`/workspace/sandbox?job_id=${onboardJobId}`)}
                      className="py-1.5 px-3 rounded-md bg-[var(--success)] text-white text-[10px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
                    >
                      <span>İncele / Preview</span>
                      <ArrowRight size={10} />
                    </button>
                  </div>
                )}

                {/* Compilation Error Notification */}
                {onboardStatus === "failed" && (
                  <div className="p-3 rounded-lg border border-[var(--error)]/15 bg-[var(--error-bg)] text-[var(--error)] text-[11px] leading-relaxed animate-slide-up flex items-start gap-2">
                    <span className="mt-0.5">⚠️</span>
                    <span>{onboardError}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={handleOnboardCompile}
                  disabled={onboardStatus === "compiling"}
                  className="btn-primary w-full py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer font-bold text-xs"
                >
                  {onboardStatus === "compiling" ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{t("settings_converting")}</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      <span>{t("onboard_compile_btn")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions (Presets) */}
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: "300ms" }}>
            <h2 className="text-xs uppercase font-bold tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5">
              <Zap size={12} className="text-[var(--accent)]" />
              {t("quick_presets")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div 
                onClick={() => router.push("/workspace/new?format=pdf")}
                className="glass-card p-5 group cursor-pointer flex flex-col"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-[var(--accent-subtle)] text-[var(--accent)] group-hover:scale-110 transition-transform">
                  <FileText size={16} />
                </div>
                <p className="text-xs font-semibold text-[var(--foreground)] mb-1 group-hover:text-[var(--accent)] transition-colors">
                  Markdown → PDF
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)] leading-normal mt-auto">
                  {t("quick_pdf_desc")}
                </p>
              </div>
              <div 
                onClick={() => router.push("/workspace/new?format=docx")}
                className="glass-card p-5 group cursor-pointer flex flex-col"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                  <BookOpen size={16} />
                </div>
                <p className="text-xs font-semibold text-[var(--foreground)] mb-1 group-hover:text-[var(--accent)] transition-colors">
                  LaTeX → DOCX
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)] leading-normal mt-auto">
                  {t("quick_docx_desc")}
                </p>
              </div>
              <div 
                onClick={() => router.push("/workspace/new?format=html")}
                className="glass-card p-5 group cursor-pointer flex flex-col"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Globe size={16} />
                </div>
                <p className="text-xs font-semibold text-[var(--foreground)] mb-1 group-hover:text-[var(--accent)] transition-colors">
                  DOCX → HTML
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)] leading-normal mt-auto">
                  {t("quick_html_desc")}
                </p>
              </div>
              <div 
                onClick={() => router.push("/workspace/new?format=revealjs")}
                className="glass-card p-5 group cursor-pointer flex flex-col"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Code2 size={16} />
                </div>
                <p className="text-xs font-semibold text-[var(--foreground)] mb-1 group-hover:text-[var(--accent)] transition-colors">
                  Markdown → Slayt
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)] leading-normal mt-auto">
                  {t("quick_slide_desc")}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Document Transactions */}
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: "400ms" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase font-bold tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5">
                <Clock size={12} />
                {t("recent_transactions")}
              </h2>
              <button 
                onClick={() => router.push("/workspace/projects")}
                className="btn-ghost text-xs py-1.5 px-3 rounded-lg hover:bg-[var(--surface)] text-[var(--foreground-secondary)] flex items-center gap-1 cursor-pointer"
              >
                {t("view_all_projects")}
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--background-secondary)]/30 backdrop-blur-sm shadow-md">
              <div className="divide-y divide-[var(--border)]">
                {filteredProjects.length === 0 ? (
                  /* Empty State — Helpful content */
                  <div className="p-10 text-center space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
                      <FolderOpen size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{t("empty_state_title")}</p>
                      <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto mt-1">{t("empty_state_desc")}</p>
                    </div>
                    <button
                      onClick={() => router.push("/workspace/new")}
                      className="btn-primary py-2 px-5 text-xs rounded-lg mx-auto"
                    >
                      <Plus size={14} />
                      {t("empty_state_cta")}
                    </button>
                  </div>
                ) : (
                  filteredProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/workspace/${project.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-[var(--surface-hover)]/50 transition-all group"
                      style={{ textDecoration: "none" }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--background-tertiary)] flex items-center justify-center flex-shrink-0 text-[var(--foreground-secondary)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)] transition-all">
                          <FolderOpen size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--foreground)] truncate group-hover:text-[var(--accent)] transition-colors mb-0.5">
                            {language === "tr" ? project.name : project.nameEn}
                          </p>
                          <p className="text-[11px] text-[var(--foreground-muted)] truncate max-w-md">
                            {language === "tr" ? project.description : project.descriptionEn}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-auto sm:ml-0 flex-shrink-0">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono bg-[var(--background-tertiary)] border border-[var(--border)] text-[var(--foreground-secondary)]">
                          {project.format}
                        </span>
                        
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold ${
                          project.status === "completed" 
                            ? "bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/15" 
                            : "bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]/15"
                        }`}>
                          {project.status === "completed" ? (
                            <CheckCircle2 size={10} className="flex-shrink-0" />
                          ) : (
                            <Loader2 size={10} className="animate-spin flex-shrink-0" />
                          )}
                          {project.status === "completed" ? (language === "tr" ? "Tamamlandı" : "Completed") : (language === "tr" ? "İşleniyor" : "Processing")}
                        </span>

                        <span className="text-[10px] text-[var(--foreground-muted)]">
                          {language === "tr" ? project.updatedAt : project.updatedAtEn}
                        </span>

                        <ArrowRight
                          size={14}
                          className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[var(--foreground-muted)] hidden sm:block"
                        />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Global Footer — Enhanced with KVKK + Privacy */}
        <footer className="mt-auto py-6 border-t border-[var(--border)] bg-[var(--background-secondary)]/20 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-[var(--foreground-muted)]">
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-[var(--success)]" />
              <p>RunDoc · {t("pandoc_orchestrator")} · {t("footer_powered")}</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/support" className="hover:text-[var(--foreground)] transition-colors">{t("nav_help")}</Link>
              <Link href="/api-docs" className="hover:text-[var(--foreground)] transition-colors">{t("nav_api")}</Link>
              <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">{t("nav_terms")}</Link>
              <Link href="/terms#privacy" className="hover:text-[var(--foreground)] transition-colors font-semibold">{t("nav_privacy")}</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
