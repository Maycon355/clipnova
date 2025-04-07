import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClipNova - Download de Vídeos do YouTube",
  description: "Baixe vídeos do YouTube em alta qualidade, gratuitamente!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} animated-gradient`}>
        <div className="min-h-screen flex flex-col relative">
          <div className="absolute inset-0 bg-white/30 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <Navbar />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
