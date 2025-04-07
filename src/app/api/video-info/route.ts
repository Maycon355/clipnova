import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

// Serviços alternativos para obter informações do YouTube
const VIDEO_INFO_SERVICES = [
  "https://api.fillyourbrain.org/api/youtube/videoInfo",  // Alta disponibilidade
  "https://pipedapi.kavin.rocks",                         // Alternativa 1
  "https://vid.puffyan.us/api/v1"                        // Alternativa 2
];

// URL direta para thumbnails
const YT_THUMBNAIL = "https://i.ytimg.com/vi/";

// Função para obter informações do vídeo
async function getVideoInfo(videoId: string) {
  let lastError: Error | null = null;
  
  // Tenta o primeiro serviço (mais confiável)
  try {
    console.log(`[INFO] Tentando serviço principal para ${videoId}`);
    const response = await axios.get(`${VIDEO_INFO_SERVICES[0]}?id=${videoId}`, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.data) {
      return {
        success: true,
        data: response.data,
        source: "api-fillyourbrain"
      };
    }
  } catch (error) {
    console.error(`[ERRO] Serviço principal falhou:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // Tenta api Piped
  try {
    console.log(`[INFO] Tentando Piped API para ${videoId}`);
    const response = await axios.get(`${VIDEO_INFO_SERVICES[1]}/streams/${videoId}`, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.data) {
      return {
        success: true,
        data: response.data,
        source: "piped"
      };
    }
  } catch (error) {
    console.error(`[ERRO] Piped API falhou:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // Tenta API Invidious
  try {
    console.log(`[INFO] Tentando Invidious API para ${videoId}`);
    const response = await axios.get(`${VIDEO_INFO_SERVICES[2]}/videos/${videoId}`, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.data) {
      return {
        success: true,
        data: response.data,
        source: "invidious"
      };
    }
  } catch (error) {
    console.error(`[ERRO] Invidious API falhou:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // Fallback: Retornar informações básicas
  try {
    // Se todas as APIs falharem, pelo menos retorna metadados básicos
    return {
      success: true,
      data: {
        videoId: videoId,
        title: `Vídeo do YouTube (${videoId})`,
        thumbnailUrl: `${YT_THUMBNAIL}${videoId}/hqdefault.jpg`,
        description: "Informações detalhadas indisponíveis no momento.",
        uploader: "Canal do YouTube",
        uploaderUrl: `https://youtube.com/channel/unknown`,
        duration: 0
      },
      source: "fallback"
    };
  } catch (error) {
    console.error(`[ERRO] Fallback falhou:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // Se chegamos aqui, tudo falhou
  throw lastError || new Error("Todos os serviços falharam");
}

// Função para normalizar a resposta de diferentes APIs
function normalizeResponse(result: any) {
  const { data, source } = result;
  
  if (source === "api-fillyourbrain") {
    return {
      videoId: data.videoId || data.id,
      title: data.title || "Vídeo do YouTube",
      description: data.description?.substring(0, 200) + "..." || "Sem descrição disponível",
      thumbnail: data.thumbnail || `${YT_THUMBNAIL}${data.videoId}/hqdefault.jpg`,
      duration: data.duration || 0,
      author: data.author || data.uploader || "Canal do YouTube",
      authorUrl: data.authorUrl || data.uploaderUrl || `https://youtube.com/channel/unknown`,
      viewCount: data.viewCount || data.views || 0,
      uploadDate: data.uploadDate || data.publishDate || "Desconhecido",
      formats: data.formats || []
    };
  } else if (source === "piped") {
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
    // Fallback ou outras fontes
    return {
      videoId: data.videoId || data.id,
      title: data.title || "Vídeo sem título",
      description: (data.description || "Sem descrição").substring(0, 200) + "...",
      thumbnail: data.thumbnail || data.thumbnailUrl || `${YT_THUMBNAIL}${data.videoId}/hqdefault.jpg`,
      duration: data.duration || data.lengthSeconds || 0,
      author: data.author || data.uploader || "Canal do YouTube",
      authorUrl: data.authorUrl || `https://youtube.com/channel/${data.authorId || ""}`,
      viewCount: data.viewCount || data.views || 0,
      uploadDate: data.uploadDate || data.publishDate || "Desconhecido",
      formats: []
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
          result = await getVideoInfo(videoId);
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
