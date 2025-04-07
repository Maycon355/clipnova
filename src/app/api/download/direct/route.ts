import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

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

    // Tenta cada API alternativa até encontrar uma que funcione
    let lastError: Error | null = null;
    
    // Tenta a primeira API - Piped
    try {
      const directUrl = `${API_ENDPOINTS[0]}/${videoId}`;
      console.log(`[INFO] Tentando obter stream via ${directUrl}`);
      
      // Obter informações do stream
      const streamInfo = await axios.get<StreamInfo>(directUrl, {
        timeout: 8000,
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

      if (mediaUrl) {
        return await streamMedia(mediaUrl, title, format);
      }
    } catch (error) {
      console.error(`[ERRO] Falha ao obter stream via ${API_ENDPOINTS[0]}:`, error instanceof Error ? error.message : String(error));
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    
    // Tenta a segunda API alternativa - Piped alternativo
    try {
      const directUrl = `${API_ENDPOINTS[1]}/${videoId}`;
      console.log(`[INFO] Tentando obter stream via ${directUrl}`);
      
      const streamInfo = await axios.get<StreamInfo>(directUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      
      let mediaUrl = '';
      
      if (format === 'audio') {
        const audioStreams = streamInfo.data.audioStreams || [];
        if (audioStreams.length > 0) {
          mediaUrl = audioStreams[0].url;
        }
      } else {
        const videoStreams = streamInfo.data.videoStreams || [];
        let targetHeight = quality === 'high' ? 720 : quality === 'medium' ? 480 : 360;
        
        let selectedStream = videoStreams.find((s: VideoStream) => s.height === targetHeight);
        if (!selectedStream && videoStreams.length > 0) {
          selectedStream = videoStreams[0];
        }
        
        if (selectedStream) {
          mediaUrl = selectedStream.url;
        }
      }
      
      if (mediaUrl) {
        return await streamMedia(mediaUrl, title, format);
      }
    } catch (error) {
      console.error(`[ERRO] Falha ao obter stream via ${API_ENDPOINTS[1]}:`, error instanceof Error ? error.message : String(error));
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    
    // Tenta a terceira API - Youtube Multi Downloader
    try {
      const directUrl = `${API_ENDPOINTS[2]}?id=${videoId}`;
      console.log(`[INFO] Tentando obter stream via ${directUrl}`);
      
      const streamInfo = await axios.get<StreamInfo>(directUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      
      let mediaUrl = '';
      
      // Esta API retorna os dados de forma diferente
      if (streamInfo.data.url) {
        mediaUrl = streamInfo.data.url;
      } else if (streamInfo.data.formats && streamInfo.data.formats.length > 0) {
        const formats = streamInfo.data.formats;
        
        if (format === 'audio') {
          // Filtrar formatos de áudio
          const audioFormats = formats.filter((f: any) => f.mimeType?.includes('audio'));
          if (audioFormats.length > 0) {
            // Ordenar por bitrate (qualidade)
            audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
            mediaUrl = audioFormats[0].url;
          }
        } else {
          // Filtrar formatos de vídeo
          const videoFormats = formats.filter((f: any) => f.mimeType?.includes('video'));
          if (videoFormats.length > 0) {
            let targetHeight = quality === 'high' ? 720 : quality === 'medium' ? 480 : 360;
            
            // Encontrar o formato com a altura mais próxima da desejada
            let selectedFormat = videoFormats.find((f: any) => f.height === targetHeight);
            if (!selectedFormat) {
              // Ordenar por altura (qualidade)
              videoFormats.sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
              selectedFormat = videoFormats[0];
            }
            
            if (selectedFormat) {
              mediaUrl = selectedFormat.url;
            }
          }
        }
      }
      
      if (mediaUrl) {
        return await streamMedia(mediaUrl, title, format);
      }
    } catch (error) {
      console.error(`[ERRO] Falha ao obter stream via ${API_ENDPOINTS[2]}:`, error instanceof Error ? error.message : String(error));
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    
    // Tenta a quarta API - Cobalt
    try {
      const directUrl = API_ENDPOINTS[3];
      console.log(`[INFO] Tentando obter stream via ${directUrl}`);
      
      const response = await axios.post(directUrl, {
        url: `https://youtube.com/watch?v=${videoId}`,
        vCodec: "h264",
        vQuality: quality === "high" ? "1080" : quality === "medium" ? "720" : "360",
        aFormat: format === "audio" ? "mp3" : "best",
        filenamePattern: "basic",
        isAudioOnly: format === "audio",
        isNoTTWatermark: true,
        disableMetadata: true
      }, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.data && response.data.url) {
        return await streamMedia(response.data.url, title, format);
      }
    } catch (error) {
      console.error(`[ERRO] Falha ao obter stream via ${API_ENDPOINTS[3]}:`, error instanceof Error ? error.message : String(error));
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    
    // Se chegou aqui, todas as APIs falharam
    console.error(`[ERRO] Todas as APIs falharam. Último erro:`, lastError);
    
    // Redirecionar para YouTube como último recurso
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1`;
    console.log(`[INFO] Redirecionando para embed do YouTube: ${embedUrl}`);
    return NextResponse.redirect(embedUrl);
    
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