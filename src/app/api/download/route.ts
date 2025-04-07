import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import fs from "fs";

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

// Definindo interface para erro do execAsync
interface ExecError extends Error {
  stderr?: string;
  stdout?: string;
  code?: number;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { videoId, format = "video", quality = "medium" } = data;

    if (!videoId) {
      return NextResponse.json({ error: "ID do vídeo não fornecido" }, { status: 400 });
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Certifica que o yt-dlp está disponível
    const ytDlpPath = await ensureYtDlp();
    
    console.log(`[INFO] Obtendo URL de download para ${videoId}, formato: ${format}, qualidade: ${quality}`);
    
    // Formatação avançada para extrair apenas a URL direta
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
    
    // Parâmetros para extrair apenas a URL
    const cmd = [
      `"${ytDlpPath}"`,
      `"${url}"`,
      '-g',  // Apenas obtém a URL do vídeo
      '-f', `"${formatOption}"`,
      '--no-check-certificates',
      '--geo-bypass',
      '--geo-bypass-country', 'BR',
      '--extractor-retries', '10',
      '--fragment-retries', '10',
      '--no-warnings',
      '--no-progress',
      '--no-playlist',
      '--add-header', '"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"',
      '--add-header', '"Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"',
      '--add-header', '"Referer: https://www.youtube.com/"',
      '--add-header', '"Origin: https://www.youtube.com"',
      '--add-header', '"DNT: 1"',
      '--sleep-interval', '1',
      '--max-sleep-interval', '5',
    ].join(' ');
    
    try {
      // Sistema de retry melhorado
      let output = "";
      let lastError: ExecError | null = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[INFO] Tentativa ${attempt}/3 para obter URL de ${videoId}`);
          const { stdout } = await execAsync(cmd);
          output = stdout.trim();
          break;
        } catch (error) {
          lastError = error as ExecError;
          console.error(`[ERRO] Tentativa ${attempt} falhou:`, lastError.message);
          
          if (attempt < 3) {
            const waitTime = 2000 * attempt; // Tempo crescente entre tentativas
            console.log(`[INFO] Aguardando ${waitTime/1000}s antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      if (!output) {
        throw lastError || new Error("Todas as tentativas falharam");
      }
      
      // Caso de formato com múltiplas URLs (áudio e vídeo separados)
      const urls = output.split('\n').filter(Boolean);
      
      // Retorna a URL ou URLs obtidas
      return NextResponse.json({
        url: urls.length === 1 ? urls[0] : urls,
        format,
        quality
      });
    } catch (error) {
      const execError = error as ExecError;
      console.error("[ERRO] Falha ao obter URL de download:", execError);
      
      // Informações detalhadas para depuração
      const errorDetails = {
        message: execError.message,
        cmd: cmd,
        stderr: execError.stderr,
        stdout: execError.stdout,
        code: execError.code,
      };
      
      console.error(`[DEBUG] Detalhes do erro:`, JSON.stringify(errorDetails));
      
      // Redireciona para o endpoint de streaming como fallback
      return NextResponse.json({ 
        error: "Não foi possível obter URL direta, use o endpoint /api/download/stream", 
        fallback: `/api/download/stream?videoId=${videoId}&format=${format}&quality=${quality}`,
        details: execError.message
      }, { status: 500 });
    }
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao processar download:", err);
    return NextResponse.json({ error: `Erro ao processar download: ${err.message}` }, { status: 500 });
  }
}
