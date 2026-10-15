# Leilões RFB

Catálogo independente de leilões da Receita Federal, com curadoria manual.
Não é um site oficial nem afiliado à Receita Federal. Confira sempre o edital
oficial antes de qualquer lance.

## Estado do projeto

Etapas 1 a 5: fundação Next.js App Router, TypeScript strict, Tailwind/shadcn/ui,
tema persistente, Prisma/PostgreSQL, importação manual, Auth.js, administração CRUD,
galeria de imagens e catálogo público com busca, filtros, detalhes, favoritos e SEO.

Os 2 editais e 8 lotes selecionados foram importados no Azure como rascunhos,
com 82 linhas de mercadorias e 132 unidades. As datas não fornecidas permanecem
nulas. Os registros permanecem como rascunhos até publicação manual; por isso não
aparecem no catálogo público. A área pública consulta somente editais/lotes publicados,
com filtros na URL, paginação, detalhes, favoritos locais e sitemap/robots. O
administrador inicial foi criado com hash Argon2id; login/logout estão em
`/admin/login`, e CRUD protegido em `/admin`. A faixa de aviso foi removida; a
informação legal de site não oficial permanece discretamente no rodapé público.

## Requisitos e setup

- Node.js 24 LTS e npm (o lockfile deve ser mantido no controle de versão).
- Docker Desktop em execução para o PostgreSQL local.

```bash
npm ci
cp .env.example .env
npm run db:up
npm run db:migrate
npm run db:check-curation
npm run db:import
npm run auth:secret
npm run dev
```

No PowerShell, use `Copy-Item .env.example .env` no lugar de `cp`.
Abra http://localhost:3000, ou a porta indicada pelo Next.js caso esteja ocupada.
O banco usa `127.0.0.1:55432` para evitar conflito com instalações locais na 5432.
O volume `postgres_data` mantém os dados ao reiniciar os containers.
`npm run db:down` para os serviços sem excluir esse volume.

A tela inicial pode ser executada sem banco nesta etapa. As credenciais de
exemplo são exclusivas para desenvolvimento. Para validar o Compose sem criar
um arquivo de ambiente: `docker compose --env-file .env.example up -d --wait`.
Para Azure, configure `DATABASE_URL` com a senha URL-encoded e `sslmode=require`;
o Docker local não é necessário para executar a aplicação com banco remoto.

## Ambiente

Veja `.env.example`. Nunca versione `.env`, credenciais ou arquivos enviados.

