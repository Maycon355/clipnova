import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Configuração para deploy no Vercel - Teste de commit e push
// ATENÇÃO: Removendo maxDuration para testar compatibilidade
export const dynamic = "force-dynamic";
// Removido maxDuration para testar compatibilidade com Vercel

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

    // Redirecionamento direto para o Y2mate
    return NextResponse.redirect(getY2mateUrl(videoId));
    
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

    // Redirecionamento direto para o Y2mate, que funciona bem para a maioria dos vídeos
    return NextResponse.redirect(getY2mateUrl(videoId));
    
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
      
      // Redirecionamento direto para o fallback
      const fallbackUrl = getFallbackPlayerUrl(videoId);
      return NextResponse.redirect(fallbackUrl);
      
    } catch (fallbackError) {
      // Se até mesmo o fallback falhar, retornamos apenas a mensagem de erro
      return NextResponse.json({
        error: "Não foi possível processar o vídeo. Por favor, tente novamente mais tarde."
      }, { status: 500 });
    }
  }
}
