import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError } from "axios";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const data = await request.json();
  const { videoId } = data;
  
  try {
    console.log(`[DIAGNÓSTICO] Iniciando diagnóstico para videoId: ${videoId}`);
    
    // Testar acesso básico ao YouTube
    console.log(`[DIAGNÓSTICO] Testando acesso ao YouTube...`);
    const youtubeResponse = await axios.get("https://www.youtube.com", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    });
    console.log(`[DIAGNÓSTICO] Resposta do YouTube: ${youtubeResponse.status}`);
    
    // Verificar IP atual
    console.log(`[DIAGNÓSTICO] Verificando IP atual...`);
    const ipResponse = await axios.get("https://api.ipify.org?format=json");
    console.log(`[DIAGNÓSTICO] IP atual: ${ipResponse.data.ip}`);
    
    // Verificar limitações da função serverless
    console.log(`[DIAGNÓSTICO] Verificando limitações serverless...`);
    console.log(`[DIAGNÓSTICO] Ambiente: ${process.env.VERCEL_ENV}`);
    console.log(`[DIAGNÓSTICO] Região: ${process.env.VERCEL_REGION}`);
    
    return NextResponse.json({ 
      success: true,
      diagnostico: {
        youtube_status: youtubeResponse.status,
        ip_atual: ipResponse.data.ip,
        ambiente: process.env.VERCEL_ENV,
        regiao: process.env.VERCEL_REGION
      }
    });
  } catch (error: unknown) {
    const err = error as Error | AxiosError;
    console.error(`[DIAGNÓSTICO] Erro: ${err.message}`);
    console.error(`[DIAGNÓSTICO] Stack: ${err.stack}`);
    
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      stack: err.stack,
      statusCode: axios.isAxiosError(err) ? err.response?.status : undefined
    }, { status: 500 });
  }
} 