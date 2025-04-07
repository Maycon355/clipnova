import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { Readable } from "stream";

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");
    const format = searchParams.get("format") || "video";
    const quality = searchParams.get("quality") || "medium";
    
    if (!videoId) {
      return NextResponse.json({ error: "ID do vídeo não fornecido" }, { status: 400 });
    }
    
    console.log(`[INFO] Streaming para ${videoId}, formato: ${format}, qualidade: ${quality}`);
    
    // Sistema de retry para o fetch
    let result = null;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[INFO] Tentativa ${attempt}/3 para obter URL de streaming para ${videoId}`);
        result = await fetchWithFallback(videoId, format as string, quality as string);
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
    
    // Configura o proxy para a URL
    const targetUrl = result.url;
    console.log(`[INFO] URL de streaming obtida: ${targetUrl} (fonte: ${result.source})`);
    
    // Busca o conteúdo para proxying
    const response = await axios.get(targetUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com'
      }
    });
    
    // Determina o tipo MIME com base no formato
    const mimeType = format === "audio" 
      ? "audio/mpeg" 
      : "video/mp4";
    
    // Define o nome do arquivo para download
    const filename = `youtube_${videoId}_${format}_${quality}.${format === "audio" ? "mp3" : "mp4"}`;
    
    // Prepara o stream de resposta
    const stream = response.data;
    const headers = new Headers();
    
    // Configura os cabeçalhos da resposta
    headers.set('Content-Type', mimeType);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Se a resposta original tiver headers de conteúdo, use-os
    if (response.headers['content-length']) {
      headers.set('Content-Length', response.headers['content-length']);
    }
    
    // Cria um ReadableStream a partir do stream do axios
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        
        stream.on('end', () => {
          controller.close();
        });
        
        stream.on('error', (err: Error) => {
          console.error(`[ERRO] Stream error:`, err);
          controller.error(err);
        });
      }
    });
    
    // Retorna o stream como resposta
    return new NextResponse(readableStream, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error(`[ERRO] Falha no streaming:`, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ 
      error: `Erro ao processar streaming: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}
