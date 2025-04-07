# ClipNova 🎥

ClipNova é uma plataforma moderna e performática para download de vídeos do YouTube, oferecendo uma experiência premium gratuita.

## 🚀 Funcionalidades

- Download de vídeos em alta qualidade
- Conversão automática para Shorts/Reels
- Geração de legendas com IA
- Histórico de downloads
- Integração com Google Drive e Dropbox
- Sistema de projetos e playlists
- Interface moderna e responsiva

## 🛠️ Tecnologias

- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: FastAPI (Python)
- Banco de Dados: PostgreSQL (Supabase)
- CDN: Cloudflare
- Autenticação: NextAuth.js
- Estado: Zustand
- Requisições: React Query

## 🏗️ Estrutura do Projeto

```
clipnova/
├── src/
│   ├── app/              # Páginas e rotas
│   ├── components/       # Componentes React
│   ├── lib/             # Utilitários e configurações
│   ├── store/           # Gerenciamento de estado
│   └── types/           # Definições de tipos
├── public/              # Arquivos estáticos
└── package.json         # Dependências
```

## 🚀 Como Executar Localmente

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
4. Execute o projeto:
   ```bash
   npm run dev
   ```

## 🚀 Deploy

### Frontend (Vercel)

1. Crie uma conta no [Vercel](https://vercel.com)
2. Conecte com seu GitHub
3. Importe o projeto
4. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL`

### Backend (Railway)

1. Crie uma conta no [Railway](https://railway.app)
2. Conecte com seu GitHub
3. Crie um novo projeto
4. Configure as variáveis de ambiente:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `API_KEY`

### Banco de Dados (Supabase)

1. Crie uma conta no [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Copie as credenciais para o `.env`:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

### CDN (Cloudflare)

1. Crie uma conta no [Cloudflare](https://cloudflare.com)
2. Adicione seu domínio
3. Configure o DNS para apontar para o Vercel
4. Ative o proxy (ícone laranja)

## 📝 Licença

MIT

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, leia as diretrizes de contribuição antes de submeter um PR.
