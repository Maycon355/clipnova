import { NextResponse } from "next/server";
import ytdl from "ytdl-core";

export async function POST(request: Request) {
  try {
    const { url, format } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL é obrigatória" },
        { status: 400 }
      );
    }

    // Validar se é uma URL do YouTube
    if (!ytdl.validateURL(url)) {
      return NextResponse.json(
        { error: "URL inválida do YouTube" },
        { status: 400 }
      );
    }

    // Obter informações do vídeo
    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title;
    const videoId = info.videoDetails.videoId;

    // Configurar opções de download com base no formato
    let options: ytdl.downloadOptions = {};
    
    if (format === "video") {
      options = {
        quality: "highest",
        filter: "videoandaudio",
      };
    } else if (format === "shorts") {
      options = {
        quality: "highest",
        filter: "videoandaudio",
        range: {
          start: 0,
          end: 60 * 1000, // Limitar a 60 segundos para shorts
        },
      };
    } else if (format === "audio") {
      options = {
        quality: "highestaudio",
        filter: "audioonly",
      };
    }

    // Retornar URL de download
    return NextResponse.json({
      success: true,
      title: videoTitle,
      videoId,
      downloadUrl: `/api/download/stream?videoId=${videoId}&format=${format}`,
    });
  } catch (error) {
    console.error("Erro ao processar download:", error);
    return NextResponse.json(
      { error: "Erro ao processar download" },
      { status: 500 }
    );
  }
} 