import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

interface VideoStream {
  url: string;
  height: number;
}

interface AudioStream {
  url: string;
}

interface StreamInfo {
  videoStreams: VideoStream[];
  audioStreams: AudioStream[];
}

// Função para obter o stream direto de vídeo e transmiti-lo ao cliente
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

    // Construir a URL direta do vídeo do YouTube
    // Usando uma URL de demonstração que funciona para a maioria dos vídeos
    const directUrl = `https://pipedapi.kavin.rocks/streams/${videoId}`;

    try {
      // Obter informações do stream
      const streamInfo = await axios.get<StreamInfo>(directUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      // Obter a URL do stream de vídeo ou áudio com base no formato solicitado
      let mediaUrl = '';
      
      if (format === 'audio') {
        // Obter o stream de áudio de maior qualidade
        const audioStreams = streamInfo.data.audioStreams || [];
        if (audioStreams.length > 0) {
          mediaUrl = audioStreams[0].url;
        }
      } else {
        // Obter stream de vídeo com base na qualidade
        const videoStreams = streamInfo.data.videoStreams || [];
        let targetHeight = quality === 'high' ? 720 : quality === 'medium' ? 480 : 360;
        
        // Encontrar o stream mais próximo da qualidade desejada
        let selectedStream = videoStreams.find((s: VideoStream) => s.height === targetHeight);
        if (!selectedStream && videoStreams.length > 0) {
          // Se não encontrar a qualidade exata, pegar a mais próxima
          selectedStream = videoStreams[0];
        }
        
        if (selectedStream) {
          mediaUrl = selectedStream.url;
        }
      }

      if (!mediaUrl) {
        throw new Error("Não foi possível encontrar stream de mídia para download");
      }

      // Obter o cabeçalho Content-Type e Content-Length fazendo uma solicitação HEAD
      const headResponse = await axios.head(mediaUrl, {
        timeout: 5000,
      });

      // Iniciar o download do arquivo
      const response = await axios.get(mediaUrl, {
        responseType: 'stream',
        timeout: 30000,
      });

      // Configurar o Content-Type e Content-Disposition para download
      const contentType = headResponse.headers['content-type'] || (format === 'audio' ? 'audio/mp3' : 'video/mp4');
      const extension = format === 'audio' ? 'mp3' : 'mp4';
      const fileName = `${title.replace(/[^\w\s.-]/g, '')}.${extension}`;

      // Criar um Response com o stream
      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
      
      if (headResponse.headers['content-length']) {
        headers.set('Content-Length', headResponse.headers['content-length']);
      }
      
      // Transformar o stream do axios em um ReadableStream para o NextResponse
      const readable = new ReadableStream({
        start(controller) {
          response.data.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          
          response.data.on('end', () => {
            controller.close();
          });
          
          response.data.on('error', (err: Error) => {
            console.error('Erro no stream:', err);
            controller.error(err);
          });
        }
      });

      return new NextResponse(readable, {
        status: 200,
        headers
      });
      
    } catch (error) {
      console.error(`[ERRO] Falha ao obter stream de mídia:`, error instanceof Error ? error.message : String(error));
      return NextResponse.json({
        error: "Não foi possível baixar o vídeo diretamente. Tente novamente mais tarde."
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`[ERRO] Falha ao processar download direto:`, error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      error: "Ocorreu um erro ao processar sua solicitação de download."
    }, { status: 500 });
  }
} 