import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import { Readable } from "stream";
import { getCachedDownload, recordDownloadAttempt } from "@/lib/cache";
import { downloadQueue } from "@/lib/queue";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

// Função para fazer download do binário yt-dlp se necessário
async function ensureYtDlp(): Promise<string> {
  const tempDir = os.tmpdir();
  const ytDlpPath = path.join(tempDir, "yt-dlp");
  
  // Verifica se o arquivo já existe
  if (fs.existsSync(ytDlpPath)) {
    return ytDlpPath;
  }
  
  // URL para download baseada no sistema operacional
  const isWindows = os.platform() === "win32";
  const downloadUrl = isWindows
    ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
  
  // Faz o download do binário
  console.log(`[INFO] Baixando yt-dlp de ${downloadUrl}...`);
  await execAsync(`curl -L ${downloadUrl} -o ${ytDlpPath}`);
  
  // Dá permissão de execução no Linux/Mac
  if (!isWindows) {
    await execAsync(`chmod +x ${ytDlpPath}`);
  }
  
  console.log(`[INFO] yt-dlp baixado para ${ytDlpPath}`);
  return ytDlpPath;
}

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

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Garante que o yt-dlp está disponível
    const ytDlpPath = await ensureYtDlp();
    
    // Configura o formato com base nas preferências
    let formatOption = '';
    if (format === "audio") {
      formatOption = 'bestaudio';
    } else {
      switch (quality) {
        case "low":
          formatOption = 'worstvideo[ext=mp4]+worstaudio[ext=m4a]/worst[ext=mp4]/worst';
          break;
        case "medium":
          formatOption = 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best';
          break;
        case "high":
          formatOption = 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best';
          break;
        default:
          formatOption = 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best';
      }
    }
    
    // Configura parâmetros para o yt-dlp
    const args = [
      videoUrl,
      '-f', formatOption,
      '-o', '-', // Saída para stdout
      '--no-check-certificates',
      '--geo-bypass',
      '--geo-bypass-country', 'BR',
      '--extractor-retries', '10',
      '--fragment-retries', '10',
      '--retries', '10',
      '--no-warnings',
      '--no-progress',
      '--no-call-home',
      '--prefer-free-formats',
      '--add-header', 'Referer:https://www.youtube.com/',
      '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      '--add-header', 'Accept-Language:pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      '--add-header', 'Origin:https://www.youtube.com',
      '--add-header', 'DNT:1',
      '--hls-prefer-native',
      '--buffer-size', '16K',
      '--http-chunk-size', '10M',
      '--rate-limit', '5M',
      '--merge-output-format', format === "audio" ? 'mp3' : 'mp4',
    ];
    
    if (format === "audio") {
      args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0');
    }
    
    // Tenta fazer o download com retry
    let retries = 5;
    let lastError: Error | null = null;

    while (retries > 0) {
      try {
        console.log(`[INFO] Tentativa ${6 - retries}/5 para baixar ${videoId} (formato: ${format}, qualidade: ${quality || 'padrão'})`);
        
        // Cria um processo para executar o yt-dlp
        const ytDlpProcess = spawn(ytDlpPath, args);
        
        // Trata erros de processo
        ytDlpProcess.stderr.on('data', (data) => {
          console.log(`[DEBUG] yt-dlp stderr: ${data.toString()}`);
        });
        
        // Cria uma stream temporária
        const chunks: Buffer[] = [];
        ytDlpProcess.stdout.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });
        
        // Aguarda conclusão do processo
        const exitCode = await new Promise<number>((resolve) => {
          ytDlpProcess.on('close', resolve);
        });
        
        if (exitCode !== 0) {
          throw new Error(`Processo encerrado com código ${exitCode}`);
        }
        
        // Combina os chunks em um único buffer
        const buffer = Buffer.concat(chunks);
        
        // Cria um stream a partir do buffer
        const stream = Readable.from(buffer);

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
        headers.set("Content-Length", buffer.length.toString());

        return new NextResponse(stream as unknown as BodyInit, {
          headers,
          status: 200,
        });
      } catch (error) {
        lastError = error as Error;
        retries--;

        // Registra a tentativa falha
        await recordDownloadAttempt(
          videoId,
          format as "audio" | "video",
          quality || undefined,
          false,
          lastError.message
        );

        // Log detalhado do erro
        console.error(`[ERRO] Falha na tentativa ${5 - retries}/5:`, lastError);
        
        if (retries > 0) {
          // Aumenta o tempo de espera entre tentativas (espera exponencial)
          const waitTime = 5000 * Math.pow(2, 5 - retries);
          console.log(`[INFO] Aguardando ${waitTime/1000} segundos antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // Registra detalhes do erro para ajudar na depuração
    console.error(`[ERRO CRÍTICO] Todas as tentativas falharam para ${videoId}. Último erro:`, lastError);
    
    throw lastError || new Error("Todas as tentativas falharam");
  } catch (error) {
    const err = error as Error;
    console.error("Erro no download:", err);
    return NextResponse.json({ error: "Erro ao processar o download do vídeo", details: err.message }, { status: 500 });
  }
}
