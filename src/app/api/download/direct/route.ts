import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutos para tempo de execução maior

// URL base do YouTube para vídeos incorporados
const YOUTUBE_WATCH_URL = "https://www.youtube.com/watch?v=";
const YOUTUBE_EMBED_URL = "https://www.youtube.com/embed/";

// Um proxy para baixar diretamente, mais simples
export async function GET(request: NextRequest) {
  try {
    // Extrair parâmetros da URL
    const url = new URL(request.url);
    const videoId = url.searchParams.get("videoId");
    const title = url.searchParams.get("title") || `video_${videoId}`;
    const format = url.searchParams.get("format") || "video";

    if (!videoId) {
      return NextResponse.json(
        { error: "ID do vídeo não fornecido" },
        { status: 400 }
      );
    }

    console.log(`[INFO] Processando download para o vídeo: ${videoId}`);

    // Em vez de tentar streamar diretamente, vamos usar a biblioteca rapidmp3.
    // Ela é ótima para fazer download direito sem redirecionamentos externos
    const rapidMp3Base = "https://rapidmp3.me/downloadmp3";
    const videoURL = `${YOUTUBE_WATCH_URL}${videoId}`;
    
    // Se for apenas áudio, geramos um link direto para MP3
    if (format === 'audio') {
      const downloadURL = `${rapidMp3Base}/?q=${encodeURIComponent(videoURL)}`;
      console.log(`[INFO] Redirecionando para download de áudio: ${downloadURL}`);
      return NextResponse.redirect(downloadURL);
    }
    
    // O 9convert é melhor para baixar vídeos
    const videoDownloadURL = `https://9convert.com/?url=${encodeURIComponent(videoURL)}`;
    console.log(`[INFO] Redirecionando para download de vídeo: ${videoDownloadURL}`);
    return NextResponse.redirect(videoDownloadURL);
    
  } catch (error) {
    console.error(`[ERRO] Falha ao processar requisição:`, error instanceof Error ? error.message : String(error));
    
    // Se tudo falhar, redirecionar para o player do YouTube
    try {
      const videoId = new URL(request.url).searchParams.get("videoId");
      if (videoId) {
        const embedUrl = `${YOUTUBE_EMBED_URL}${videoId}?autoplay=1&controls=1`;
        console.log(`[INFO] Redirecionando para player do YouTube: ${embedUrl}`);
        return NextResponse.redirect(embedUrl);
      }
    } catch (e) {
      // Ignora erro no fallback
    }
    
    return NextResponse.json({
      error: "Não foi possível processar sua solicitação de download."
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