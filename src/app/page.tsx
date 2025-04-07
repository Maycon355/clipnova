import Link from "next/link";
import { ArrowDownTrayIcon, FilmIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";

export default function Home() {
  return (
    <div className="relative isolate">
      {/* Background gradient */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      {/* Hero section */}
      <div className="px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Baixe vídeos do YouTube com{" "}
              <span className="text-indigo-600">facilidade e qualidade</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              ClipNova oferece uma experiência premium gratuita para download de vídeos.
              Converta para Shorts, gere legendas e muito mais!
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/download"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Começar Agora
              </Link>
              <Link href="/features" className="text-sm font-semibold leading-6 text-gray-900">
                Saiba mais <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">Recursos Premium</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Tudo que você precisa para seus vídeos
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <ArrowDownTrayIcon className="h-5 w-5 flex-none text-indigo-600" />
                Download em Alta Qualidade
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">Baixe vídeos em até 4K com áudio de alta qualidade.</p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <FilmIcon className="h-5 w-5 flex-none text-indigo-600" />
                Conversão para Shorts
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">Converta automaticamente vídeos para formato Shorts/Reels.</p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <CloudArrowUpIcon className="h-5 w-5 flex-none text-indigo-600" />
                Integração com Cloud
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">Salve diretamente no Google Drive ou Dropbox.</p>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
