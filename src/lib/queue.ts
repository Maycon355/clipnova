import Queue from 'bull';
import YouTubeDl from 'youtube-dl-exec';
import { cacheDownload } from './cache';

// Interface para os dados de download
interface DownloadJob {
  videoId: string;
  format: 'audio' | 'video';
  quality?: string;
}

// Tipo para os jobs e resultados
interface JobResult {
  success: boolean;
  url: string;
}

// Configurando a conexão com Redis
const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  }
};

// Criando a fila de downloads
const downloadQueue = new Queue<DownloadJob>('videoDownload', redisConfig);

// Processando os downloads em segundo plano
downloadQueue.process(async (job: Queue.Job<DownloadJob>) => {
  const { videoId, format, quality } = job.data;
  
  try {
    console.log(`Processando download: ${videoId}, ${format}, ${quality || 'default'}`);
    
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Configurações para download
    const options = {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
      referer: 'https://youtube.com',
      format: format === 'audio' ? 'bestaudio' : 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best',
      geoBypass: true,
      geoBypassCountry: 'BR'
    };
    
    // Ajustar qualidade para vídeo
    if (format === 'video' && quality) {
      switch (quality) {
        case 'low':
          options.format = 'worstvideo[ext=mp4]+worstaudio[ext=m4a]/worst[ext=mp4]/worst';
          break;
        case 'medium':
          options.format = 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best';
          break;
        case 'high':
          options.format = 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best';
          break;
      }
    }
    
    // Executar o download
    const result = await YouTubeDl(url, options);
    
    // Processar o resultado
    if (result) {
      // Supondo que o resultado inclua URLs dos formatos
      const videoUrl = typeof result === 'string' ? result : (result as any).url || '';
      
      // Armazenar no cache
      await cacheDownload(
        videoId,
        format as 'audio' | 'video',
        quality,
        videoUrl,
        true
      );
      
      return { success: true, url: videoUrl };
    }
    
    throw new Error('Falha ao obter informações do vídeo');
  } catch (error) {
    console.error(`Erro no processamento do download: ${videoId}`, error);
    
    // Armazenar o erro no cache
    await cacheDownload(
      videoId,
      format as 'audio' | 'video',
      quality,
      '',
      false,
      error instanceof Error ? error.message : String(error)
    );
    
    throw error;
  }
});

// Event handlers
downloadQueue.on('completed', (job: Queue.Job<DownloadJob>, result: JobResult) => {
  console.log(`Download completo: ${job.data.videoId}`);
});

downloadQueue.on('failed', (job: Queue.Job<DownloadJob>, error: Error) => {
  console.error(`Download falhou: ${job.data.videoId}`, error);
});

export { downloadQueue }; 