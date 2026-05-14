# Equipe Assessoria Contábil — Sistema Comercial

Sistema comercial interno desenvolvido com Next.js 14, TypeScript, Tailwind CSS, shadcn/ui e Supabase.

## Tecnologias

- **Next.js 14** — App Router, Server Actions, Server Components
- **TypeScript** — tipagem estática
- **Tailwind CSS** — estilização
- **shadcn/ui** — componentes de interface
- **Supabase** — autenticação e banco de dados PostgreSQL

## Estrutura de pastas

```
/app
  /(auth)/login         → página de login (rota pública)
  /(protected)/dashboard → home protegida
/components
  /ui                   → componentes shadcn/ui (Button, Input, etc.)
  login-form.tsx        → formulário de login com estado
  logout-button.tsx     → botão de sair
/lib
  /supabase
    client.ts           → cliente Supabase para o browser
    server.ts           → cliente Supabase para Server Components
    middleware.ts       → lógica de proteção de rotas
  utils.ts              → utilitários (cn)
/types
  index.ts              → tipos TypeScript globais
middleware.ts           → middleware Next.js (proteção de rotas)
```

## Como rodar localmente

### 1. Pré-requisitos

- Node.js 18 ou superior
- npm 9 ou superior
- Conta no [Supabase](https://supabase.com) (gratuita)

### 2. Configurar o Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e crie um novo projeto
2. Após criado, vá em **Settings → API**
3. Copie a **Project URL** e a **anon public key**

### 3. Configurar variáveis de ambiente

Edite o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY_AQUI
```

### 4. Criar o primeiro usuário no Supabase

1. No painel do Supabase, vá em **Authentication → Users**
2. Clique em **Add user → Create new user**
3. Informe o e-mail e senha do colaborador

### 5. Instalar dependências e rodar

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) — você será redirecionado para a página de login.

## Funcionalidades implementadas

- [x] Autenticação com e-mail e senha (Supabase Auth)
- [x] Proteção de rotas via middleware Next.js
- [x] Redirecionamento automático: logado → dashboard, deslogado → login
- [x] Página de login com visual profissional
- [x] Página home protegida com botão de logout
- [x] Feedback de erro no login (credenciais inválidas)
- [x] Loading state nos botões de entrar e sair

## Próximos passos (roadmap)

- [ ] Gestão de leads
- [ ] Kanban de oportunidades
- [ ] Sistema de scoring
- [ ] Dashboard com métricas
