declare module 'youtube-dl-exec' {
  type OptionFormatSortPlus = 'res' | 'ext' | 'size' | 'br' | 'asr' | 'proto' | 'codec' | 'fps' | 'vcodec' | 'acodec' | 'filesize' | 'tbr' | 'vbr' | 'sbr' | 'height' | 'width' | 'format_id';

  interface YoutubeDlOptions {
    format?: string;
    output?: string;
    noCheckCertificates?: boolean;
    noWarnings?: boolean;
    preferFreeFormats?: boolean;
    addHeader?: string[];
    cookies?: string;
    noCacheDir?: boolean;
    geoBypass?: boolean;
    geoBypassCountry?: string;
    extractorArgs?: string[];
    formatSort?: OptionFormatSortPlus[];
    mergeOutputFormat?: string;
    retries?: number;
    fragmentRetries?: number;
    fileAccessRetries?: number;
    externalDownloader?: string;
    externalDownloaderArgs?: string;
  }

  function youtubeDl(url: string, options?: YoutubeDlOptions): Promise<Buffer>;
  export default youtubeDl;
} 