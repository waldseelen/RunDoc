import Link from "next/link";
import { ArrowLeft, Shield, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col p-10 bg-[var(--background)] text-[var(--foreground)] font-sans">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors font-bold">
          <ArrowLeft size={12} />
          Geri Dön / Back
        </Link>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
              <p className="text-xs text-[var(--foreground-muted)]">Last updated: May 2026</p>
            </div>
          </div>
        </div>
        <div className="space-y-6 mt-8 text-sm text-[var(--foreground-secondary)] leading-relaxed">
          <div className="glass-card p-6 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)]">1. Usage Rights</h2>
            <p>RunDoc is provided as-is for compiling documents. We are not responsible for any lost data, compilation errors, or formatting issues resulting from the use of Pandoc, Typst, or LaTeX engines.</p>
          </div>
          <div className="glass-card p-6 space-y-3" id="privacy">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)] flex items-center gap-2">
              <Shield size={14} className="text-[var(--success)]" />
              2. Privacy & KVKK
            </h2>
            <p>All documents are processed statelessly in the worker node. We do not persist or read your documents. Configuration settings are stored locally in your browser&apos;s localStorage.</p>
            <div className="p-3 rounded-lg border border-[var(--success)]/15 bg-[var(--success-bg)] text-[var(--success)] text-xs">
              🔒 Dokümanlarınız sunucuda hiçbir zaman saklanmaz. Tüm işlemler geçici sandbox ortamında gerçekleştirilir ve tamamlandıktan sonra otomatik olarak temizlenir.
            </div>
          </div>
          <div className="glass-card p-6 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)]">3. Fair Use</h2>
            <p>Please do not overload the local worker node with massive bulk conversions unless configured to handle the load.</p>
          </div>
          <div className="glass-card p-6 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)]">4. Data Processing (KVKK Uyumu)</h2>
            <p>Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında, RunDoc platformu kullanıcı verilerini yalnızca dönüşüm işlemi süresince işler. Hiçbir kişisel veri veya doküman içeriği kalıcı olarak depolanmaz.</p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--foreground-muted)]">
              <li>Dokümanlar yalnızca geçici sandbox ortamında işlenir</li>
              <li>İşlem sonrası tüm veriler otomatik olarak silinir</li>
              <li>Kullanıcı tercihleri yalnızca tarayıcı localStorage&apos;ında saklanır</li>
              <li>Hiçbir veri üçüncü taraflarla paylaşılmaz</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