| Variáveis                                                            | Finalidade                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Banco local; senha obrigatória no Compose.                         |
| `DATABASE_URL`                                                       | Banco usado pelo Prisma, migrations, seed e importação.            |
| `TEST_DATABASE_URL`                                                  | Banco local para os testes de integração; nunca use Azure.         |
| `NEXT_PUBLIC_APP_URL`                                                | URL pública usada em canonical, Open Graph e sitemap.              |
| `AUTH_SECRET`                                                        | Segredo aleatório para criptografar e assinar sessões.             |
| `AUTH_URL`                                                           | Origem exata da autenticação; HTTPS em produção.                   |
| `AUTH_TRUSTED_IP_HEADER`                                             | Cabeçalho de IP reescrito por um proxy confiável; vazio sem proxy. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`                        | Seed do administrador; senha obrigatória com 12 a 128 caracteres.  |
| `SEED_DEMO_DATA`                                                     | `false` por padrão; exemplos fictícios somente em banco local.     |
| `STORAGE_DRIVER`, `STORAGE_LOCAL_PATH`                               | Storage local em desenvolvimento (`./storage/uploads`).            |
| `STORAGE_S3_BUCKET`, `STORAGE_S3_ENDPOINT`, `STORAGE_S3_REGION`      | S3/R2; credenciais AWS via cadeia padrão do SDK.                   |

Ao trocar a senha ou porta do banco, ajuste também `DATABASE_URL`.
Alterar `POSTGRES_PASSWORD` não muda a senha de um banco já inicializado no volume.
Não apague volumes com dados importantes para resolver alterações de credenciais.

## Scripts e testes

```bash
npm run lint
npm run typecheck
npm test
npm run format:check
npx playwright install chromium
npm run test:e2e
npm run build
```

`npm run format` aplica Prettier; `npm run test:watch` inicia Vitest interativo.
O typecheck gera Prisma Client e tipos de rotas antes de executar TypeScript.
O client gerado não é versionado; `postinstall` e o build também o geram.
Playwright inicia um servidor de produção isolado na porta 3100 e verifica desktop/mobile,
catálogo, teclado, tema, login/logout, cookies, origem, CSRF, CRUD e galeria. Usa
`TEST_DATABASE_URL` local por padrão. As contas e senhas são efêmeras e removidas
ao final. Playwright constrói e inicia uma versão de produção isolada em `.next-e2e`,
sem DevTools sobre os controles mobile e sem reaproveitar o servidor dev atual. Capturas ficam em
`test-results/` e não são versionadas. Não use a porta 3100 para outra aplicação
durante os testes. Por padrão, os testes exigem `TEST_DATABASE_URL` local e Docker
Desktop iniciado. Se o proprietário autorizar explicitamente usar o banco Azure
de teste `leiloes`, rode uma única vez no Bash:

```bash
E2E_ALLOW_REMOTE_DATABASE=leiloes npm run test:e2e
```

No PowerShell, defina `$env:E2E_ALLOW_REMOTE_DATABASE='leiloes'`, execute
`npm run test:e2e` e depois remova a variável da sessão. O opt-in só aceita o
database `leiloes` no host Azure PostgreSQL, porta 5432, com `sslmode=require`.
Não salve essa variável em `.env`. O fluxo usa registros E2E com prefixo e contas
efêmeras, e remove somente esses registros no teardown. Ainda assim, não execute
simultaneamente outros testes ou alterações manuais nesse banco.

As integrações em `tests/integration/database.ts` incluem seed demonstrativo e
continuam restritas a banco local. O storage e2e fica em `storage/e2e-uploads` e é limpo
automaticamente junto dos registros criados com prefixo exclusivo. Os testes e2e
administrativos validam CRUD, uploads, permissões e privacidade das imagens.

## Banco e curadoria

```bash
npm run db:validate
npm run db:migrate
npm run db:check-curation
npm run db:import
```

`db:migrate` usa `prisma migrate deploy`, sem reset nem shadow database no Azure.
Novas migrations devem ser desenvolvidas em banco local e revisadas antes do deploy.
Não execute `prisma migrate reset` ou `db push --accept-data-loss` em bancos com dados.

`data/curated-lots.json` preserva o conteúdo copiado pelo curador, URLs e preços
em strings. `db:check-curation` valida sem conectar ao banco. `db:import` valida
com Zod e grava em uma única transação. É insert-only: repetir não duplica registros
nem sobrescreve edições, preços, notas, senhas ou publicações existentes.
Conflitos com registros excluídos ou URLs divergentes interrompem a transação;
revise-os manualmente. Números de lote iguais em editais distintos são permitidos.
Descrições iguais dentro de um lote não são deduplicadas: a posição de cada linha
e sua quantidade são preservadas.

Leilões e lotes têm slugs únicos, timestamps e exclusão lógica. Valores usam
`Decimal(18,2)`, nunca `float`; quantidades são `Decimal(14,3)` no banco.
A migration inclui índices de filtros, busca textual GIN em português e checks
de valores, quantidades e datas. Não depende de extensões PostgreSQL.

Os registros entram como `DRAFT`. A consulta pública exige edital e lote publicados,
não excluídos e categoria ativa, e não seleciona observações pessoais.
Ícones institucionais não são fotos. O ícone PJ/misto é guardado como referência;
a elegibilidade precisa ser conferida no edital antes de preencher o campo definitivo.
Modalidade não confirmada permanece `UNKNOWN`.

Datas são UTC (`timestamptz`). `getAuctionStatus` calcula a janela de propostas,
com prioridade para suspensão/cancelamento. Datas ausentes resultam em
`UNSCHEDULED`, sem assumir que “Disponibilizado” significa aberto. Datas de
classificação e sessão de lances têm campos separados. A rotina agendada e a
interface de status serão ligadas nas próximas etapas; não há cron nesta etapa.

## Seed e integração

Configure `ADMIN_EMAIL` e uma `ADMIN_PASSWORD` forte no ambiente, sem compartilhar
a senha no chat. Depois execute:

```bash
npm run db:seed
```

O seed cria um administrador com hash Argon2id, sem senha padrão ou login público.
Reexecutar não redefine a senha, promove usuários nem reativa contas excluídas.
O login usa a senha salva pelo seed, não o valor atual do ambiente se o usuário
já existia. Trocar `ADMIN_PASSWORD` e repetir o seed não redefine senhas.
`SEED_DEMO_DATA=true` adiciona
um edital e um lote explicitamente fictícios, como rascunhos, apenas em banco local.
Essa opção é recusada em bancos remotos, inclusive Azure.

Para testes de integração, suba o Docker e aplique as migrations ao banco local.
Exemplo no Bash, com as credenciais demonstrativas do Compose:

```bash
npm run db:up
DATABASE_URL='postgresql://leiloes:development-only-change-me@127.0.0.1:55432/leiloes?schema=public' npm run db:migrate
TEST_DATABASE_URL='postgresql://leiloes:development-only-change-me@127.0.0.1:55432/leiloes?schema=public' npm run test:integration
```

Esses overrides não alteram a URL Azure em `.env`. Ajuste a URL local se trocou
as credenciais do Docker. Também é possível definir `TEST_DATABASE_URL` em `.env`.
O teste recusa hosts remotos, importa a curadoria duas vezes e confere preços,
mercadorias, ausência de duplicação, rollback, soft delete, checks SQL e seed.
Ele deixa cópias locais dos lotes e exemplos, e um admin de teste com senha aleatória;
não toca no Azure nem imprime essa senha. Também verifica rate limit sob
concorrência, expiração dos contadores e revogação da conta.

## Autenticação administrativa

```bash
npm run auth:secret
npm run dev
```

Abra http://localhost:3000/admin/login e use as credenciais do administrador criado
pelo seed. `auth:secret` gera um segredo em `.env.local`, ignorado pelo Git, sem
imprimi-lo; não substitui um segredo válido. Reinicie o servidor se trocar segredos.
Em produção, configure `AUTH_SECRET` no ambiente do deploy e mantenha o mesmo valor
em todas as instâncias. Rotacioná-lo invalida as sessões existentes.

`AUTH_URL` deve corresponder exatamente à URL usada no navegador. Se usar
`127.0.0.1`, outra porta ou domínio, atualize a origem e reinicie o servidor.
O fallback é `NEXT_PUBLIC_APP_URL`. A aplicação recusa login de outra origem,
inclusive quando apenas o hostname difere (`localhost` não é `127.0.0.1`).
Configure também o ingress para aceitar somente o domínio público esperado.

Auth.js usa Credentials e JWT criptografado com validade de 8 horas. Cookies são
HttpOnly, SameSite=Lax e Secure quando a origem é HTTPS. O logout é feito por POST.
Callbacks HTTP diretos mantêm a proteção CSRF do Auth.js; Server Actions verificam
origem e usam a proteção nativa do Next.js. Redirecionamentos são restritos à
origem configurada e aos caminhos públicos de retorno/administração previstos.

`src/proxy.ts` aplica o bloqueio inicial de `/admin` (é o nome atual do middleware
no Next.js 16). Além dele, `requireAdmin` revalida no banco papel ADMIN, conta ativa,
ausência de exclusão e versão da conta a cada leitura de sessão. Desativar, excluir,
trocar senha ou alterar o usuário invalida o acesso antigo. As operações futuras
devem chamar essa autorização; não confie apenas no layout ou proxy.
As páginas administrativas têm `noindex, nofollow`.

O login valida com Zod no servidor e React Hook Form no cliente. Senhas são
verificadas com Argon2id. Conta inexistente, senha errada e usuário sem permissão
recebem a mesma mensagem; o hash de padding reduz diferenças grosseiras de tempo.
Falhas do banco não liberam o login.

O rate limit é atômico e persistente no PostgreSQL: 8 tentativas por e-mail e
40 por IP em 15 minutos. Chaves são HMACs, sem e-mail/IP em texto puro. Sem uma
fonte confiável de IP, aplica um limite compartilhado de 100 tentativas em
15 minutos, além do limite por conta. Tentativas bem-sucedidas também contam.
Não confia em `x-forwarded-for` fornecido diretamente por um cliente.

Só configure `AUTH_TRUSTED_IP_HEADER` se o proxy de entrada remover e reescrever
esse cabeçalho com um único IP e bloquear acesso direto ao servidor. Na Vercel,
sem essa variável, é usado `x-vercel-forwarded-for`. Um valor vazio mantém o modo
compartilhado. Listas de IPs ou valores inválidos usam o modo compartilhado.

Execute periodicamente `npm run auth:cleanup` para remover somente contadores
expirados. A limpeza ainda não está agendada; o cron será configurado na etapa
de produção. Contadores expirados já deixam de bloquear mesmo antes da limpeza.

## Administração e imagens

O dashboard em `/admin` mostra totais de editais/lotes, rascunhos, publicados,
arquivados e propostas abertas pela janela de datas. As listas de editais, lotes
e categorias têm busca, paginação e filtros de estado. Formulários criam e editam
com Zod no servidor; exclusão de editais e lotes é lógica, com restauração.
Edições usam versão do registro para evitar sobrescrever alterações concorrentes.
Lotes incluem linhas de mercadorias e observações pessoais, que não entram nas
consultas públicas.

Os registros novos começam como rascunho. Publicar é uma ação explícita no campo
de status do formulário; salvar uma edição não muda o status automaticamente.
Datas são informadas em horário de Brasília e persistidas em UTC. Categorias com
lotes vinculados não podem ser excluídas; podem ser desativadas e restauradas.
O modo de participação fica `UNKNOWN` até confirmação no edital, sem inferir
elegibilidade pelos ícones do portal. O storage local salva somente dentro de
`storage/`. A implementação S3 também suporta endpoints compatíveis com R2 via
`STORAGE_S3_ENDPOINT`; use HTTPS e a cadeia padrão de credenciais AWS do ambiente,
sem adicionar chaves ao `.env.example`. Uploads aceitam JPEG, PNG e WebP, até 5 MB
por arquivo, 5 arquivos por envio e 20 imagens por lote. `sharp` valida o conteúdo,
limita dimensões, reencoda para WebP e remove metadados. Fotos de rascunhos são
privadas; as públicas exigem lote e edital publicados e categoria ativa.
Na edição do lote, também é possível importar uma imagem por URL direta do
storage público Serpro. O servidor só aceita HTTPS no host permitido e no
caminho de arquivos de imagem, não segue redirecionamentos, limita o download a
5 MB e aplica o mesmo processamento e storage privado dos uploads locais.

No cadastro de um novo edital, o botão `Ler dados copiados` tenta preencher
número, unidade, URL oficial, órgão, situação da fonte e datas a partir do texto
e dos links HTML copiados do portal. Se a permissão do navegador bloquear o
clipboard, a colagem manual também preserva links HTML quando o navegador os
fornece. O parser valida o domínio/caminho oficial e as datas; os campos
permanecem editáveis e nada é salvo até o usuário revisar e clicar em Salvar.
Essa função só processa o texto já copiado no navegador; não acessa nem faz
scraping automático do portal.

No cadastro de lote, o mesmo fluxo extrai número do edital para associar um
registro existente, situação, tipo, preço mínimo, recinto e mercadorias. O ícone
`icone-edital-pj` informa participação exclusiva de pessoa jurídica; o ícone de
participação mista é tratado separadamente. O link do edital não é usado como
URL do lote: esse campo só é preenchido se o HTML copiado incluir um link
específico de lote. Número do lote, categoria e localização continuam exigindo
revisão/preenchimento quando não aparecem na cópia. Nada é salvo automaticamente.

## Catálogo público

A home mostra contagem de editais com propostas abertas, encerrando nos próximos
sete dias e quantidade de lotes publicados, além dos respectivos destaques.
`/lotes` aceita `q`, categoria, UF, cidade, faixa de preço, situação derivada de
datas/overrides, modalidade, intervalo de encerramento, ordenação e página via
`searchParams`. O servidor limita a 12 resultados por página e normaliza números
e datas antes de consultar Prisma. Preços usam `Decimal`; a busca textual usa os
campos públicos do lote, mercadorias, categoria e edital.
Na rota `/lotes`, cada cartão permite abrir um diálogo com quantidades e descrições
das mercadorias sem entrar no detalhe; a home continua usando consultas reduzidas.

`/lotes/[slug]` apresenta galeria, descrição, mercadorias, preço mínimo, avaliação,
localização, retirada, datas de propostas/classificação/sessão, status derivado,
contagem regressiva e links oficiais HTTPS. `/leiloes/[slug]` lista apenas lotes
publicados daquele edital. Metadados incluem canonical/Open Graph; `robots.txt`
exclui admin e APIs; o sitemap é dividido em até 25 mil URLs por arquivo e só
inclui registros públicos.

Favoritos ficam em `localStorage`, limitados a 30 slugs validados. A API devolve
somente os ainda publicados, sem notas pessoais, e a lista remove referências que
deixaram de estar disponíveis. Favoritos não exigem conta.

## Estrutura

```text
src/app/(public)/   Layout e página pública (Server Components)
src/app/admin/      Login, Server Actions, CRUD e dashboard protegido
src/app/api/admin/  Upload de imagens autorizado
src/app/api/images/ Entrega privada/pública de imagens conforme publicação
src/app/api/auth/   Route Handler Auth.js
src/proxy.ts        Bloqueio inicial de rotas administrativas
src/app/           Layout raiz, tema CSS e páginas de erro
src/components/    Aviso, seletor de tema e componentes shadcn/ui
src/lib/           Prisma, consultas, validação, importação e regras de status
src/generated/     Prisma Client gerado, não versionado
src/test/          Setup dos testes unitários
prisma/            Schema, migrations, CLI de importação e seed
data/              Curadoria manual estruturada
tests/e2e/         Fluxos Playwright
tests/integration/ Verificação de persistência em PostgreSQL local
compose.yaml       PostgreSQL local com healthcheck
```

## Dados e segurança

A fonte oficial é a [página de leilões da Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/leilao),
que aponta para a consulta pública no Sistema de Leilão Eletrônico e participação
pelo e-CAC. Não foi identificada documentação de API pública nessa página.
Não há scraping nem automação de coleta neste projeto.

O Compose publica o banco somente no localhost. Senhas de demonstração não são
adequadas para produção. O driver exige TLS com verificação de certificado em
bancos remotos. O pool tem limite padrão de 5 conexões por processo, configurável
por `connection_limit` na URL entre 1 e 20. Considere o total de instâncias no deploy.

O npm registra alertas de severidade alta em `braces` e ferramentas transitivas
de ESLint/shadcn. A correção sugerida pelo audit envolve downgrades incompatíveis;
não foi aplicada. `npm audit --omit=dev` deve ser executado para verificar runtime,
e a pendência das ferramentas deve ser reavaliada antes da entrega de produção.
Os alertas adicionais de dependências transitivas do Prisma foram corrigidos por
overrides de versões; valide migrations, geração e testes ao atualizá-los.

## Deploy previsto

Vercel com PostgreSQL gerenciado e storage S3/R2, ou aplicação em Docker com
volumes persistentes. Ainda faltam importação CSV, rotina agendada para limpeza/
reconciliação de status, política de backups, configuração final de deploy e
verificação com storage S3/R2 de produção.
O filesystem da Vercel não deve ser usado como armazenamento persistente.
O build já pode ser validado com `npm run build`; `npm start` inicia esse build.

## Próxima etapa

Implementar importação CSV com relatório de erros, rotina agendada de manutenção,
backups, validação operacional do storage S3/R2, revisão final de segurança e deploy.
Não há commits automáticos.
