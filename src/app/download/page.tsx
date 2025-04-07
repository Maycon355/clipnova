"use client";

import { useState } from "react";
import {
  ArrowDownTrayIcon,
  FilmIcon,
  CloudArrowUpIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function DownloadPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState("video");
  const [quality, setQuality] = useState("high");
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [error, setError] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string>("");

  // Extrair videoId da URL do YouTube
  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  // Verificar se é uma URL válida do YouTube
  const isValidYoutubeUrl = (url: string): boolean => {
    const regExp = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return regExp.test(url);
  };

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);

    if (isValidYoutubeUrl(newUrl)) {
      const videoId = extractVideoId(newUrl);
      if (videoId) {
        try {
          setLoading(true);
          setVideoInfo(null); // Limpa informações anteriores
          console.log(`Obtendo informações para o vídeo ID: ${videoId}`);
          const response = await fetch("/api/video-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error("Erro da API:", errorData);
            throw new Error(errorData.error || "Erro ao obter informações do vídeo");
          }
          
          const data = await response.json();
          console.log("Informações do vídeo obtidas:", data);
          setVideoInfo(data);
          toast.success("Informações do vídeo carregadas com sucesso!");
        } catch (error) {
          console.error("Erro ao obter informações do vídeo:", error);
          toast.error("Não foi possível obter informações do vídeo. O servidor pode estar ocupado ou o vídeo pode ter restrições.");
        } finally {
          setLoading(false);
        }
      }
    } else if (newUrl && newUrl.length > 5) {
      // Limpa se a URL foi apagada ou é inválida e tem mais de 5 caracteres
      setVideoInfo(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const videoId = extractVideoId(url);
      if (!videoId) {
        setError("URL de vídeo inválida. Certifique-se de que é uma URL do YouTube válida.");
        setLoading(false);
        return;
      }

      // Primeiro, obtem informações do vídeo
      const videoInfoResponse = await fetch("/api/video-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoId }),
      });

      if (!videoInfoResponse.ok) {
        const errorData = await videoInfoResponse.json();
        throw new Error(errorData.error || "Erro ao obter informações do vídeo");
      }

      const videoData = await videoInfoResponse.json();
      setVideoInfo(videoData);

      // Redirecionar diretamente para a API de download com os parâmetros
      window.location.href = `/api/download?videoId=${videoId}&format=${format}&quality=${quality}`;
      
      // Importante: como estamos redirecionando a página, o código abaixo não será executado
      // Ele está aqui apenas para manter a lógica caso o redirecionamento não ocorra

    } catch (error) {
      console.error("Erro durante o download:", error);
      setError(error instanceof Error ? error.message : String(error));
      setLoading(false);
    }
  };

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-8">
            Baixe seus vídeos
          </h1>
          <p className="mt-6 text-lg text-white/80 mb-8">
            Cole a URL do YouTube e escolha as opções de download
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-12 space-y-8">
          <div className="glass-effect rounded-xl shadow-lg p-6">
            <label htmlFor="url" className="block text-sm font-medium text-gray-800">
              URL do YouTube
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="url"
                id="url"
                value={url}
                onChange={handleUrlChange}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={loading}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Cole a URL completa do vídeo do YouTube que deseja baixar.
            </p>
          </div>

          {videoInfo && (
            <div className="glass-effect rounded-xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-full sm:w-32 h-auto sm:h-20 object-cover rounded-lg"
                />
                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-medium text-gray-800">{videoInfo.title}</h3>
                  <p className="text-sm text-gray-600">
                    {videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)}:${(videoInfo.duration % 60).toString().padStart(2, '0')}` : ''} 
                    {videoInfo.author ? ` • ${videoInfo.author}` : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-effect rounded-xl shadow-lg p-6">
              <label className="block text-sm font-medium text-gray-800 mb-4">Formato</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormat("video")}
                  className={`${
                    format === "video"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  } flex items-center justify-center rounded-lg border px-6 py-4 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-200 w-full`}
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Vídeo
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("audio")}
                  className={`${
                    format === "audio"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  } flex items-center justify-center rounded-lg border px-6 py-4 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-200 w-full`}
                >
                  <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                  Áudio
                </button>
              </div>
            </div>

            <div className="glass-effect rounded-xl shadow-lg p-6">
              <label className="block text-sm font-medium text-gray-800 mb-4">Qualidade</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setQuality("low")}
                  className={`${
                    quality === "low"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  } flex items-center justify-center rounded-lg border px-6 py-4 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-200 w-full`}
                >
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Baixa
                </button>
                <button
                  type="button"
                  onClick={() => setQuality("medium")}
                  className={`${
                    quality === "medium"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  } flex items-center justify-center rounded-lg border px-6 py-4 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-200 w-full`}
                >
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Média
                </button>
                <button
                  type="button"
                  onClick={() => setQuality("high")}
                  className={`${
                    quality === "high"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  } flex items-center justify-center rounded-lg border px-6 py-4 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-200 w-full`}
                >
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Alta
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-lg font-medium shadow-lg hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </span>
              ) : (
                "Iniciar Download"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
