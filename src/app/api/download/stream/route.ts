import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");
    const format = searchParams.get("format");
    const quality = searchParams.get("quality");

    if (!videoId || !format) {
      return NextResponse.json(
        { error: "Parâmetros inválidos" },
        { status: 400 }
      );
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // Configurações avançadas para evitar bloqueio
    const requestOptions = {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        }
      },
      lang: 'pt-BR'
    };

    // Tentar obter informações do vídeo com retry
    let info;
    let retryCount = 0;
    const maxRetries = 3;
    const delays = [1000, 2000, 4000];

    while (retryCount < maxRetries) {
      try {
        info = await ytdl.getInfo(url, requestOptions);
        break;
      } catch (error: any) {
        console.error(`Tentativa ${retryCount + 1} falhou:`, error.message);
        retryCount++;
        
        if (retryCount === maxRetries) {
          throw new Error(`Falha após ${maxRetries} tentativas: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delays[retryCount - 1]));
      }
    }

    if (!info) {
      throw new Error("Não foi possível obter informações do vídeo");
    }

    // Selecionar o melhor formato baseado nas preferências
    let selectedFormat;
    
    if (format === "video") {
      const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
      
      switch (quality) {
        case "low":
          selectedFormat = videoFormats.find(f => f.qualityLabel === '360p') || videoFormats[0];
          break;
        case "medium":
          selectedFormat = videoFormats.find(f => f.qualityLabel === '720p') || videoFormats[0];
          break;
        case "high":
          selectedFormat = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
          break;
        default:
          selectedFormat = videoFormats[0];
      }
    } else if (format === "audio") {
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      selectedFormat = audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
    }

    if (!selectedFormat) {
      throw new Error("Não foi possível encontrar um formato adequado para download");
    }

    // Criar stream com retry
    let stream: ReturnType<typeof ytdl.downloadFromInfo>;
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        stream = ytdl.downloadFromInfo(info, {
          ...requestOptions,
          format: selectedFormat
        });

        // Verificar se o stream é válido
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            stream?.destroy();
            reject(new Error('Timeout ao iniciar stream'));
          }, 5000);

          stream.once('response', () => {
            clearTimeout(timeout);
            resolve(true);
          });

          stream.once('error', (error: Error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        break;
      } catch (error) {
        console.error(`Tentativa de stream ${retryCount + 1} falhou:`, error);
        retryCount++;
        
        if (retryCount === maxRetries) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, delays[retryCount - 1]));
      }
    }

    if (!stream) {
      throw new Error("Não foi possível criar o stream de download");
    }

    // Configurar headers para download
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, "");
    const extension = format === "audio" ? "mp3" : "mp4";
    const filename = `${title}.${extension}`;

    const headers = {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": format === "audio" ? "audio/mpeg" : "video/mp4",
    };

    return new NextResponse(stream as any, { headers });
  } catch (error: any) {
    console.error("Erro ao processar stream:", error);
    
    let errorMessage = "Erro ao processar stream. Por favor, tente novamente.";
    let statusCode = 500;

    if (error.statusCode === 410) {
      errorMessage = "O YouTube está temporariamente bloqueando downloads. Por favor, aguarde alguns minutos e tente novamente.";
      statusCode = 410;
    } else if (error.message.includes("Timeout")) {
      errorMessage = "O download demorou muito para iniciar. Por favor, tente novamente.";
      statusCode = 408;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 