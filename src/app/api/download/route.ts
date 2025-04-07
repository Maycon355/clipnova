import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";
export const maxDuration = 5; // Limita a execução a 5 segundos no máximo

// Função para obter URL do Y2mate (extremamente rápido)
function getY2mateUrl(videoId: string) {
  return `https://www.y2mate.com/youtube/${videoId}`;
}

// Função para obter URL alternativa do SaveFrom
function getSaveFromUrl(videoId: string) {
  return `https://pt.savefrom.net/192/download-from-youtube#url=https://youtube.com/watch?v=${videoId}`;
}

// Função para obter URL de player com fallback (quando tudo mais falhar)
function getFallbackPlayerUrl(videoId: string) {
  return `/api/download/stream?videoId=${videoId}`;
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

    // Responde rapidamente com o Y2mate, que funciona bem para a maioria dos vídeos
    return NextResponse.json({ 
      url: getY2mateUrl(videoId),
      format: format || "video",
      quality: quality || "high",
      videoId,
      alternativeUrl: getSaveFromUrl(videoId)
    });
  } catch (error) {
    console.error(`[ERRO] Falha ao processar download:`, error instanceof Error ? error.message : String(error));
    
    // Em caso de erro, direciona para o fallback de streaming
    try {
      // Captura o videoId da requisição original
      let videoId = "";
      
      try {
        const requestData = await request.json();
        videoId = requestData.videoId || "";
      } catch (parseError) {
        console.error("Erro ao analisar a requisição para fallback:", parseError);
      }
      
      if (!videoId) {
        return NextResponse.json({
          error: "ID do vídeo não fornecido ou inválido"
        }, { status: 400 });
      }
      
      // Fornecer um fallback rápido
      const fallbackUrl = getFallbackPlayerUrl(videoId);
      
      return NextResponse.json({
        url: fallbackUrl,
        alternativeUrl: getSaveFromUrl(videoId),
        isRedirect: true
      }, { status: 200 });
    } catch (fallbackError) {
      // Se até mesmo o fallback falhar, retornamos apenas a mensagem de erro
      return NextResponse.json({
        error: "Não foi possível processar o vídeo. Por favor, tente novamente mais tarde."
      }, { status: 500 });
    }
  }
}
