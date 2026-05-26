"use client";

import Link from "next/link";
import { useAppSettings } from "@/hooks/useAppSettings";
import BrandLogo from "@/components/brand-logo";
import {
  ArrowRight,
  ShieldCheck,
  Gauge,
  Layers,
  Globe,
  Sun,
  Moon,
  PenLine,
  Settings2,
  Eye,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const { theme, language, toggleTheme, toggleLanguage, mounted } = useAppSettings();

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col text-[var(--foreground)] transition-colors duration-200 bg-[var(--background)]">

      {/* Top Navigation */}
      <header className="relative z-20 px-6 py-4 border-b border-[var(--border)] bg-[var(--background-secondary)]/80 backdrop-blur-xl flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="p-2 bg-[var(--accent-subtle)] border border-[var(--accent)]/20 rounded-xl">
            <BrandLogo size={22} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-extrabold tracking-tight text-[var(--foreground)]">RunDoc</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-muted)] font-semibold">
              Document Converter
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/workspace" className="btn-primary px-4 py-2 text-[11px] uppercase tracking-wider font-semibold">
            {language === "tr" ? "Dönüştür" : "Convert"}
            <ArrowRight size={14} />
          </Link>
          <button onClick={toggleTheme} className="p-2.5 rounded-xl hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all cursor-pointer shadow-sm">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={toggleLanguage} className="p-2.5 rounded-xl hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all cursor-pointer shadow-sm">
            <Globe size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[10px] uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
              <Sparkles size={12} className="text-[var(--accent)]" />
              {language === "tr" ? "Açık Kaynak SaaS" : "Open-Source SaaS"}
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              {language === "tr" ? "Açık kaynak doküman dönüşümü," : "Open-source document conversion,"}
              <span className="text-[var(--accent)]"> {language === "tr" ? "tek akışta." : "one focused flow."}</span>
            </h1>
            <p className="text-lg text-[var(--foreground-secondary)] leading-relaxed max-w-xl">
              {language === "tr"
                ? "Açık kaynak SaaS yaklaşımıyla Markdown, LaTeX, Word, HTML ve PDF arasında hızlı ve gizlilik odaklı dönüşüm. Editör, ayarlar ve canlı önizleme tek ekranda."
                : "Open-source SaaS approach for fast, privacy-first conversion between Markdown, LaTeX, Word, HTML and PDF. Editor, settings, and live preview in one screen."}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/workspace" className="btn-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider">
                {language === "tr" ? "Dönüştürmeye Başla" : "Start Converting"}
                <ArrowRight size={16} />
              </Link>
              <Link href="#capabilities" className="btn-secondary px-6 py-3 text-sm font-semibold uppercase tracking-wider">
                {language === "tr" ? "Neler Yapılabilir?" : "What You Can Do"}
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs text-[var(--foreground-muted)]">
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <p className="text-sm font-bold text-[var(--foreground)]">40+</p>
                <p>{language === "tr" ? "Format" : "Formats"}</p>
              </div>
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <p className="text-sm font-bold text-[var(--foreground)]">0</p>
                <p>{language === "tr" ? "Kayıt" : "Sign-up"}</p>
              </div>
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <p className="text-sm font-bold text-[var(--foreground)]">∞</p>
                <p>{language === "tr" ? "Önizleme" : "Preview"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 animate-slide-up">
            <div className="glass-card p-6 rounded-2xl border border-[var(--border)] shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
                  <Layers size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{language === "tr" ? "Katmanlı Dönüşüm" : "Layered Conversion"}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{language === "tr" ? "Pandoc + Typst + LaTeX" : "Pandoc + Typst + LaTeX"}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                {language === "tr"
                  ? "Akademik ve kurumsal formatlarda tutarlı tipografi, temiz çıktı ve dosya bütünlüğü."
                  : "Consistent typography, clean output, and file integrity across academic and enterprise formats."}
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-[var(--border)] shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{language === "tr" ? "Gizlilik Odaklı" : "Privacy First"}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{language === "tr" ? "Dosyalarınız kalıcı değil" : "No persistent storage"}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                {language === "tr"
                  ? "Dönüşüm tamamlandığında içerikler otomatik olarak temizlenir."
                  : "After conversion, files are automatically cleaned from the workspace."}
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-[var(--border)] shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
                  <Gauge size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{language === "tr" ? "Anlık Önizleme" : "Instant Preview"}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{language === "tr" ? "İlk satırdan itibaren" : "From the first line"}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                {language === "tr"
                  ? "Editör ve önizleme birlikte ilerler, çıktıyı anında doğrularsınız."
                  : "Editor and preview move together so you can validate output instantly."}
              </p>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-10">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                {language === "tr" ? "Neler Yapılabilir" : "Capabilities"}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold">
                {language === "tr" ? "İş akışınızı tek ekranda yönetin." : "Run your workflow on a single screen."}
              </h2>
              <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed">
                {language === "tr"
                  ? "Editör, ayarlar ve önizleme aynı düzende. Format seçimi, motor tercihleri ve tipografi ayarları tek tıkla."
                  : "Editor, settings, and preview stay aligned. Choose formats, engines, and typography in one focused flow."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  titleTr: "PDF, DOCX, HTML",
                  titleEn: "PDF, DOCX, HTML",
                  descTr: "Kurumsal ve akademik çıktı standartları.",
                  descEn: "Enterprise and academic output standards.",
                },
                {
                  titleTr: "Markdown & LaTeX",
                  titleEn: "Markdown & LaTeX",
                  descTr: "Teknik dokümantasyon için ideal.",
                  descEn: "Ideal for technical documentation.",
                },
                {
                  titleTr: "Şablon & Stil",
                  titleEn: "Templates & Styles",
                  descTr: "Kod renklendirme ve matematik motorları.",
                  descEn: "Syntax highlighting and math rendering.",
                },
                {
                  titleTr: "Hızlı İndirme",
                  titleEn: "Fast Export",
                  descTr: "Tek tıklama ile çıktı dosyası.",
                  descEn: "One click to download results.",
                },
              ].map((item) => (
                <div key={item.titleEn} className="p-4 border border-[var(--border)] rounded-xl bg-[var(--surface)] shadow-sm">
                  <p className="text-sm font-semibold">{language === "tr" ? item.titleTr : item.titleEn}</p>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">{language === "tr" ? item.descTr : item.descEn}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Onboarding / Steps */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <PenLine size={18} />,
                titleTr: "Yazın veya Yükleyin",
                titleEn: "Write or Upload",
                descTr: "Markdown, LaTeX veya Word içeriğinizi ekleyin.",
                descEn: "Add Markdown, LaTeX, or Word content.",
              },
              {
                icon: <Settings2 size={18} />,
                titleTr: "Formatı Ayarlayın",
                titleEn: "Configure Output",
                descTr: "Motor, tipografi ve gelişmiş seçenekleri belirleyin.",
                descEn: "Pick engine, typography, and advanced options.",
              },
              {
                icon: <Eye size={18} />,
                titleTr: "Anında Önizleyin",
                titleEn: "Preview Instantly",
                descTr: "Sağdaki panelden çıktıyı doğrulayın.",
                descEn: "Validate the output in the right panel.",
              },
            ].map((step, index) => (
              <div key={step.titleEn} className="glass-card p-6 rounded-2xl border border-[var(--border)] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
                    {step.icon}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                      {language === "tr" ? "Adım" : "Step"} {index + 1}
                    </p>
                    <p className="text-sm font-semibold">{language === "tr" ? step.titleTr : step.titleEn}</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--foreground-secondary)] mt-3 leading-relaxed">
                  {language === "tr" ? step.descTr : step.descEn}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-[var(--border)] bg-[var(--background-secondary)]/40 backdrop-blur-md mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--foreground-muted)] font-medium">
          <div className="flex items-center gap-2">
            <BrandLogo size={16} />
            <p>© {new Date().getFullYear()} RunDoc. {language === "tr" ? "Tüm hakları saklıdır." : "All rights reserved."}</p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/support" className="hover:text-[var(--foreground)] transition-colors">{language === "tr" ? "Destek" : "Support"}</Link>
            <Link href="/api-docs" className="hover:text-[var(--foreground)] transition-colors">API</Link>
            <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">{language === "tr" ? "Koşullar" : "Terms"}</Link>
            <Link href="/terms#privacy" className="hover:text-[var(--foreground)] transition-colors text-[var(--accent)]">{language === "tr" ? "Gizlilik" : "Privacy"}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
