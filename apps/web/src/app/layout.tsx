import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RunDoc — Pandoc Orchestrator",
  description:
    "Pandoc destekli modern doküman dönüştürme platformu. Markdown, LaTeX, Word, PDF ve 40+ format arasında dönüşüm yapın.",
  keywords: [
    "pandoc",
    "doküman dönüştürme",
    "markdown",
    "latex",
    "pdf",
    "word",
    "converter",
  ],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
