"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WORKER_API_URL } from "@/lib/config";

// =============================================
// Types
// =============================================

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

const DEFAULT_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetchWithTimeout(url, {
    ...options,
    headers,
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
    queryFn: () => fetchJSON<{ status: string; pandoc_available: boolean }>(`${WORKER_API_URL}/api/v1/health`),
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
    queryFn: () => fetchJSON<EnginesResponse>(`${WORKER_API_URL}/api/v1/engines`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Desteklenen formatları listeler
 */
export function useFormats() {
  return useQuery({
    queryKey: ["formats"],
    queryFn: () => fetchJSON<FormatsResponse>(`${WORKER_API_URL}/api/v1/formats`),
    staleTime: 10 * 60 * 1000, // 10 minutes
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

      const response = await fetchWithTimeout(`${WORKER_API_URL}/api/v1/analyze`, {
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
