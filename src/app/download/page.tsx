"use client";

import { useState } from "react";
import { ArrowDownTrayIcon, FilmIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function DownloadPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState("video"); // video, shorts, audio

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
        body: JSON.stringify({ url, format }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar download");
      }

      // Iniciar download
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Baixe seus vídeos
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Cole a URL do YouTube e escolha o formato desejado
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-12 space-y-8">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">
              URL do YouTube
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Formato</label>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormat("video")}
                className={`${
                  format === "video"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                } flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50`}
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
                } flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50`}
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
                } flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50`}
              >
                <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                Áudio
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Processando..." : "Baixar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 