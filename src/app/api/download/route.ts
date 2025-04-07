import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

// Serviços para obter URLs diretas do YouTube
const YT_SERVICES = [
  "https://api.fillyourbrain.org/api/youtube/video", // Endpoint mais confiável
  "https://api.vevioz.com/api/button/videos", // Serviço simples e estável
  "https://ytembed.herokuapp.com/download",    // Alternativa 1
  "https://cobalt.tools/api/json",             // Alternativa 2
  "https://co.wuk.sh/api/json"                 // Alternativa 3
];

// Função para verificar se uma resposta é JSON válido
function isValidJSON(response: any) {
  if (!response || !response.data) return false;
  
  // Se já é um objeto, então é JSON válido
  if (typeof response.data === 'object') return true;
  
  // Se é string, tenta parse
  if (typeof response.data === 'string') {
    try {
      JSON.parse(response.data);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  return false;
}

// Função para obter URL de player com fallback (quando tudo mais falhar)
function getFallbackPlayerUrl(videoId: string) {
  const iframeUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&showinfo=1&rel=0`;
  const redirectUrl = `/api/download/stream?videoId=${videoId}`;
  
  return redirectUrl;
}

// Função para obter a URL direta usando vários serviços
async function getDirect(videoId: string, quality: string = "high", format: string = "video") {
  let lastError: Error | null = null;
  
  // Tenta o serviço principal primeiro (api.fillyourbrain.org)
  try {
    console.log(`[INFO] Tentando obter URL direta via ${YT_SERVICES[0]}`);
    const response = await axios.post(YT_SERVICES[0], {
      id: videoId,
      quality: quality === "high" ? "1080p" : quality === "medium" ? "720p" : "360p",
      format: format
    }, {
      timeout: 6000, // Timeout mais curto para evitar 504 no Vercel
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!isValidJSON(response)) {
      throw new Error("Resposta inválida recebida");
    }
    
    if (response.data?.url) {
      return response.data.url;
    } else {
      throw new Error("URL não encontrada na resposta");
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao obter URL via ${YT_SERVICES[0]}:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
    
    // Se for timeout, tenta o próximo serviço imediatamente
    if (error instanceof Error && error.message.includes('timeout')) {
      console.log(`[INFO] Timeout detectado, alternando para o próximo serviço.`);
    }
  }
  
  // Tenta o segundo serviço (vevioz API - serviço simples)
  try {
    console.log(`[INFO] Tentando obter URL direta via ${YT_SERVICES[1]}`);
    const qualityParam = format === "audio" ? "mp3" : (quality === "high" ? "720" : "360");
    
    // Este serviço funciona por acesso direto, então montamos a URL e verificamos se o endpoint está ativo
    const checkResponse = await axios.get(`${YT_SERVICES[1]}?url=https://youtube.com/watch?v=${videoId}`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      }
    });
    
    if (checkResponse.status === 200) {
      // Se o serviço estiver ativo, podemos formar a URL direta
      const directUrl = `${YT_SERVICES[1]}/${qualityParam}/${videoId}`;
      return directUrl;
    } else {
      throw new Error("Serviço indisponível");
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao obter URL via ${YT_SERVICES[1]}:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // Tenta o terceiro serviço (ytembed.herokuapp.com)
  try {
    console.log(`[INFO] Tentando obter URL direta via ${YT_SERVICES[2]}`);
    const response = await axios.get(`${YT_SERVICES[2]}?url=https://youtube.com/watch?v=${videoId}&format=${format === "audio" ? "mp3" : "mp4"}&quality=${quality === "high" ? "high" : quality === "medium" ? "medium" : "low"}`, {
      timeout: 6000, // Timeout mais curto
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!isValidJSON(response)) {
      throw new Error("Resposta inválida recebida");
    }
    
    if (response.data?.url) {
      return response.data.url;
    } else {
      throw new Error("URL não encontrada na resposta");
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao obter URL via ${YT_SERVICES[2]}:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // Tenta o quarto serviço (cobalt.tools)
  try {
    console.log(`[INFO] Tentando obter URL direta via ${YT_SERVICES[3]}`);
    const response = await axios.post(YT_SERVICES[3], {
      url: `https://youtube.com/watch?v=${videoId}`,
      vCodec: "h264",
      vQuality: quality === "high" ? "1080" : quality === "medium" ? "720" : "360",
      aFormat: format === "audio" ? "mp3" : "aac",
      filenamePattern: "basic",
      isAudioOnly: format === "audio",
      isNoTTWatermark: true,
      disableMetadata: true
    }, {
      timeout: 6000, // Timeout mais curto
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!isValidJSON(response)) {
      throw new Error("Resposta inválida recebida");
    }
    
    if (response.data?.url) {
      return response.data.url;
    } else {
      throw new Error("URL não encontrada na resposta");
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao obter URL via ${YT_SERVICES[3]}:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // Tenta o quinto serviço (co.wuk.sh)
  try {
    console.log(`[INFO] Tentando obter URL direta via ${YT_SERVICES[4]}`);
    const response = await axios.post(YT_SERVICES[4], {
      url: `https://youtube.com/watch?v=${videoId}`,
      vCodec: "h264",
      vQuality: quality === "high" ? "1080" : quality === "medium" ? "720" : "360",
      aFormat: format === "audio" ? "mp3" : "best",
      filenamePattern: "basic",
      isAudioOnly: format === "audio",
      isNoTTWatermark: true,
      disableMetadata: true
    }, {
      timeout: 6000, // Timeout mais curto
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: function (status) {
        return status < 500; // Aceita status 2xx, 3xx e 4xx
      }
    });
    
    if (!isValidJSON(response)) {
      throw new Error("Resposta inválida recebida");
    }
    
    if (response.data?.url) {
      return response.data.url;
    } else {
      throw new Error("URL não encontrada na resposta");
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao obter URL via ${YT_SERVICES[4]}:`, error instanceof Error ? error.message : String(error));
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // Se chegamos aqui, todas as tentativas falharam - usar fallback
  console.log(`[INFO] Todos os serviços falharam, usando fallback...`);
  const fallbackUrl = getFallbackPlayerUrl(videoId);
  if (fallbackUrl) {
    return fallbackUrl;
  }
  
  // Se até o fallback falhar
  throw lastError || new Error("Todos os serviços falharam ao obter a URL");
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { videoId, format, quality } = data;

    if (!videoId) {
      return NextResponse.json(
        { error: "ID do vídeo não fornecido" },
        { status: 400 }
      );
    }

    console.log(`[INFO] Processando download para o vídeo: ${videoId} (formato: ${format || "video"}, qualidade: ${quality || "high"})`);

    // Sistema de retry para o fetch, com timeout menor para cada tentativa
    let directUrl = null;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[INFO] Tentativa ${attempt}/2 para obter URL direta`);
        directUrl = await getDirect(videoId, quality || "high", format || "video");
        break;
      } catch (error) {
        lastError = error;
        console.error(`[ERRO] Tentativa ${attempt} falhou:`, error instanceof Error ? error.message : String(error));
        
        if (attempt < 2) {
          const waitTime = 1000; // Tempo mais curto entre tentativas
          console.log(`[INFO] Aguardando ${waitTime/1000}s antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!directUrl) {
      // Tentativa final: direcionar para o endpoint de streaming
      console.log(`[INFO] Todas as tentativas falharam, direcionando para o endpoint de streaming...`);
      const fallbackUrl = `/api/download/stream?videoId=${videoId}&quality=${quality || "high"}`;
      return NextResponse.json({ 
        url: fallbackUrl,
        format: format || "video",
        quality: quality || "high",
        videoId,
        isRedirect: true
      });
    }

    return NextResponse.json({ 
      url: directUrl,
      format: format || "video",
      quality: quality || "high",
      videoId
    });
  } catch (error) {
    console.error(`[ERRO] Falha ao obter URL para download:`, error instanceof Error ? error.message : String(error));
    
    // Se for um erro de rede ou timeout, fornecer mensagem amigável
    let errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("timeout") || errorMessage.includes("network") || errorMessage.includes("ECONNREFUSED")) {
      errorMessage = "Tempo de resposta excedido. Os servidores externos podem estar sobrecarregados. Por favor, tente novamente mais tarde.";
    }
    
    // Se for um erro de parsing JSON, usar uma mensagem mais amigável
    if (errorMessage.includes("Unexpected token") || errorMessage.includes("JSON")) {
      errorMessage = "Serviço temporariamente indisponível. Por favor, tente novamente mais tarde.";
    }
    
    try {
      // Captura o videoId e quality da requisição original
      let videoId = "";
      let quality = "high";
      
      try {
        const requestData = await request.json();
        videoId = requestData.videoId || "";
        quality = requestData.quality || "high";
      } catch (parseError) {
        console.error("Erro ao analisar a requisição para fallback:", parseError);
      }
      
      // Fornecer um fallback, mesmo em caso de erro
      const fallbackUrl = `/api/download/stream?videoId=${videoId}&quality=${quality}`;
      
      return NextResponse.json({
        error: errorMessage,
        url: fallbackUrl,
        isRedirect: true
      }, { status: 200 }); // Retornamos 200 para que o frontend possa usar o fallback
    } catch (fallbackError) {
      // Se até mesmo o fallback falhar, retornamos apenas a mensagem de erro
      return NextResponse.json({
        error: errorMessage
      }, { status: 500 });
    }
  }
}
