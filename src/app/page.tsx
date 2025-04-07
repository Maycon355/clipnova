import Link from "next/link";
import { ArrowDownTrayIcon, FilmIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Background gradient */}
      <div className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[-20rem]">
        <div className="relative left-1/2 -z-10 aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#80a0ff] to-[#9089fc] opacity-30 sm:w-[72.1875rem]" />
      </div>

      {/* Hero section */}
      <div className="px-6 pt-10 sm:pt-16 lg:px-8">
        <div className="mx-auto max-w-2xl py-20 sm:py-32 lg:py-40">
          <div className="text-center space-y-8">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              Baixe vídeos do YouTube com{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                facilidade e qualidade
              </span>
            </h1>
            <p className="text-lg sm:text-xl leading-8 text-gray-600 max-w-xl mx-auto">
              ClipNova oferece uma experiência premium gratuita para download de vídeos.
              Converta para Shorts, gere legendas e muito mais!
            </p>
            <div className="flex items-center justify-center gap-x-6">
              <Link
                href="/download"
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-base font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all duration-200 transform hover:scale-105"
              >
                Começar Agora
              </Link>
              <Link 
                href="/features" 
                className="text-base font-semibold leading-6 text-gray-900 hover:text-indigo-600 transition-colors"
              >
                Saiba mais <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-indigo-600 uppercase tracking-wide">
            Recursos Premium
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            Tudo que você precisa para seus vídeos
          </p>
        </div>
        <div className="mx-auto max-w-5xl">
          <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative bg-white rounded-2xl shadow-md p-8 hover:shadow-lg transition-shadow">
              <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-gray-900 mb-4">
                <ArrowDownTrayIcon className="h-6 w-6 flex-none text-indigo-600" />
                Download em Alta Qualidade
              </dt>
              <dd className="text-base leading-7 text-gray-600">
                <p>Baixe vídeos em até 4K com áudio de alta qualidade.</p>
              </dd>
            </div>
            <div className="relative bg-white rounded-2xl shadow-md p-8 hover:shadow-lg transition-shadow">
              <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-gray-900 mb-4">
                <FilmIcon className="h-6 w-6 flex-none text-indigo-600" />
                Conversão para Shorts
              </dt>
              <dd className="text-base leading-7 text-gray-600">
                <p>Converta automaticamente vídeos para formato Shorts/Reels.</p>
              </dd>
            </div>
            <div className="relative bg-white rounded-2xl shadow-md p-8 hover:shadow-lg transition-shadow">
              <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-gray-900 mb-4">
                <CloudArrowUpIcon className="h-6 w-6 flex-none text-indigo-600" />
                Integração com Cloud
              </dt>
              <dd className="text-base leading-7 text-gray-600">
                <p>Salve diretamente no Google Drive ou Dropbox.</p>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div className="relative left-1/2 aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#9089fc] to-[#80a0ff] opacity-30 sm:w-[72.1875rem]" />
      </div>
    </div>
  );
}
