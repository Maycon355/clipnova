"use client";

import { useState } from "react";
import {
  ArrowDownTrayIcon,
  FilmIcon,
  CloudArrowUpIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
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
              />
            </div>
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
                  <p className="text-sm text-gray-600">{videoInfo.duration}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-effect rounded-xl shadow-lg p-6">
              <label className="block text-sm font-medium text-gray-800 mb-4">Formato</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  onClick={() => setFormat("shorts")}
                  className={`${
                    format === "shorts"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  } flex items-center justify-center rounded-lg border px-6 py-4 text-sm font-medium shadow-sm hover:bg-gray-50 transition-all duration-200 w-full`}
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
              {loading ? "Processando..." : "Iniciar Download"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
