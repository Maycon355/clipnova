import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para as tabelas do banco de dados
export type Download = {
  id: string;
  user_id: string;
  video_url: string;
  video_title: string;
  video_thumbnail: string;
  download_url: string;
  format: string;
  quality: string;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  created_at: string;
  downloads_count: number;
};
