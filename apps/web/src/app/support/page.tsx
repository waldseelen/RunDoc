import Link from "next/link";
import { ArrowLeft, BookOpen, Mail, MessageCircle, FileText } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="min-h-screen flex flex-col p-10 bg-[var(--background)] text-[var(--foreground)] font-sans">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors font-bold">
          <ArrowLeft size={12} />
          Geri Dön / Back
        </Link>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--info-bg)] text-[var(--info)] flex items-center justify-center">
              <MessageCircle size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Support & Help Center</h1>
              <p className="text-xs text-[var(--foreground-muted)]">
                RunDoc destek merkezi — derleme hataları ve yapılandırma yardımı
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 mt-8">
          <div className="glass-card p-6 flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center flex-shrink-0">
              <BookOpen size={16} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)]">Documentation</h2>
              <p className="text-[11px] text-[var(--foreground-secondary)] leading-relaxed">
                Markdown&apos;dan PDF oluşturma, LaTeX formül yazımı ve Pandoc filtre yapılandırması hakkında kapsamlı rehberlerimizi okuyun.
              </p>
              <Link href="/api-docs" className="text-[10px] font-semibold text-[var(--accent)] hover:underline">
                API Dokümantasyonu →
              </Link>
            </div>
          </div>
          <div className="glass-card p-6 flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-[var(--success-bg)] text-[var(--success)] flex items-center justify-center flex-shrink-0">
              <FileText size={16} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)]">Sık Sorulan Sorular</h2>
              <ul className="text-[11px] text-[var(--foreground-secondary)] space-y-1 list-disc pl-4">
                <li>PDF derleme hatası alıyorum — LaTeX sözdizimini kontrol edin veya Typst motoruna geçin</li>
                <li>Matematik formülleri görünmüyor — MathJax veya KaTeX rendering seçeneğini aktif edin</li>
                <li>Dosya boyutu limiti — Maksimum 50MB kaynak dosya desteklenir</li>
              </ul>
            </div>
          </div>
          <div className="glass-card p-6 flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
              <Mail size={16} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)]">Contact Admin</h2>
              <p className="text-[11px] text-[var(--foreground-secondary)] leading-relaxed">
                Kurumsal dağıtım desteği veya özel yapılandırma ihtiyaçları için yönetici ile iletişime geçin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
