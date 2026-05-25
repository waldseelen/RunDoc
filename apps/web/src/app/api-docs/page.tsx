import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen flex flex-col p-10 bg-black text-neutral-50 font-sans selection:bg-neutral-800">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-500 hover:text-neutral-200 transition-none font-bold">
          <ArrowLeft size={12} />
          Geri Dön / Back
        </Link>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-white">API Documentation</h1>
          <p className="text-sm text-neutral-400 leading-relaxed max-w-xl">
            RunDoc exposes a high-performance REST API for compiling Markdown to PDF, HTML, and Word formats using our containerized Python worker.
          </p>
        </div>
        <div className="p-6 border border-neutral-900 bg-[#030303] rounded-sm mt-8 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-200">POST /convert-direct</h2>
          <p className="text-[11px] text-neutral-500">Converts standard Markdown into the requested output format instantly.</p>
          <pre className="p-4 bg-black border border-neutral-900 text-[10px] font-mono text-neutral-300 rounded-sm overflow-x-auto">
            {`curl -X POST "http://localhost:8000/convert-direct" \\
  -F "text=# Hello World" \\
  -F "output_format=pdf" \\
  -F "engine=xelatex"`}
          </pre>
        </div>
      </div>
    </div>
  );
}
