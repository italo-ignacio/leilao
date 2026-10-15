# Leilões RFB

Site em Next.js para visualizar leilões da Receita Federal. Eu escolho os lotes de interesse e os cadastro manualmente pela área admin. Não é um site oficial.

## Stack
- Next.js (App Router) + TypeScript strict
- Prisma + PostgreSQL
- Tailwind + shadcn/ui
- Auth.js (login por e-mail/senha) só para /admin
- Zod + React Hook Form
- Vitest (unitários) e Playwright (e2e)

## Comandos
- `npm run dev`: servidor de desenvolvimento
- `npm run lint` / `npm run typecheck` / `npm test`
- `npx prisma migrate dev`: criar/aplicar migration
- `npx prisma db seed`: popular dados de exemplo
- `docker compose up -d`: sobe o Postgres local

## Estrutura
- `src/app/(public)`: área pública
- `src/app/admin`: área administrativa (protegida por middleware)
- `src/lib`: prisma client, auth, utilitários
- `src/components`: componentes reutilizáveis
- `prisma/schema.prisma`: modelo de dados

## Convenções
- Server Components por padrão; Client Components só quando necessário
- Toda entrada de dados validada com Zod (Server Actions e Route Handlers)
- Valores monetários sempre em `Decimal`, nunca `float`
- Textos da interface em português do Brasil; código e nomes de variáveis em inglês
- Commits pequenos, mensagens no imperativo

## Regras importantes
- Não criar scraping ou automação contra sites da Receita sem eu pedir; respeitar robots.txt e termos de uso se pedir
- Nunca commitar `.env`; manter `.env.example` atualizado
- Rodar lint, typecheck e testes antes de dar uma etapa como concluída
- Antes de mudar o schema Prisma, me explicar o impacto
- O site deve exibir aviso de que não é oficial e que o edital deve ser conferido

## Fluxo de trabalho
- Em tarefas grandes, propor um plano e esperar aprovação antes de implementar
- Ao fim de cada etapa: resumir o que foi feito, como testar e o próximo passo