"use client";

import { useState } from "react";
import { ArrowDownTrayIcon, FilmIcon, CloudArrowUpIcon, SparklesIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import ytdl from "ytdl-core";

export default function DownloadPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState("video");
  const [quality, setQuality] = useState("high");
  const [videoInfo, setVideoInfo] = useState<any>(null);

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    
    if (ytdl.validateURL(newUrl)) {
      try {
        const response = await fetch("/api/video-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: newUrl }),
        });
        const data = await response.json();
        if (response.ok) {
          setVideoInfo(data);
        }
      } catch (error) {
        console.error("Erro ao obter informações do vídeo:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast.error("Por favor, insira uma URL do YouTube");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, format, quality }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar download");
      }

      window.location.href = data.downloadUrl;
      toast.success("Download iniciado com sucesso!");
    } catch (error) {
      console.error("Erro:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar o download");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Baixe seus vídeos
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Cole a URL do YouTube e escolha as opções de download
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-12 space-y-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">
              URL do YouTube
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="url"
                id="url"
                value={url}
                onChange={handleUrlChange}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          </div>

          {videoInfo && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-4">
                <img 
                  src={videoInfo.thumbnail} 
                  alt={videoInfo.title}
                  className="w-32 h-20 object-cover rounded-lg"
                />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{videoInfo.title}</h3>
                  <p className="text-sm text-gray-500">{videoInfo.duration}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-4">Formato</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat("video")}
                  className={`${
                    format === "video"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  } flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-200`}
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Vídeo
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("shorts")}
                  className={`${
                    format === "shorts"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  } flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-200`}
                >
                  <FilmIcon className="h-5 w-5 mr-2" />
                  Shorts
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("audio")}
                  className={`${
                    format === "audio"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  } flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-200`}
                >
                  <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                  Áudio
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-4">Qualidade</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setQuality("low")}
                  className={`${
                    quality === "low"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  } flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-200`}
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
                  } flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-200`}
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
                  } flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-200`}
                >
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Alta
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </div>
              ) : (
                "Baixar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 