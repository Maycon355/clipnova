import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

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

// Definindo interface para formato de vídeo
interface VideoFormat {
  format_id: string;
  ext: string;
  resolution?: string;
  width?: number;
  height?: number;
  filesize?: number;
  format_note?: string;
  acodec?: string;
  vcodec?: string;
}

// Definindo interface para erro do execAsync
interface ExecError extends Error {
  stderr?: string;
  stdout?: string;
  code?: number;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { videoId } = data;

    if (!videoId) {
      return NextResponse.json(
        { error: "ID do vídeo não fornecido" },
        { status: 400 }
      );
    }

    // Certifica que o yt-dlp está disponível
    const ytDlpPath = await ensureYtDlp();
    
    // Configura os parâmetros avançados
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    console.log(`[INFO] Obtendo informações do vídeo ${videoId}...`);
    
    // Executa yt-dlp com parâmetros avançados para evitar bloqueios
    const cmd = [
      `"${ytDlpPath}"`,
      `"${url}"`,
      '--dump-json',
      '--no-check-certificates',
      '--geo-bypass',
      '--geo-bypass-country', 'BR',
      '--extractor-retries', '10',
      '--fragment-retries', '10',
      '--skip-download',
      '--no-warnings',
      '--no-progress',
      '--no-playlist',
      '--add-header', '"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"',
      '--add-header', '"Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"',
      '--add-header', '"Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"',
      '--add-header', '"Referer: https://www.youtube.com/"',
      '--add-header', '"Origin: https://www.youtube.com"',
      '--add-header', '"DNT: 1"',
      '--sleep-interval', '1',
      '--max-sleep-interval', '5',
    ].join(' ');
    
    try {
      // Executa com 3 tentativas
      let output = "";
      let lastError: ExecError | null = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[INFO] Tentativa ${attempt}/3 para obter informações do vídeo ${videoId}`);
          const { stdout } = await execAsync(cmd);
          output = stdout;
          break;
        } catch (error) {
          lastError = error as ExecError;
          console.error(`[ERRO] Tentativa ${attempt} falhou:`, lastError.message);
          
          // Espera 2 segundos entre tentativas
          if (attempt < 3) {
            console.log(`[INFO] Aguardando 2 segundos antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (!output) {
        throw lastError || new Error("Todas as tentativas falharam");
      }
      
      // Processa a saída
      const videoInfo = JSON.parse(output);
      
      // Formato de retorno simplificado
      const result = {
        videoId: videoInfo.id,
        title: videoInfo.title,
        description: videoInfo.description?.substring(0, 200) + "..." || "",
        thumbnail: videoInfo.thumbnail || videoInfo.thumbnails?.[0]?.url,
        duration: videoInfo.duration,
        author: videoInfo.uploader,
        authorUrl: videoInfo.uploader_url,
        viewCount: videoInfo.view_count,
        uploadDate: videoInfo.upload_date,
        formats: videoInfo.formats?.map((format: VideoFormat) => ({
          format_id: format.format_id,
          ext: format.ext,
          resolution: format.resolution || (format.width ? format.width + "x" + format.height : ""),
          filesize: format.filesize,
          format_note: format.format_note,
          acodec: format.acodec,
          vcodec: format.vcodec,
        })) || [],
      };

      return NextResponse.json(result);
    } catch (error) {
      const execError = error as ExecError;
      console.error(`[ERRO] Falha ao obter informações do vídeo:`, execError);
      
      // Informações detalhadas para depuração
      const errorDetails = {
        message: execError.message,
        cmd: cmd,
        stderr: execError.stderr,
        stdout: execError.stdout,
        code: execError.code,
      };
      
      console.error(`[DEBUG] Detalhes do erro:`, JSON.stringify(errorDetails));
      
      throw new Error(`Erro ao executar yt-dlp: ${execError.message}`);
    }
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao obter informações do vídeo:", err);
    return NextResponse.json(
      { error: `Erro ao obter informações do vídeo: ${err.message}` },
      { status: 500 }
    );
  }
}
