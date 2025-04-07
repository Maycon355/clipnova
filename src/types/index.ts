export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  author: string;
  formats: VideoFormat[];
}

export interface VideoFormat {
  formatId: string;
  quality: string;
  mimeType: string;
  url: string;
  contentLength: string;
  bitrate: number;
  audioQuality?: string;
  hasAudio: boolean;
  hasVideo: boolean;
}

export interface DownloadOptions {
  format: "video" | "audio" | "shorts";
  quality: string;
  outputFormat: string;
  includeSubtitles?: boolean;
  translateSubtitles?: boolean;
  targetLanguage?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  plan: "free" | "premium";
  dailyDownloads: number;
  lastDownloadDate: string;
}

export interface DownloadHistory {
  id: string;
  userId: string;
  videoId: string;
  title: string;
  format: string;
  quality: string;
  downloadedAt: string;
  fileSize: number;
  status: "completed" | "failed" | "processing";
}
