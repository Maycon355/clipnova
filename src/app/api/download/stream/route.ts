import { NextRequest, NextResponse } from "next/server";
import youtubeDl from "youtube-dl-exec";

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
    const options = {
      format: format === "audio" ? "bestaudio" : "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      output: "-",
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        "referer:youtube.com",
        "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language:pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "sec-ch-ua:\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Google Chrome\";v=\"122\"",
        "sec-ch-ua-mobile:?0",
        "sec-ch-ua-platform:\"Windows\"",
        "sec-fetch-dest:document",
        "sec-fetch-mode:navigate",
        "sec-fetch-site:none",
        "sec-fetch-user:?1",
        "upgrade-insecure-requests:1"
      ],
      cookies: "cookies.txt",
      noCacheDir: true,
      geoBypass: true,
      geoBypassCountry: "BR",
      extractorArgs: ["youtube:player_client=all"],
      formatSort: ["res", "ext:mp4:m4a", "size", "br", "asr", "proto"],
      mergeOutputFormat: "mp4",
      retries: 3,
      fragmentRetries: 3,
      fileAccessRetries: 3,
      externalDownloader: "aria2c",
      externalDownloaderArgs: "--min-split-size=1M --max-connection-per-server=16 --max-concurrent-downloads=16 --split=16"
    };

    // Ajusta qualidade para vídeo
    if (format === "video") {
      switch (quality) {
        case "low":
          options.format = "worstvideo[ext=mp4]+worstaudio[ext=m4a]/worst[ext=mp4]/worst";
          break;
        case "medium":
          options.format = "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best";
          break;
        case "high":
          options.format = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
          break;
      }
    }

    // Tenta fazer o download com retry
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        const stream = await youtubeDl(url, options);
        
        // Configura headers da resposta
        const headers = new Headers();
        headers.set("Content-Type", format === "audio" ? "audio/mpeg" : "video/mp4");
        headers.set("Content-Disposition", `attachment; filename="download.${format === "audio" ? "mp3" : "mp4"}"`);
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type");

        return new NextResponse(stream as unknown as BodyInit, {
          headers,
          status: 200
        });
      } catch (error) {
        lastError = error;
        retries--;
        if (retries > 0) {
          // Aumenta o tempo de espera entre tentativas
          await new Promise(resolve => setTimeout(resolve, 2000 * (3 - retries)));
        }
      }
    }

    throw lastError;
  } catch (error) {
    console.error("Erro no download:", error);
    return NextResponse.json(
      { error: "Erro ao processar o download do vídeo" },
      { status: 500 }
    );
  }
} 