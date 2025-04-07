import { kv } from "@vercel/kv";

// Interface para armazenar informações sobre downloads
interface DownloadCache {
  videoId: string;
  format: "audio" | "video";
  quality?: "low" | "medium" | "high";
  url: string;
  expiresAt: number;
  attempts: number;
  lastAttempt: number;
  success: boolean;
  error?: string;
}

// Chave para o cache
const getCacheKey = (videoId: string, format: "audio" | "video", quality?: string) => {
  return `download:${videoId}:${format}:${quality || "default"}`;
};

// Tempo de expiração do cache (24 horas)
const CACHE_EXPIRY = 24 * 60 * 60;

// Verifica se o download está em cache
export const getCachedDownload = async (
  videoId: string,
  format: "audio" | "video",
  quality?: string
): Promise<DownloadCache | null> => {
  try {
    const key = getCacheKey(videoId, format, quality);
    const cached = await kv.get<DownloadCache>(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    return null;
  } catch (error) {
    console.error("Erro ao acessar cache:", error);
    return null;
  }
};

// Armazena informações sobre o download no cache
export const cacheDownload = async (
  videoId: string,
  format: "audio" | "video",
  quality: string | undefined,
  url: string,
  success: boolean,
  error?: string
): Promise<void> => {
  try {
    const key = getCacheKey(videoId, format, quality);

    // Verifica se já existe um registro
    const existing = await kv.get<DownloadCache>(key);

    const cacheData: DownloadCache = {
      videoId,
      format,
      quality: quality as "low" | "medium" | "high" | undefined,
      url,
      expiresAt: Date.now() + CACHE_EXPIRY * 1000,
      attempts: (existing?.attempts || 0) + 1,
      lastAttempt: Date.now(),
      success,
      error,
    };

    await kv.set(key, cacheData, { ex: CACHE_EXPIRY });
  } catch (error) {
    console.error("Erro ao armazenar no cache:", error);
  }
};

// Registra uma tentativa de download
export const recordDownloadAttempt = async (
  videoId: string,
  format: "audio" | "video",
  quality: string | undefined,
  success: boolean,
  error?: string
): Promise<void> => {
  try {
    const key = getCacheKey(videoId, format, quality);

    // Verifica se já existe um registro
    const existing = await kv.get<DownloadCache>(key);

    if (existing) {
      // Atualiza o registro existente
      existing.attempts += 1;
      existing.lastAttempt = Date.now();
      existing.success = success;
      existing.error = error;
      existing.expiresAt = Date.now() + CACHE_EXPIRY * 1000;

      await kv.set(key, existing, { ex: CACHE_EXPIRY });
    } else {
      // Cria um novo registro
      const cacheData: DownloadCache = {
        videoId,
        format,
        quality: quality as "low" | "medium" | "high" | undefined,
        url: "",
        expiresAt: Date.now() + CACHE_EXPIRY * 1000,
        attempts: 1,
        lastAttempt: Date.now(),
        success,
        error,
      };

      await kv.set(key, cacheData, { ex: CACHE_EXPIRY });
    }
  } catch (error) {
    console.error("Erro ao registrar tentativa de download:", error);
  }
};
