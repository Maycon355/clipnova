import { NextResponse } from "next/server";
import ytdl from "ytdl-core";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

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
    const videoDetails = info.videoDetails;

    // Formatar duração
    const duration = Number(videoDetails.lengthSeconds);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    return NextResponse.json({
      title: videoDetails.title,
      thumbnail: videoDetails.thumbnails[0].url,
      duration: formattedDuration,
      author: videoDetails.author.name,
      viewCount: videoDetails.viewCount,
    });
  } catch (error) {
    console.error("Erro ao obter informações do vídeo:", error);
    return NextResponse.json(
      { error: "Erro ao obter informações do vídeo" },
      { status: 500 }
    );
  }
} 