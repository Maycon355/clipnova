import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
// @ts-ignore - ytdl-core está instalado mas pode não ter tipos
import ytdl from "ytdl-core";
import { Readable } from "stream";

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

    try {
      // Verificar se o vídeo existe
      const videoExists = await ytdl.validateID(videoId);
      if (!videoExists) {
        throw new Error("ID de vídeo inválido");
      }

      // Obter informações do vídeo
      const videoInfo = await ytdl.getInfo(videoId);
      
      // Opções para o formato
      const options: ytdl.downloadOptions = {
        quality: format === 'audio' ? 'highestaudio' : 'highest',
      };
      
      // Se for vídeo, definir qualidade específica
      if (format === 'video') {
        if (quality === 'high') {
          options.quality = 'highest';
        } else if (quality === 'medium') {
          options.quality = '18'; // 360p
        } else { // low
          options.quality = '18'; // 360p
        }
      }
      
      // Obter o nome do arquivo limpo
      const sanitizedTitle = title.replace(/[^\w\s.-]/g, '') || `video_${videoId}`;
      const extension = format === 'audio' ? 'mp3' : 'mp4';
      const fileName = `${sanitizedTitle}.${extension}`;
      
      // Criar um stream para o vídeo
      const videoStream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, options);
      
      // Configurar headers para download
      const headers = new Headers();
      headers.set('Content-Type', format === 'audio' ? 'audio/mp3' : 'video/mp4');
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Criar um stream legível para o Next.js
      const readable = new ReadableStream({
        start(controller) {
          videoStream.on('data', (chunk) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          
          videoStream.on('end', () => {
            controller.close();
          });
          
          videoStream.on('error', (err) => {
            console.error('[ERRO] Erro no stream:', err);
            controller.error(err);
          });
        }
      });
      
      return new NextResponse(readable, {
        status: 200,
        headers
      });
      
    } catch (error) {
      console.error(`[ERRO] Falha ao obter stream direto:`, error instanceof Error ? error.message : String(error));
      
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

// Função auxiliar para fazer streaming do arquivo de mídia
async function streamMedia(mediaUrl: string, title: string, format: string): Promise<NextResponse> {
  try {
    console.log(`[INFO] Iniciando streaming de mídia: ${mediaUrl}`);
    
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
    console.error(`[ERRO] Falha ao fazer streaming de mídia:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
} 