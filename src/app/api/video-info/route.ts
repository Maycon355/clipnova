import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

// Endpoints alternativos para obter informações do YouTube
const API_ENDPOINTS = [
  "https://pipedapi.kavin.rocks",          // API Piped 
  "https://pipedapi.tokhmi.xyz",           // Outra instância Piped
  "https://pipedapi.moomoo.me",            // Outra instância Piped
  "https://invidious.snopyta.org/api/v1",  // API Invidious
  "https://ytapi.smashub.tech"             // API personalizada de fallback
];

// Função para tentar múltiplos endpoints
async function fetchWithFallback(videoId: string) {
  let lastError: Error | null = null;
  
  // Tenta cada endpoint em sequência
  for (const endpoint of API_ENDPOINTS) {
    try {
      if (endpoint.includes("piped")) {
        console.log(`[INFO] Tentando Piped API: ${endpoint}`);
        const response = await axios.get(`${endpoint}/streams/${videoId}`);
        return {
          success: true,
          data: response.data,
          source: "piped"
        };
      } else if (endpoint.includes("invidious")) {
        console.log(`[INFO] Tentando Invidious API: ${endpoint}`);
        const response = await axios.get(`${endpoint}/videos/${videoId}`);
        return {
          success: true,
          data: response.data,
          source: "invidious"
        };
      } else {
        console.log(`[INFO] Tentando API alternativa: ${endpoint}`);
        const response = await axios.get(`${endpoint}/video?id=${videoId}`);
        return {
          success: true,
          data: response.data,
          source: "custom"
        };
      }
    } catch (error) {
      console.error(`[ERRO] API ${endpoint} falhou:`, error instanceof Error ? error.message : String(error));
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continua tentando o próximo endpoint
      continue;
    }
  }
  
  // Se chegamos aqui, todos os endpoints falharam
  throw lastError || new Error("Todos os endpoints falharam");
}

// Função para normalizar a resposta de diferentes APIs
function normalizeResponse(result: any) {
  const { data, source } = result;
  
  if (source === "piped") {
    return {
      videoId: data.videoId,
      title: data.title,
      description: data.description?.substring(0, 200) + "..." || "",
      thumbnail: data.thumbnailUrl,
      duration: data.duration,
      author: data.uploader,
      authorUrl: data.uploaderUrl,
      viewCount: data.views,
      uploadDate: data.uploadDate,
      formats: data.audioStreams?.concat(data.videoStreams)?.map((stream: any) => ({
        format_id: stream.itag || "N/A",
        ext: stream.format?.split("/")[1] || "mp4",
        resolution: stream.quality || "N/A",
        filesize: stream.size || 0,
        format_note: stream.quality || "N/A",
        acodec: stream.codec || "N/A",
        vcodec: stream.codec || "N/A",
      })) || [],
    };
  } else if (source === "invidious") {
    return {
      videoId: data.videoId,
      title: data.title,
      description: data.description?.substring(0, 200) + "..." || "",
      thumbnail: data.videoThumbnails?.[0]?.url || "",
      duration: data.lengthSeconds,
      author: data.author,
      authorUrl: `https://youtube.com/channel/${data.authorId}`,
      viewCount: data.viewCount,
      uploadDate: data.publishedText,
      formats: data.adaptiveFormats?.map((format: any) => ({
        format_id: format.itag || "N/A",
        ext: format.container || "mp4",
        resolution: format.qualityLabel || "N/A",
        filesize: format.contentLength || 0,
        format_note: format.qualityLabel || "N/A",
        acodec: format.audioCodec || "N/A",
        vcodec: format.videoCodec || "N/A",
      })) || [],
    };
  } else {
    // API personalizada ou fallback genérico
    return {
      videoId: data.videoId || data.id,
      title: data.title || "Vídeo sem título",
      description: (data.description || "Sem descrição").substring(0, 200) + "...",
      thumbnail: data.thumbnail || data.thumbnailUrl,
      duration: data.duration || data.lengthSeconds,
      author: data.author || data.uploader,
      authorUrl: data.authorUrl || `https://youtube.com/channel/${data.authorId || ""}`,
      viewCount: data.viewCount || data.views,
      uploadDate: data.uploadDate || data.publishDate,
      formats: data.formats || [],
    };
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { videoId } = data;

    if (!videoId) {
      return NextResponse.json(
        { error: "ID do vídeo não fornecido" },
        { status: 400 }
      );
    }

    console.log(`[INFO] Obtendo informações do vídeo ${videoId}...`);
    
    const result = await fetchWithFallback(videoId);
    const normalizedData = normalizeResponse(result);
    
    return NextResponse.json(normalizedData);
  } catch (error) {
    console.error("Erro ao obter informações do vídeo:", error);
    return NextResponse.json(
      { error: `Erro ao obter informações do vídeo: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
