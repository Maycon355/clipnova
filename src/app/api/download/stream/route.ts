import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

// Serviços para obter URLs diretas do YouTube
const YT_SERVICES = [
  "https://api.fillyourbrain.org/api/youtube/video", // Endpoint mais confiável
  "https://ytembed.herokuapp.com/download",          // Alternativa 1
  "https://cobalt.tools/api/json",                   // Alternativa 2
  "https://co.wuk.sh/api/json"                       // Alternativa 3
];

// Função para obter a URL direta usando vários serviços
async function getDirect(videoId: string, quality: string = "high") {
  let lastError: Error | null = null;
  
  // Tenta o serviço principal primeiro (api.fillyourbrain.org)
  try {
    console.log(`[INFO] Tentando obter URL direta via ${YT_SERVICES[0]}`);
    const response = await axios.post(YT_SERVICES[0], {
      id: videoId,
      quality: quality === "high" ? "1080p" : quality === "medium" ? "720p" : "360p",
      format: "video"
    }, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.url) {
      return response.data.url;
    } else {
      throw new Error("URL não encontrada na resposta");
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao obter URL via ${YT_SERVICES[0]}:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // Tenta o segundo serviço (ytembed.herokuapp.com)
  try {
    console.log(`[INFO] Tentando obter URL direta via ${YT_SERVICES[1]}`);
    const response = await axios.get(`${YT_SERVICES[1]}?url=https://youtube.com/watch?v=${videoId}&format=mp4&quality=${quality === "high" ? "high" : quality === "medium" ? "medium" : "low"}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.url) {
      return response.data.url;
    } else {
      throw new Error("URL não encontrada na resposta");
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao obter URL via ${YT_SERVICES[1]}:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // Tenta o terceiro serviço (cobalt.tools)
  try {
    console.log(`[INFO] Tentando obter URL direta via ${YT_SERVICES[2]}`);
    const response = await axios.post(YT_SERVICES[2], {
      url: `https://youtube.com/watch?v=${videoId}`,
      vCodec: "h264",
      vQuality: quality === "high" ? "1080" : quality === "medium" ? "720" : "360",
      filenamePattern: "basic",
      disableMetadata: true
    }, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.url) {
      return response.data.url;
    } else {
      throw new Error("URL não encontrada na resposta");
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao obter URL via ${YT_SERVICES[2]}:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // Tenta o quarto serviço (co.wuk.sh)
  try {
    console.log(`[INFO] Tentando obter URL direta via ${YT_SERVICES[3]}`);
    const response = await axios.post(YT_SERVICES[3], {
      url: `https://youtube.com/watch?v=${videoId}`,
      vCodec: "h264",
      vQuality: quality === "high" ? "1080" : quality === "medium" ? "720" : "360",
      filenamePattern: "basic",
      isAudioOnly: false,
      isNoTTWatermark: true,
      disableMetadata: true
    }, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.url) {
      return response.data.url;
    } else {
      throw new Error("URL não encontrada na resposta");
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao obter URL via ${YT_SERVICES[3]}:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // Se chegamos aqui, todas as tentativas falharam
  throw lastError || new Error("Todos os serviços falharam ao obter a URL");
}

export async function GET(request: NextRequest) {
  try {
    // Extrai os parâmetros da URL
    const url = new URL(request.url);
    const videoId = url.searchParams.get("videoId");
    const format = url.searchParams.get("format") || "video";
    const quality = url.searchParams.get("quality") || "high";

    if (!videoId) {
      return NextResponse.json({
        error: "ID do vídeo não fornecido",
      }, { status: 400 });
    }

    console.log(`[INFO] Tentando obter stream para vídeo ${videoId} (formato: ${format}, qualidade: ${quality})`);

    // Sistema de retry para o fetch
    let directUrl = null;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[INFO] Tentativa ${attempt}/3 para obter URL direta`);
        directUrl = await getDirect(videoId, quality);
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
    
    if (!directUrl) {
      throw lastError || new Error("Todas as tentativas falharam");
    }

    // Redireciona para a URL do vídeo
    return NextResponse.redirect(directUrl);
  } catch (error) {
    console.error(`[ERRO] Falha ao processar stream:`, error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      error: `Erro ao processar o stream: ${error instanceof Error ? error.message : String(error)}`,
    }, { status: 500 });
  }
}
