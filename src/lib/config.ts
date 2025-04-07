export const config = {
  siteName: "ClipNova",
  siteDescription: "Baixe vídeos do YouTube com qualidade e facilidade",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",

  // Limites de uso
  limits: {
    free: {
      dailyDownloads: 5,
      maxVideoLength: 720, // em segundos
      maxQuality: "720p",
    },
    premium: {
      dailyDownloads: 50,
      maxVideoLength: 3600, // em segundos
      maxQuality: "4K",
    },
  },

  // Formatos suportados
  formats: {
    video: ["mp4", "webm"],
    audio: ["mp3", "m4a"],
    shorts: ["mp4"],
  },

  // Configurações de cache
  cache: {
    ttl: 60 * 60 * 24, // 24 horas em segundos
    maxSize: 100 * 1024 * 1024, // 100MB em bytes
  },

  // Configurações de API
  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // limite de 100 requisições por janela
    },
  },
};
