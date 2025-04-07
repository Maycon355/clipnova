import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

// Endpoints alternativos com instâncias mais confiáveis
const API_ENDPOINTS = [
  // Instâncias Piped
  "https://pipedapi.syncpundit.io",      // Geralmente estável
  "https://api-piped.mha.fi",            // Muito confiável
  "https://piped-api.garudalinux.org",   // Bom uptime
  "https://piped-api.privacy.com.de",    // Confiável
  
  // Instâncias Invidious 
  "https://vid.puffyan.us/api/v1",       // Muito estável
  "https://invidious.slipfox.xyz/api/v1", // Bom uptime
  "https://invidious.private.coffee/api/v1"  // Instância confiável
];

// YouTube API direto (usando proxy CORS)
const YOUTUBE_ENDPOINTS = [
  "https://corsproxy.io/?https://www.youtube.com/watch?v=",
  "https://api.allorigins.win/raw?url=https://www.youtube.com/watch?v="
];

// Função para tentar múltiplos endpoints
async function fetchWithFallback(videoId: string) {
  let lastError: Error | null = null;
  
  // Tenta cada endpoint em sequência
  for (const endpoint of API_ENDPOINTS) {
    try {
      if (endpoint.includes("piped")) {
        console.log(`[INFO] Tentando Piped API: ${endpoint}`);
        const response = await axios.get(`${endpoint}/streams/${videoId}`, {
          timeout: 5000, // 5 segundos de timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          }
        });
        return {
          success: true,
          data: response.data,
          source: "piped"
        };
      } else if (endpoint.includes("invidious")) {
        console.log(`[INFO] Tentando Invidious API: ${endpoint}`);
        const response = await axios.get(`${endpoint}/videos/${videoId}`, {
          timeout: 5000, // 5 segundos de timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          }
        });
        return {
          success: true,
          data: response.data,
          source: "invidious"
        };
      }
    } catch (error) {
      console.error(`[ERRO] API ${endpoint} falhou:`, error instanceof Error ? error.message : String(error));
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continua tentando o próximo endpoint
      continue;
    }
  }
  
  // Se todas as APIs falharem, tenta uma extração direta (mais básica)
  for (const ytEndpoint of YOUTUBE_ENDPOINTS) {
    try {
      console.log(`[INFO] Tentando extração direta via: ${ytEndpoint}`);
      const response = await axios.get(`${ytEndpoint}${videoId}`, {
        timeout: 8000, // 8 segundos de timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/'
        }
      });
      
      const html = response.data;
      
      // Extrair título
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : 'Vídeo do YouTube';
      
      // Extrair thumbnail
      const thumbnailMatch = html.match(/\"thumbnailUrl\":\s*\[\"(https:\/\/i\.ytimg\.com\/vi\/[^\"]+)\"/);
      const thumbnail = thumbnailMatch ? thumbnailMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      
      // Extrair autor
      const authorMatch = html.match(/\"author\":\s*\"([^\"]+)\"/);
      const author = authorMatch ? authorMatch[1] : 'Canal do YouTube';
      
      return {
        success: true,
        data: {
          videoId,
          title,
          thumbnail,
          author,
          // Dados básicos quando usamos extração direta
          thumbnailUrl: thumbnail,
          uploader: author,
          uploaderUrl: `https://www.youtube.com/channel/unknown`,
          description: 'Informações detalhadas não disponíveis no momento.',
          duration: 0,
          views: 0
        },
        source: "direct"
      };
    } catch (error) {
      console.error(`[ERRO] Extração direta falhou:`, error instanceof Error ? error.message : String(error));
      lastError = error instanceof Error ? error : new Error(String(error));
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
  } else if (source === "direct") {
    // Dados básicos extraídos diretamente do HTML
    return {
      videoId: data.videoId,
      title: data.title,
      description: "Informações detalhadas não disponíveis.",
      thumbnail: data.thumbnail,
      duration: 0, // Não conseguimos obter a duração
      author: data.author,
      authorUrl: "https://youtube.com",
      viewCount: 0, // Não conseguimos obter o número de visualizações
      uploadDate: "Desconhecido",
      formats: [], // Não conseguimos obter formatos
    };
  } else {
    // Fallback genérico para qualquer outro tipo de fonte
    return {
      videoId: data.videoId || data.id,
      title: data.title || "Vídeo sem título",
      description: (data.description || "Sem descrição").substring(0, 200) + "...",
      thumbnail: data.thumbnail || data.thumbnailUrl,
      duration: data.duration || data.lengthSeconds || 0,
      author: data.author || data.uploader,
      authorUrl: data.authorUrl || `https://youtube.com/channel/${data.authorId || ""}`,
      viewCount: data.viewCount || data.views || 0,
      uploadDate: data.uploadDate || data.publishDate || "Desconhecido",
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
    
    try {
      // Sistema de retry para o fetch
      let result = null;
      let lastError = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[INFO] Tentativa ${attempt}/3 para obter informações do vídeo ${videoId}`);
          result = await fetchWithFallback(videoId);
          break;
        } catch (error) {
          lastError = error;
          console.error(`[ERRO] Tentativa ${attempt} falhou:`, error instanceof Error ? error.message : String(error));
          
          if (attempt < 3) {
            const waitTime = 2000 * attempt; // Tempo crescente entre tentativas
            console.log(`[INFO] Aguardando ${waitTime/1000}s antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      if (!result) {
        throw lastError || new Error("Todas as tentativas falharam");
      }
      
      const normalizedData = normalizeResponse(result);
      return NextResponse.json(normalizedData);
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error("Erro ao obter informações do vídeo:", error);
    return NextResponse.json(
      { error: `Erro ao obter informações do vídeo: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
