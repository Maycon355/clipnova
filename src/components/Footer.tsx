import Link from "next/link";
import { InstagramIcon } from "./Icons";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center space-x-2 text-gray-500">
            <span>Desenvolvido por</span>
            <span className="font-semibold text-indigo-600">Maycon Motta</span>
          </div>
          
          <div className="mt-4 flex items-center space-x-4">
            <Link 
              href="https://www.instagram.com/xmayconmotta/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-indigo-500 transition-colors duration-200"
              aria-label="Instagram"
            >
              <InstagramIcon className="h-6 w-6" />
            </Link>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 italic font-serif">
              "Procurando um desenvolvedor apaixonado por criar experiências digitais excepcionais?"
            </p>
          </div>
          
          <div className="mt-4 text-xs text-gray-400">
            © {new Date().getFullYear()} ClipNova. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
} 