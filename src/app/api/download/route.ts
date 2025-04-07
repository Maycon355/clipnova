import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Configuração para deploy no Vercel
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

// Função para obter a URL direta usando vários serviços
async function getDirectUrl(videoId: string, quality: string = "high") {
  let lastError: Error | null = null;
  
  // Tenta o serviço principal primeiro (api.fillyourbrain.org)
  try {
    console.log(`[INFO] Tentando obter URL direta via ${YT_SERVICES[0]}`);
    const response = await axios.post(YT_SERVICES[0], {
      id: videoId,
      quality: quality === "high" ? "1080p" : quality === "medium" ? "720p" : "360p",
      format: "video"
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
  }
  
  // Tenta o segundo serviço (vevioz API - serviço simples)
  try {
    console.log(`[INFO] Tentando obter URL direta via ${YT_SERVICES[1]}`);
    const qualityParam = quality === "high" ? "720" : "360";
    
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
    const response = await axios.get(`${YT_SERVICES[2]}?url=https://youtube.com/watch?v=${videoId}&format=mp4&quality=${quality === "high" ? "high" : quality === "medium" ? "medium" : "low"}`, {
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
  
  throw lastError || new Error("Não foi possível obter a URL direta do vídeo");
}

// Função para obter URL de player com fallback (quando tudo mais falhar)
function getFallbackPlayerUrl(videoId: string) {
  return `/api/download/stream?videoId=${videoId}`;
}

// Função GET para suportar redirecionamento via URL
export async function GET(request: NextRequest) {
  try {
    // Extrair parâmetros da URL
    const url = new URL(request.url);
    const videoId = url.searchParams.get("videoId");
    const format = url.searchParams.get("format") || "video";
    const quality = url.searchParams.get("quality") || "high";

    if (!videoId) {
      return NextResponse.json(
        { error: "ID do vídeo não fornecido" },
        { status: 400 }
      );
    }

    console.log(`[INFO] Processando download via GET para o vídeo: ${videoId}`);

    try {
      // Tenta obter a URL direta
      const directUrl = await getDirectUrl(videoId, quality as string);
      
      // Redireciona para a URL direta
      console.log(`[INFO] URL direta obtida, redirecionando para: ${directUrl}`);
      return NextResponse.redirect(directUrl);
    } catch (error) {
      console.error(`[ERRO] Falha ao obter URL direta:`, error instanceof Error ? error.message : String(error));
      
      // Se falhar, tenta o fallback de streaming
      return NextResponse.redirect(getFallbackPlayerUrl(videoId));
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao processar download:`, error instanceof Error ? error.message : String(error));
    
    // Em caso de erro, tenta extrair o videoId e direciona para o fallback
    const url = new URL(request.url);
    const videoId = url.searchParams.get("videoId");
    
    if (videoId) {
      // Redireciona para o fallback
      return NextResponse.redirect(getFallbackPlayerUrl(videoId));
    }
    
    return NextResponse.json({
      error: "Não foi possível processar o vídeo. Por favor, tente novamente mais tarde."
    }, { status: 500 });
  }
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

    console.log(`[INFO] Processando download para o vídeo: ${videoId}`);

    try {
      // Tenta obter a URL direta
      const directUrl = await getDirectUrl(videoId, quality);
      
      // Retorna a URL direta como JSON
      return NextResponse.json({
        url: directUrl,
        format: format || "video",
        quality: quality || "high",
        videoId,
        isDirectUrl: true
      });
    } catch (error) {
      console.error(`[ERRO] Falha ao obter URL direta:`, error instanceof Error ? error.message : String(error));
      
      // Se falhar, fornece o fallback de streaming
      return NextResponse.json({
        url: getFallbackPlayerUrl(videoId),
        isRedirect: true,
        format: format || "video",
        quality: quality || "high",
        videoId
      });
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao processar download:`, error instanceof Error ? error.message : String(error));
    
    // Em caso de erro, tenta extrair o videoId da requisição
    let videoId = "";
    
    try {
      const requestData = await request.json();
      videoId = requestData.videoId || "";
    } catch (parseError) {
      console.error("Erro ao analisar a requisição para fallback:", parseError);
    }
    
    if (videoId) {
      return NextResponse.json({
        url: getFallbackPlayerUrl(videoId),
        isRedirect: true
      }, { status: 200 });
    }
    
    return NextResponse.json({
      error: "Não foi possível processar o vídeo. Por favor, tente novamente mais tarde."
    }, { status: 500 });
  }
}
