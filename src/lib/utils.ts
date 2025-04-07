import { VideoInfo, DownloadOptions } from "@/types";

export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function getVideoQuality(formats: VideoInfo["formats"]): string[] {
  const qualities = new Set<string>();
  formats.forEach((format) => {
    if (format.hasVideo) {
      qualities.add(format.quality);
    }
  });
  return Array.from(qualities).sort((a, b) => {
    const qualityA = parseInt(a.replace("p", ""));
    const qualityB = parseInt(b.replace("p", ""));
    return qualityB - qualityA;
  });
}

export function validateVideoUrl(url: string): boolean {
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})$/;
  return youtubeRegex.test(url);
}

export function getDefaultOptions(): DownloadOptions {
  return {
    format: "video",
    quality: "720p",
    outputFormat: "mp4",
    includeSubtitles: false,
    translateSubtitles: false,
  };
}

export function generateFileName(title: string, format: string): string {
  // Remove caracteres inválidos e espaços
  const sanitizedTitle = title
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  
  return `${sanitizedTitle}.${format}`;
}

export function getVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
} 