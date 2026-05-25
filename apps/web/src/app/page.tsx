"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  FolderOpen,
  Clock,
  Zap,
  FileText,
  ArrowRight,
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Code2,
  Globe,
} from "lucide-react";

// =============================================
// Demo Data
// =============================================

const RECENT_PROJECTS = [
  {
    id: "demo-1",
    name: "Akademik Makale",
    description: "Kuantum Hesaplama araştırma makalesi",
    format: "PDF (XeLaTeX)",
    updatedAt: "2 saat önce",
    status: "completed" as const,
  },
  {
    id: "demo-2",
    name: "API Dokümantasyonu",
    description: "REST API referans dokümanı",
    format: "HTML",
    updatedAt: "5 saat önce",
    status: "completed" as const,
  },
  {
    id: "demo-3",
    name: "Kurumsal Rapor",
    description: "Q2 2026 performans raporu",
    format: "DOCX",
    updatedAt: "1 gün önce",
    status: "processing" as const,
  },
];

const QUICK_ACTIONS = [
  {
    icon: <FileText size={20} />,
    title: "Markdown → PDF",
    desc: "Akademik kalitede PDF çıktısı",
    color: "#6366f1",
  },
  {
    icon: <BookOpen size={20} />,
    title: "LaTeX → DOCX",
    desc: "Word formatına dönüştürme",
    color: "#8b5cf6",
  },
  {
    icon: <Globe size={20} />,
    title: "DOCX → HTML",
    desc: "Web yayınına hazır format",
    color: "#06b6d4",
  },
  {
    icon: <Code2 size={20} />,
    title: "Markdown → Slayt",
    desc: "reveal.js sunum oluştur",
    color: "#10b981",
  },
];

const STATS = [
  { label: "Toplam Dönüşüm", value: "1,247", icon: <Zap size={18} /> },
  { label: "Desteklenen Format", value: "40+", icon: <FileText size={18} /> },
  { label: "Aktif Proje", value: "8", icon: <FolderOpen size={18} /> },
];

// =============================================
// Page Component
// =============================================

export default function DashboardPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--background)" }}
    >
      {/* Ambient Glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "var(--gradient-glow)",
          zIndex: 0,
        }}
      />

      {/* Top Navigation */}
      <nav
        className="relative z-10 px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Sparkles size={16} color="white" />
          </div>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            RunDoc
          </span>
          <span
            className="badge badge-info text-[10px]"
            style={{ marginTop: "2px" }}
          >
            BETA
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/workspace/new" className="btn-primary" id="new-project-btn">
            <Plus size={16} />
            Yeni Proje
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-10 animate-fade-in">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Hoş Geldiniz
          </h1>
          <p
            className="text-base"
            style={{ color: "var(--foreground-secondary)" }}
          >
            Pandoc destekli doküman dönüştürme platformu. 40+ format arasında
            dönüşüm yapın.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="glass-card p-5 animate-slide-up">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: "var(--accent-subtle)",
                    color: "var(--accent)",
                  }}
                >
                  {stat.icon}
                </div>
                <div>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--foreground-muted)" }}
                  >
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2
            className="text-sm font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--foreground-secondary)" }}
          >
            <Zap size={14} />
            Hızlı Dönüşüm
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.title}
                href="/workspace/new"
                className="glass-card p-4 group cursor-pointer animate-slide-up"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                  style={{
                    background: `${action.color}15`,
                    color: action.color,
                  }}
                >
                  {action.icon}
                </div>
                <p
                  className="text-sm font-medium mb-0.5"
                  style={{ color: "var(--foreground)" }}
                >
                  {action.title}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  {action.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: "var(--foreground-secondary)" }}
            >
              <Clock size={14} />
              Son Projeler
            </h2>
            <button className="btn-ghost text-xs" id="view-all-projects">
              Tümünü Gör
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-2">
            {RECENT_PROJECTS.map((project) => (
              <Link
                key={project.id}
                href={`/workspace/${project.id}`}
                className="glass-card flex items-center gap-4 p-4 group animate-slide-up"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "var(--accent-subtle)",
                    color: "var(--accent)",
                  }}
                >
                  <FolderOpen size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {project.name}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--foreground-muted)" }}
                  >
                    {project.description}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="badge badge-neutral text-[11px]">
                    {project.format}
                  </span>
                  <span
                    className={`badge text-[11px] ${
                      project.status === "completed"
                        ? "badge-success"
                        : "badge-warning"
                    }`}
                  >
                    {project.status === "completed" ? "✓" : "⟳"}{" "}
                    {project.status === "completed" ? "Tamamlandı" : "İşleniyor"}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--foreground-muted)" }}
                  >
                    {project.updatedAt}
                  </span>
                </div>
                <ArrowRight
                  size={16}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--foreground-muted)" }}
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer
          className="mt-16 py-6 text-center text-xs"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            color: "var(--foreground-muted)",
          }}
        >
          RunDoc · Pandoc Orchestrator · Powered by Pandoc, Next.js & FastAPI
        </footer>
      </main>
    </div>
  );
}
