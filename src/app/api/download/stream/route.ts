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
    const info = await ytdl.getInfo(url);

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

    // Configurar headers para download
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, "");
    const extension = format === "audio" ? "mp3" : "mp4";
    const filename = `${title}.${extension}`;

    const headers = {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": format === "audio" ? "audio/mpeg" : "video/mp4",
    };

    // Criar stream do vídeo
    const stream = ytdl(url, options);

    // Retornar stream como resposta
    return new NextResponse(stream as any, { headers });
  } catch (error) {
    console.error("Erro ao processar stream:", error);
    return NextResponse.json(
      { error: "Erro ao processar stream" },
      { status: 500 }
    );
  }
} 