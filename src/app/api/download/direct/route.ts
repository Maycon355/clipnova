import { NextRequest, NextResponse } from "next/server";
// @ts-ignore - ytdl-core está instalado mas pode não ter tipos
import ytdl from "ytdl-core";

// Desativa verificação de certificados SSL para solução de problemas com certificados
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// Desativa verificações de atualização do ytdl-core
process.env.YTDL_NO_UPDATE = 'true';

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutos para permitir downloads maiores

// URL do YouTube para fallback
const YOUTUBE_EMBED_URL = "https://www.youtube.com/embed/";

// Função para download direto sem dependência de sites externos
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

    try {
      // Configurar opções baseadas no formato e qualidade
      const options: ytdl.downloadOptions = {
        filter: format === 'audio' ? 'audioonly' as ytdl.Filter : 'audioandvideo' as ytdl.Filter,
        quality: determineQuality(format, quality),
        requestOptions: {
          // Desabilitar verificações de certificado e adicionar headers para evitar bloqueios
          rejectUnauthorized: false,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.youtube.com/'
          }
        }
      };
      
      // Obter o stream do vídeo
      const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
      const videoStream = ytdl(videoURL, options);
      
      // Preparar o nome do arquivo para download
      const sanitizedTitle = title.replace(/[^\w\s.-]/g, '_');
      const extension = format === 'audio' ? 'mp3' : 'mp4';
      const fileName = `${sanitizedTitle}.${extension}`;
      
      // Configurar cabeçalhos de resposta
      const contentType = format === 'audio' ? 'audio/mpeg' : 'video/mp4';
      const headers = new Headers();
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
      headers.set('Content-Type', contentType);
      
      // Tratamento especial para erros no stream antes de enviar resposta
      let hasError = false;
      videoStream.on('error', (err) => {
        console.error('[ERRO] Erro no stream:', err);
        hasError = true;
      });
      
      // Aguardar um momento para verificar se há erros imediatos
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (hasError) {
        throw new Error("Erro ao iniciar streaming de vídeo");
      }
      
      // Transformar o stream Node.js em ReadableStream para o navegador
      const readable = new ReadableStream({
        start(controller) {
          // Configurar tratamento de dados
          videoStream.on('data', (chunk) => {
            controller.enqueue(chunk);
          });
          
          // Finalizar o stream quando completar
          videoStream.on('end', () => {
            controller.close();
          });
          
          // Tratar erros durante o streaming
          videoStream.on('error', (err) => {
            console.error('[ERRO] Erro no stream:', err);
            controller.error(err);
          });
        }
      });
      
      // Retornar a resposta com o stream para download direto
      return new NextResponse(readable, {
        status: 200,
        headers
      });
      
    } catch (streamError) {
      console.error(`[ERRO] Falha ao criar stream:`, streamError instanceof Error ? streamError.message : String(streamError));
      
      // Tentar abordagem alternativa antes de desistir completamente
      try {
        // Como alternativa, redirecionamos para um player do YouTube
        const embedUrl = `${YOUTUBE_EMBED_URL}${videoId}?autoplay=1&controls=1`;
        console.log(`[INFO] Redirecionando para player do YouTube: ${embedUrl}`);
        return NextResponse.redirect(embedUrl);
      } catch (fallbackError) {
        console.error(`[ERRO] Falha até no fallback:`, fallbackError);
        return NextResponse.json({
          error: "Não foi possível processar o download. Tente novamente mais tarde."
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error(`[ERRO] Erro geral:`, error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      error: "Não foi possível processar sua solicitação de download."
    }, { status: 500 });
  }
}

// Função auxiliar para determinar a qualidade com base no formato e qualidade selecionados
function determineQuality(format: string, quality: string): string {
  if (format === 'audio') {
    return 'highestaudio';
  }
  
  // Para vídeos
  switch (quality) {
    case 'low':
      return '18'; // 360p
    case 'medium':
      return '22'; // 720p
    case 'high':
    default:
      return 'highest'; // Melhor qualidade disponível
  }
} 