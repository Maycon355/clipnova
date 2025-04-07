import { NextResponse } from "next/server";
import ytdl from "ytdl-core";

export async function POST(request: Request) {
  try {
    const { url, format, quality } = await request.json();

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

    // Configurar opções de download com base no formato e qualidade
    let options: ytdl.downloadOptions = {};
    
    if (format === "video") {
      switch (quality) {
        case "low":
          options = {
            quality: "18", // 360p
            filter: "videoandaudio",
          };
          break;
        case "medium":
          options = {
            quality: "22", // 720p
            filter: "videoandaudio",
          };
          break;
        case "high":
        default:
          options = {
            quality: "highest",
            filter: "videoandaudio",
          };
          break;
      }
    } else if (format === "shorts") {
      switch (quality) {
        case "low":
          options = {
            quality: "18",
            filter: "videoandaudio",
            range: {
              start: 0,
              end: 60 * 1000,
            },
          };
          break;
        case "medium":
          options = {
            quality: "22",
            filter: "videoandaudio",
            range: {
              start: 0,
              end: 60 * 1000,
            },
          };
          break;
        case "high":
        default:
          options = {
            quality: "highest",
            filter: "videoandaudio",
            range: {
              start: 0,
              end: 60 * 1000,
            },
          };
          break;
      }
    } else if (format === "audio") {
      switch (quality) {
        case "low":
          options = {
            quality: "lowestaudio",
            filter: "audioonly",
          };
          break;
        case "medium":
          options = {
            quality: "highestaudio",
            filter: "audioonly",
          };
          break;
        case "high":
        default:
          options = {
            quality: "highestaudio",
            filter: "audioonly",
          };
          break;
      }
    }

    // Retornar URL de download
    return NextResponse.json({
      success: true,
      title: videoTitle,
      videoId,
      downloadUrl: `/api/download/stream?videoId=${videoId}&format=${format}&quality=${quality}`,
    });
  } catch (error) {
    console.error("Erro ao processar download:", error);
    return NextResponse.json(
      { error: "Erro ao processar download" },
      { status: 500 }
    );
  }
} 