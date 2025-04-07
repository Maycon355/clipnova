import { NextRequest, NextResponse } from "next/server";
import youtubeDl from "youtube-dl-exec";
import type { OptionFormatSortPlus } from "youtube-dl-exec";
import { getCachedDownload, recordDownloadAttempt } from "@/lib/cache";
import { downloadQueue } from "@/lib/queue"; // Importar a fila

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get("videoId");
    const format = searchParams.get("format");
    const quality = searchParams.get("quality");

    if (!videoId || !format) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    // Adiciona o job à fila para processamento assíncrono
    await downloadQueue.add({
      videoId,
      format: format as "audio" | "video",
      quality: quality || undefined,
    });

    // Verifica se o download está em cache
    const cachedDownload = await getCachedDownload(
      videoId,
      format as "audio" | "video",
      quality || undefined
    );

    // Se o download estiver em cache e for bem-sucedido, retorna a URL
    if (cachedDownload && cachedDownload.success && cachedDownload.url) {
      return NextResponse.json({ url: cachedDownload.url });
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // Configurações avançadas para evitar bloqueio
    const options = {
      format:
        format === "audio"
          ? "bestaudio"
          : "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best",
      output: "-",
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        "referer:youtube.com",
        "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language:pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        'sec-ch-ua:"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "sec-ch-ua-mobile:?0",
        'sec-ch-ua-platform:"Windows"',
        "sec-fetch-dest:document",
        "sec-fetch-mode:navigate",
        "sec-fetch-site:none",
        "sec-fetch-user:?1",
        "upgrade-insecure-requests:1",
        "origin:https://www.youtube.com",
        "cookie:CONSENT=YES+; VISITOR_INFO1_LIVE=yes",
      ],
      cookies: "cookies.txt",
      noCacheDir: true,
      geoBypass: true,
      geoBypassCountry: "BR",
      extractorArgs: ["youtube:player_client=all"],
      formatSort: ["res", "ext", "size", "br", "asr", "proto"] as OptionFormatSortPlus[],
      mergeOutputFormat: "mp4",
      retries: 10,
      fragmentRetries: 10,
      fileAccessRetries: 10,
      externalDownloader: "aria2c",
      externalDownloaderArgs:
        "--min-split-size=1M --max-connection-per-server=16 --max-concurrent-downloads=16 --split=16 --max-tries=5 --retry-wait=5",
      socketTimeout: 30,
      forceIpv4: true,
      addMetadata: true,
      writeThumbnail: false,
      writeDescription: false,
      writeAnnotations: false,
      writeSub: false,
      writeAutoSub: false,
      subFormat: "srt",
      subLang: "pt",
      embedThumbnail: false,
      embedMetadata: true,
      embedSubtitle: false,
      embedChapters: false,
      extractAudio: format === "audio",
      audioFormat: format === "audio" ? "mp3" : undefined,
      audioQuality: format === "audio" ? 0 : undefined,
      postprocessors:
        format === "audio"
          ? [
              {
                key: "FFmpegExtractAudio",
                preferredcodec: "mp3",
                preferredquality: "192",
              },
            ]
          : undefined,
      // Novas opções para evitar bloqueio
      sleepInterval: 5,
      maxSleepInterval: 30,
      sleepIntervalRequests: 3,
      maxDownloads: 1,
      rateLimit: 100000,
      throttledRate: 100000,
      bufferSize: 1024,
      httpChunkSize: 10485760,
      ignoreErrors: true,
      noColor: true,
      noProgress: true,
      noCallHome: true,
      // Opções de proxy (se disponível)
      proxy: process.env.PROXY_URL || undefined,
      sourceAddress: process.env.SOURCE_IP || undefined,
    };

    // Ajusta qualidade para vídeo
    if (format === "video") {
      switch (quality) {
        case "low":
          options.format = "worstvideo[ext=mp4]+worstaudio[ext=m4a]/worst[ext=mp4]/worst";
          break;
        case "medium":
          options.format =
            "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best";
          break;
        case "high":
          options.format =
            "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best";
          break;
      }
    }

    // Tenta fazer o download com retry
    let retries = 5;
    let lastError;

    while (retries > 0) {
      try {
        const stream = await youtubeDl(url, options);

        // Registra o download bem-sucedido
        await recordDownloadAttempt(
          videoId,
          format as "audio" | "video",
          quality || undefined,
          true
        );

        // Configura headers da resposta
        const headers = new Headers();
        headers.set("Content-Type", format === "audio" ? "audio/mpeg" : "video/mp4");
        headers.set(
          "Content-Disposition",
          `attachment; filename="download.${format === "audio" ? "mp3" : "mp4"}"`
        );
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type");

        return new NextResponse(stream as unknown as BodyInit, {
          headers,
          status: 200,
        });
      } catch (error) {
        lastError = error;
        retries--;

        // Registra a tentativa falha
        await recordDownloadAttempt(
          videoId,
          format as "audio" | "video",
          quality || undefined,
          false,
          error instanceof Error ? error.message : String(error)
        );

        if (retries > 0) {
          // Aumenta o tempo de espera entre tentativas
          await new Promise(resolve => setTimeout(resolve, 5000 * (5 - retries)));
        }
      }
    }

    throw lastError;
  } catch (error) {
    console.error("Erro no download:", error);
    return NextResponse.json({ error: "Erro ao processar o download do vídeo" }, { status: 500 });
  }
}
