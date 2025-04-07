import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
// @ts-ignore - ytdl-core está instalado mas pode não ter tipos
import ytdl from "ytdl-core";
import { Readable } from "stream";
// Para desativar verificações de atualização
process.env.YTDL_NO_UPDATE = 'true';
// Para permitir certificados auto-assinados
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const dynamic = "force-dynamic";

interface VideoStream {
  url: string;
  height: number;
  quality?: string;
  qualityLabel?: string;
  bitrate?: number;
  mimeType?: string;
}

interface AudioStream {
  url: string;
  quality?: string;
  bitrate?: number;
  mimeType?: string;
}

interface StreamInfo {
  videoStreams?: VideoStream[];
  audioStreams?: AudioStream[];
  streams?: any[];
  formats?: any[];
  url?: string;
}

// Lista de APIs alternativas para obter o stream
const API_ENDPOINTS = [
  "https://pipedapi.kavin.rocks/streams",
  "https://pipedapi.tokhmi.xyz/streams",
  "https://api.youtubemultidownloader.com/video", 
  "https://co.wuk.sh/api/json"
];

// Função para obter o stream direto de vídeo ou redirecionar para uma URL de download
export async function GET(request: NextRequest) {
  try {
    // Extrair parâmetros da URL
    const url = new URL(request.url);
    const videoId = url.searchParams.get("videoId");
    const title = url.searchParams.get("title") || `video_${videoId}`;
    const quality = url.searchParams.get("quality") || "high";
    const format = url.searchParams.get("format") || "video";

    if (!videoId) {
      return NextResponse.json(
        { error: "ID do vídeo não fornecido" },
        { status: 400 }
      );
    }

    console.log(`[INFO] Iniciando download direto para o vídeo: ${videoId}`);

    // Tentar obter uma URL direta de download
    try {
      // Usar o serviço Y2mate para gerar uma URL de download direta
      const y2mateUrl = getY2mateUrl(videoId, title, format === 'audio' ? 'mp3' : 'mp4');
      console.log(`[INFO] Redirecionando para Y2mate: ${y2mateUrl}`);
      return NextResponse.redirect(y2mateUrl);
    } catch (error) {
      console.error(`[ERRO] Falha ao obter download via Y2mate:`, error instanceof Error ? error.message : String(error));
      
      // Tentar outra alternativa - SaveFrom
      try {
        const saveFromUrl = getSaveFromUrl(videoId);
        console.log(`[INFO] Redirecionando para SaveFrom: ${saveFromUrl}`);
        return NextResponse.redirect(saveFromUrl);
      } catch (saveFromError) {
        console.error(`[ERRO] Falha ao obter download via SaveFrom:`, saveFromError instanceof Error ? saveFromError.message : String(saveFromError));
      }

      // Como último recurso, redirecionar para o YouTube
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1`;
      console.log(`[INFO] Redirecionando para embed do YouTube: ${embedUrl}`);
      return NextResponse.redirect(embedUrl);
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao processar download direto:`, error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      error: "Ocorreu um erro ao processar sua solicitação de download."
    }, { status: 500 });
  }
}

// Função para gerar uma URL de download do Y2mate
function getY2mateUrl(videoId: string, title: string, format: string = 'mp4'): string {
  // Formato da URL do Y2mate que gera um download direto
  const encodedTitle = encodeURIComponent(title);
  return `https://www.y2mate.com/mates/${videoId}/${format}/${encodedTitle}`;
}

// Função para gerar uma URL de download do SaveFrom
function getSaveFromUrl(videoId: string): string {
  // URL do SaveFrom para download
  return `https://en.savefrom.net/176/#url=https://youtube.com/watch?v=${videoId}`;
} 