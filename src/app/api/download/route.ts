import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

// Endpoints alternativos para obter URLs diretas do YouTube
const API_ENDPOINTS = [
  "https://pipedapi.kavin.rocks",         // API Piped
  "https://pipedapi.tokhmi.xyz",          // Outra instância Piped
  "https://pipedapi.moomoo.me",           // Outra instância Piped
  "https://invidious.snopyta.org/api/v1", // API Invidious
  "https://ytapi.smashub.tech"            // API personalizada de fallback
];

// Função para tentar múltiplos endpoints
async function fetchWithFallback(videoId: string, format: string, quality: string) {
  let lastError: Error | null = null;
  
  // Tenta cada endpoint em sequência
  for (const endpoint of API_ENDPOINTS) {
    try {
      if (endpoint.includes("piped")) {
        console.log(`[INFO] Tentando Piped API: ${endpoint}`);
        const response = await axios.get(`${endpoint}/streams/${videoId}`);
        
        // Seleciona stream baseada no formato e qualidade
        let streamUrl = "";
        const data = response.data;
        
        if (format === "audio") {
          // Pega a melhor qualidade de áudio
          const audioStreams = data.audioStreams || [];
          streamUrl = audioStreams.length > 0 ? audioStreams[0].url : "";
        } else {
          // Seleciona vídeo baseado na qualidade
          const videoStreams = data.videoStreams || [];
          let targetHeight = 360; // padrão médio
          
          if (quality === "low") {
            targetHeight = 144;
          } else if (quality === "medium") {
            targetHeight = 360;
          } else if (quality === "high") {
            targetHeight = 720;
          }
          
          // Encontra o stream mais próximo da altura desejada
          const sortedStreams = [...videoStreams].sort((a, b) => {
            const heightA = parseInt(a.quality.replace(/p.*$/, "")) || 0;
            const heightB = parseInt(b.quality.replace(/p.*$/, "")) || 0;
            return Math.abs(heightA - targetHeight) - Math.abs(heightB - targetHeight);
          });
          
          streamUrl = sortedStreams.length > 0 ? sortedStreams[0].url : "";
        }
        
        if (streamUrl) {
          return { success: true, url: streamUrl, source: "piped" };
        } else {
          throw new Error("Nenhum stream disponível para o formato solicitado");
        }
      } else if (endpoint.includes("invidious")) {
        console.log(`[INFO] Tentando Invidious API: ${endpoint}`);
        const response = await axios.get(`${endpoint}/videos/${videoId}`);
        const data = response.data;
        
        // Seleciona formato baseado nas preferências
        let streamUrl = "";
        if (format === "audio") {
          // Ordenar os formatos de áudio por bitrate (qualidade)
          const audioFormats = data.adaptiveFormats.filter((f: any) => f.type.startsWith('audio/')).sort((a: any, b: any) => b.bitrate - a.bitrate);
          streamUrl = audioFormats.length > 0 ? audioFormats[0].url : "";
        } else {
          // Definir resolução alvo baseada na qualidade
          let targetHeight = 360; // padrão médio
          
          if (quality === "low") {
            targetHeight = 144;
          } else if (quality === "medium") {
            targetHeight = 360;
          } else if (quality === "high") {
            targetHeight = 720;
          }
          
          // Filtrar formatos de vídeo e encontrar o mais próximo da resolução desejada
          const videoFormats = data.adaptiveFormats.filter((f: any) => f.type.startsWith('video/'));
          const sortedFormats = [...videoFormats].sort((a: any, b: any) => {
            const heightA = a.height || 0;
            const heightB = b.height || 0;
            return Math.abs(heightA - targetHeight) - Math.abs(heightB - targetHeight);
          });
          
          streamUrl = sortedFormats.length > 0 ? sortedFormats[0].url : "";
        }
        
        if (streamUrl) {
          return { success: true, url: streamUrl, source: "invidious" };
        } else {
          throw new Error("Nenhum stream disponível no formato solicitado");
        }
      } else {
        // Endpoint personalizado para API genérica
        console.log(`[INFO] Tentando API alternativa: ${endpoint}`);
        const response = await axios.get(`${endpoint}/video/url?id=${videoId}&format=${format}&quality=${quality}`);
        const data = response.data;
        
        if (data.url) {
          return { success: true, url: data.url, source: "custom" };
        } else {
          throw new Error("API não retornou URL válida");
        }
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

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { videoId, format = "video", quality = "medium" } = data;

    if (!videoId) {
      return NextResponse.json({ error: "ID do vídeo não fornecido" }, { status: 400 });
    }

    console.log(`[INFO] Obtendo URL de download para ${videoId}, formato: ${format}, qualidade: ${quality}`);
    
    try {
      // Sistema de retry para o fetch
      let result = null;
      let lastError = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[INFO] Tentativa ${attempt}/3 para obter URL de ${videoId}`);
          result = await fetchWithFallback(videoId, format, quality);
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
      
      // Retorna a URL obtida
      return NextResponse.json({
        url: result.url,
        format,
        quality,
        source: result.source
      });
    } catch (error) {
      console.error("[ERRO] Falha ao obter URL de download:", error instanceof Error ? error.message : String(error));
      
      // Informações detalhadas para depuração
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        videoId,
        format,
        quality
      };
      
      console.error(`[DEBUG] Detalhes do erro:`, JSON.stringify(errorDetails));
      
      // Redireciona para o endpoint de streaming como fallback
      return NextResponse.json({ 
        error: "Não foi possível obter URL direta, use o endpoint /api/download/stream", 
        fallback: `/api/download/stream?videoId=${videoId}&format=${format}&quality=${quality}`,
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Erro ao processar download:", err);
    return NextResponse.json({ error: `Erro ao processar download: ${err.message}` }, { status: 500 });
  }
}
