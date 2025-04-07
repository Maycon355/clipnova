import { NextRequest, NextResponse } from "next/server";
import ytdl from "ytdl-core";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get("videoId");
    const format = searchParams.get("format") || "video";

    if (!videoId) {
      return NextResponse.json(
        { error: "ID do vídeo é obrigatório" },
        { status: 400 }
      );
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
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

    // Obter informações do vídeo
    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title;
    
    // Configurar cabeçalhos para download
    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; filename="${videoTitle}.${format === "audio" ? "mp3" : "mp4"}"`);
    headers.set("Content-Type", format === "audio" ? "audio/mpeg" : "video/mp4");
    
    // Criar stream de download
    const stream = ytdl(url, options);
    
    // Retornar stream como resposta
    return new NextResponse(stream as any, {
      headers,
    });
  } catch (error) {
    console.error("Erro ao processar streaming:", error);
    return NextResponse.json(
      { error: "Erro ao processar streaming" },
      { status: 500 }
    );
  }
} 