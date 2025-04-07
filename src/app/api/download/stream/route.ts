import { NextRequest, NextResponse } from "next/server";
import ytdl from "ytdl-core";

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

    // Configuração padrão do ytdl
    const defaultOptions = {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'Cookie': '', // YouTube pode exigir cookies em algumas requisições
          'Referer': 'https://www.youtube.com/'
        },
      }
    };

    // Tentar obter informações do vídeo com retry
    let info;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        info = await ytdl.getInfo(url, defaultOptions);
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw error;
        }
        // Esperar um pouco antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // Verificar se info foi obtido com sucesso
    if (!info) {
      throw new Error("Não foi possível obter informações do vídeo");
    }

    // Configurar opções de download
    let streamOptions: ytdl.downloadOptions = {
      ...defaultOptions
    };

    if (format === "video") {
      const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
      let selectedFormat;

      switch (quality) {
        case "low":
          selectedFormat = formats.find(f => f.qualityLabel === '360p') || formats[0];
          break;
        case "medium":
          selectedFormat = formats.find(f => f.qualityLabel === '720p') || formats[0];
          break;
        case "high":
          selectedFormat = formats.sort((a, b) => Number(b.height) - Number(a.height))[0];
          break;
        default:
          selectedFormat = formats[0];
      }

      streamOptions.format = selectedFormat;
    } else if (format === "audio") {
      const formats = ytdl.filterFormats(info.formats, 'audioonly');
      streamOptions.format = formats.sort((a, b) => Number(b.audioBitrate) - Number(a.audioBitrate))[0];
    }

    // Criar stream com retry
    let stream;
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        stream = ytdl(url, streamOptions);
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
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
    
    // Mensagem de erro mais detalhada
    const errorMessage = error.statusCode === 410 
      ? "O YouTube bloqueou temporariamente o download. Por favor, tente novamente em alguns minutos."
      : "Erro ao processar stream. Por favor, tente novamente.";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: error.statusCode || 500 }
    );
  }
} 