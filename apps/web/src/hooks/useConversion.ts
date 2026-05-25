"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WORKER_API_URL } from "@/lib/supabase";

// =============================================
// Types
// =============================================

export interface ConversionRequest {
  project_id: string;
  user_id: string;
  input_document_id: string;
  input_format?: string;
  output_format: string;
  engine?: string;
  citeproc?: boolean;
  bibliography_id?: string;
  csl_style?: string;
  reference_doc_id?: string;
  template_id?: string;
  lua_filter_ids?: string[];
  python_filter_ids?: string[];
  toc?: boolean;
  toc_depth?: number;
  smart?: boolean;
  number_sections?: boolean;
  standalone?: boolean;
  highlight_style?: string;
  math_rendering?: string;
  extract_media?: boolean;
  variables?: Record<string, string>;
  metadata?: Record<string, string>;
  additional_input_ids?: string[];
}

export interface ConversionResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface ConversionStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  input_format?: string;
  output_format?: string;
  engine_used?: string;
  execution_time_ms?: number;
  error_message?: string;
  output_url?: string;
  command_executed?: string;
}

export interface EngineInfo {
  display_name: string;
  description: string;
  available: boolean;
}

export interface EnginesResponse {
  pdf_engines: Record<string, EngineInfo>;
  slide_engines: Record<string, EngineInfo>;
}

export interface FormatsResponse {
  input_formats: string[];
  output_formats: string[];
}

// =============================================
// API Functions
// =============================================

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error (${response.status}): ${error}`);
  }
  return response.json();
}

// =============================================
// Hooks
// =============================================

/**
 * Worker sağlık kontrolü
 */
export function useWorkerHealth() {
  return useQuery({
    queryKey: ["worker-health"],
    queryFn: () => fetchJSON<{ status: string; pandoc_available: boolean }>(`${WORKER_API_URL}/health`),
    refetchInterval: 30000,
    retry: 1,
  });
}

/**
 * Kullanılabilir motorları listeler
 */
export function useEngines() {
  return useQuery({
    queryKey: ["engines"],
    queryFn: () => fetchJSON<EnginesResponse>(`${WORKER_API_URL}/engines`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Desteklenen formatları listeler
 */
export function useFormats() {
  return useQuery({
    queryKey: ["formats"],
    queryFn: () => fetchJSON<FormatsResponse>(`${WORKER_API_URL}/formats`),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Dönüşüm başlatır
 */
export function useStartConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ConversionRequest) =>
      fetchJSON<ConversionResponse>(`${WORKER_API_URL}/convert`, {
        method: "POST",
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversion-status"] });
    },
  });
}

/**
 * Dönüşüm durumunu takip eder (polling)
 */
export function useConversionStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["conversion-status", jobId],
    queryFn: () => fetchJSON<ConversionStatus>(`${WORKER_API_URL}/status/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data as ConversionStatus | undefined;
      if (!data) return 2000;
      // İş tamamlandıysa veya hata aldıysa polling'i durdur
      if (data.status === "completed" || data.status === "failed") return false;
      return 2000; // Aktifken her 2 saniyede bir kontrol et
    },
  });
}

/**
 * Doküman analizi
 */
export function useAnalyzeDocument() {
  return useMutation({
    mutationFn: async ({
      file,
      targetFormat,
    }: {
      file: File;
      targetFormat: string;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target_format", targetFormat);

      const response = await fetch(`${WORKER_API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Analiz hatası: ${response.status}`);
      }

      return response.json();
    },
  });
}
