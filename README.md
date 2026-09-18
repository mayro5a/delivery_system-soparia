# 🍲 Soparia da Lê — Delivery com pagamento online

Sistema web completo para a **Soparia da Lê**: o cliente monta o pedido pelo celular, informa o
endereço, **paga com Pix ou cartão pelo próprio site (Mercado Pago)** e, com o pagamento confirmado
pelo backend, envia o pedido estruturado para o WhatsApp da loja e recebe um **e-mail de
confirmação** — com um segundo e-mail quando o pedido sai para entrega. O cliente também pode
acompanhar o andamento do pedido (preparo → saiu para entrega → entregue) na própria página do
pedido. O administrador acompanha tudo em um painel Kanban e gerencia cardápio, preços,
disponibilidade e taxas de entrega.

> WhatsApp da Soparia: **(92) 99278-1331** (`5592992781331` nos links `wa.me`).
> O WhatsApp é o canal de **confirmação/comunicação** do pedido — **não** é o meio de pagamento.

---

## Sumário

1. [Visão geral do fluxo](#1-visão-geral-do-fluxo)
2. [Tecnologias](#2-tecnologias)
3. [Estrutura do projeto](#3-estrutura-do-projeto)
4. [Instalação](#4-instalação)
5. [Variáveis de ambiente](#5-variáveis-de-ambiente)
6. [Banco de dados (PostgreSQL)](#6-banco-de-dados-postgresql)
7. [Migrations](#7-migrations)
8. [Seed e usuário administrador](#8-seed-e-usuário-administrador)
9. [Executando o backend](#9-executando-o-backend)
10. [Executando o frontend](#10-executando-o-frontend)
11. [Configuração do Mercado Pago](#11-configuração-do-mercado-pago)
12. [Webhook](#12-webhook)
13. [Ambiente de testes / sandbox](#13-ambiente-de-testes--sandbox)
14. [Testes automatizados](#14-testes-automatizados)
15. [Rotas da API](#15-rotas-da-api)
16. [Segurança](#16-segurança)
17. [Painel administrativo](#17-painel-administrativo)
18. [E-mail transacional](#18-e-mail-transacional)

---

## 1. Visão geral do fluxo

```
CLIENTE
  escolhe produtos → adiciona observações → carrinho → informa endereço
  → sistema soma a taxa de entrega fixa → pedido criado (AGUARDANDO_PAGAMENTO)
  → escolhe Pix ou cartão (Payment Brick do Mercado Pago)
  → Mercado Pago processa → BACKEND confirma o status junto ao Mercado Pago
  → pedido marcado como PAGO → tela de confirmação + e-mail de confirmação automático
  → botão "Enviar pedido no WhatsApp" (mensagem pronta com itens, endereço e "pagamento confirmado")
  → cliente acompanha o andamento na própria página do pedido (/pedido/:id)

ADMINISTRADOR
  login → painel Kanban → vê o pedido PAGO → Em preparo → Saiu para entrega (e-mail automático) → Concluído
```

Regras centrais:

- **Preços e totais são sempre recalculados no backend** a partir do banco. O frontend nunca é
  confiado (nem preço, nem total, nem taxa, nem o `transaction_amount` enviado pelo Brick).
- **Um pagamento só é considerado aprovado depois que o backend confirma com o Mercado Pago**
  (na criação, na consulta da tela do pedido ou pelo webhook). A resposta visual do frontend não
  muda o status.
- **O pedido só avança para preparo depois de pago** (validado no backend).
- **Nenhum dado sensível de cartão** passa pelo servidor: o Brick tokeniza o cartão diretamente com
  o Mercado Pago e o backend recebe apenas o `token`.
- **Idempotência**: cada tentativa de pagamento tem uma chave única gerada no navegador; cliques
  repetidos não geram cobrança duplicada (a chave é enviada ao Mercado Pago como
  `X-Idempotency-Key` e é única no banco).

Status de pagamento: `PENDING · APPROVED · REJECTED · CANCELLED · REFUNDED`

Status do pedido: `AGUARDANDO_PAGAMENTO → PAGO → AGUARDANDO_PREPARO → EM_PREPARO → SAIU_PARA_ENTREGA → CONCLUIDO` (e `CANCELADO`)

## 2. Tecnologias

**Frontend** — React 18, TypeScript, Vite, Tailwind CSS, React Router, Zustand (carrinho),
React Hook Form + Zod, Lucide Icons, Axios, `@mercadopago/sdk-react` (Payment Brick).

**Backend** — Node.js, TypeScript, Express, Prisma, JWT (`jsonwebtoken`), `bcryptjs`, Zod,
`mercadopago` (SDK oficial), Vitest.

**Banco de dados** — PostgreSQL (com `docker-compose.yml` pronto para desenvolvimento).

## 3. Estrutura do projeto

```text
soparia-da-le/
├── docker-compose.yml           # PostgreSQL local (dev + banco de testes)
├── docker/init-test-db.sql
├── .env.example                 # referência de TODAS as variáveis
├── README.md
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # User, Category, Product, ProductVariant,
│   │   │                        # Order, OrderItem, Payment (+ enums)
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/env.ts        # variáveis de ambiente (MP_ACCESS_TOKEN só aqui)
│   │   ├── config/constants.ts  # taxa de entrega fixa (FIXED_DELIVERY_FEE)
│   │   ├── lib/mercadopago.ts   # único ponto de contato com o Mercado Pago
│   │   ├── lib/prisma.ts
│   │   ├── controllers/         # auth, product, category, order, payment
│   │   ├── services/            # regras de negócio (order.service, payment.service, ...)
│   │   ├── routes/              # public.routes, admin.routes, auth.routes
│   │   ├── middlewares/         # auth (JWT), validate (Zod), error handler
│   │   ├── validations/         # schemas Zod
│   │   └── utils/               # orderStatus (transições), whatsappMessage, jwt, senha...
│   ├── tests/                   # Vitest (roda contra o banco de testes)
│   ├── .env.example
│   └── .env                     # (não versionado)
│
└── frontend/
    ├── src/
    │   ├── pages/               # Home, Checkout, OrderStatus (/pedido/:id), admin/*
    │   ├── components/          # ui/, product/, cart/, checkout/ (PaymentStep = Brick), admin/
    │   ├── store/cartStore.ts   # Zustand
    │   ├── services/            # api, catalog, orders, payments, admin, auth
    │   ├── validations/         # Zod do checkout
    │   ├── utils/               # moeda, telefone, CEP (ViaCEP), whatsapp
    │   └── types/
    ├── .env.example
    └── .env                     # (não versionado)
```

## 4. Instalação

Pré-requisitos: **Node.js 18+**, **npm** e **Docker** (ou um PostgreSQL já instalado).

```bash
# Backend
cd backend
npm install

# Frontend (em outro terminal)
cd frontend
npm install
```

## 5. Variáveis de ambiente

Copie os exemplos e preencha:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| Variável (backend) | Descrição |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL (ex.: `postgresql://soparia:soparia@localhost:5432/soparia_da_le?schema=public`) |
| `TEST_DATABASE_URL` | Banco usado só pelos testes (opcional; padrão: `DATABASE_URL` + `_test`) |
| `PORT` | Porta da API (padrão `3333`) |
| `CORS_ORIGIN` | URL(s) do frontend permitidas, separadas por vírgula |
| `APP_URL` | URL pública do site |
| `JWT_SECRET` | Segredo do JWT — gere um valor forte (`openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | Validade do token (padrão `8h`) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Administrador criado pelo seed |
| `WHATSAPP_NUMBER` | Número da loja no formato internacional (`5592992781331`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` | Credenciais SMTP para o e-mail transacional — ver seção 18 |
| `EMAIL_FROM` | Remetente exibido nos e-mails (padrão `Soparia da Lê <pedidos@sopariadale.com>`) |
| `MP_ACCESS_TOKEN` | **Access Token** do Mercado Pago — **somente no backend** |
| `MP_PUBLIC_KEY` | Public Key do Mercado Pago (entregue ao navegador via `GET /api/payments/config`) |
| `MP_WEBHOOK_SECRET` | Assinatura secreta do webhook (valida o header `x-signature`) |
| `MP_WEBHOOK_URL` | URL pública HTTPS do webhook (enviada como `notification_url` em cada pagamento) |
| `MP_PIX_EXPIRATION_MINUTES` | Validade do QR Code Pix (padrão `30`) |
| `MP_STATEMENT_DESCRIPTOR` | Texto na fatura do cartão (padrão `SOPARIA DA LE`) |

| Variável (frontend) | Descrição |
|---|---|
| `VITE_API_URL` | URL da API (`http://localhost:3333/api`) |
| `VITE_WHATSAPP_NUMBER` | Número da loja usado nos links de contato |

> O frontend **não** possui nenhuma credencial do Mercado Pago. A Public Key é lida do backend.
> `.env` está no `.gitignore`; só os `.env.example` são versionados.

## 6. Banco de dados (PostgreSQL)

Na raiz do projeto:

```bash
docker compose up -d        # sobe o PostgreSQL 16 em localhost:5432
docker compose ps           # aguarde o status "healthy"
```

O container cria dois bancos: `soparia_da_le` (desenvolvimento) e `soparia_da_le_test` (testes),
com usuário/senha `soparia` / `soparia` — exatamente o que está nos `.env.example`.

Se preferir um PostgreSQL próprio, basta criar os dois bancos e ajustar `DATABASE_URL` /
`TEST_DATABASE_URL`.

## 7. Migrations

```bash
cd backend
npx prisma migrate dev          # aplica as migrations em backend/prisma/migrations e gera o client
# em produção:
npx prisma migrate deploy
```

Para abrir o Prisma Studio: `npx prisma studio`.

## 8. Seed e usuário administrador

```bash
cd backend
npm run seed        # ou: npx prisma db seed
```

O seed é idempotente e cria:

- Categorias: **Sopas**, **Outros**, **Refrigerantes**
- Produtos: Sopa de Carne, Canja, Sopa de Mocotó (R$ 20,00), Lasanha (R$ 15,00),
  Salada de Frutas 300ml (R$ 10,00) e Refrigerante Lata 350ml (R$ 6,00) com 4 sabores
- O **usuário administrador** definido em `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`

**Como criar/alterar o administrador:** defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `backend/.env` e
rode o seed de novo. A senha é salva com hash bcrypt. Nenhuma credencial fica no código: se as
variáveis não existirem, o administrador não é criado (e em produção o seed recusa senhas curtas).

## 9. Executando o backend

```bash
cd backend
npm run dev         # http://localhost:3333  (health check: GET /health)
```

Build de produção: `npm run build` e `npm start`.

## 10. Executando o frontend

```bash
cd frontend
npm run dev         # http://localhost:5173
```

Build de produção: `npm run build` (gera `frontend/dist`).

Páginas do cliente: `/` (cardápio), `/checkout` (carrinho → entrega) e `/pedido/:id?token=...`
(pagamento, acompanhamento do Pix, confirmação, WhatsApp e — depois de pago — o andamento do pedido:
*Pedido confirmado → Em preparo → Saiu para entrega → Entregue*, atualizado automaticamente). Painel:
`/admin`.

## 11. Configuração do Mercado Pago

1. Acesse <https://www.mercadopago.com.br/developers/panel/app> e crie uma aplicação
   (produto: **Checkout Bricks / Pagamentos online**).
2. Em **Credenciais de teste** copie o *Access Token* e a *Public Key* e coloque no `backend/.env`:
   ```
   MP_ACCESS_TOKEN="TEST-xxxxxxxx..."
   MP_PUBLIC_KEY="TEST-xxxxxxxx..."
   ```
3. Reinicie o backend. A tela de pagamento passa a exibir o **Payment Brick** com **Pix, cartão de
   crédito e cartão de débito** (o débito aparece conforme a disponibilidade na sua conta).
4. Para produção, troque pelas **Credenciais de produção** e configure o webhook (abaixo).

Como funciona por dentro:

- `POST /api/orders` cria o pedido e devolve um `accessToken` (token secreto do pedido).
- O Payment Brick coleta os dados no navegador e, no `onSubmit`, o frontend envia ao backend apenas
  `{ orderId, orderToken, idempotencyKey, selectedPaymentMethod, formData }` — para cartão,
  `formData.token` é o token gerado pelo Mercado Pago (nunca o número do cartão).
- O backend monta a cobrança com `transaction_amount = total do pedido` (calculado no servidor),
  chama `POST /v1/payments` com a chave de idempotência e grava o resultado real.
- **Pix**: a resposta traz o QR Code (`qr_code_base64`) e o *copia e cola* (`qr_code`), exibidos em
  `/pedido/:id`. A tela consulta o backend a cada 4 s; o backend reconsulta o Mercado Pago enquanto o
  pagamento estiver pendente (com limite de uma consulta a cada 3 s) — assim o Pix funciona mesmo em
  desenvolvimento local sem webhook.
- **Cartão**: aprovado → pedido `PAGO`; recusado → mensagem em português e nova tentativa (nova
  chave de idempotência); pendente/em análise → tela de espera com atualização automática.

## 12. Webhook

Endpoint: `POST /api/payments/webhook`

1. No painel do Mercado Pago, em **Webhooks**, cadastre a URL pública **HTTPS** do backend, ex.:
   `https://seu-dominio.com/api/payments/webhook`, evento **Pagamentos**.
2. Copie a **assinatura secreta** gerada e configure:
   ```
   MP_WEBHOOK_SECRET="..."
   MP_WEBHOOK_URL="https://seu-dominio.com/api/payments/webhook"
   ```
3. O backend, ao receber a notificação:
   1. valida a assinatura `x-signature` (HMAC) quando `MP_WEBHOOK_SECRET` está definido;
   2. identifica o pagamento (`data.id`);
   3. **consulta o Mercado Pago** (`GET /v1/payments/:id`) — o payload da notificação nunca é usado
      como fonte de verdade;
   4. atualiza o pagamento no banco;
   5. atualiza o pedido (`PAGO`, `REJECTED`, `REFUNDED` → cancelado, etc.).

Para testar o webhook localmente, exponha o backend com um túnel HTTPS (ex.: `ngrok http 3333`) e
use a URL gerada. Sem webhook, a tela do pedido continua funcionando pelo mecanismo de consulta
descrito na seção anterior.

## 13. Ambiente de testes / sandbox

- Use as **credenciais de teste** (`TEST-...`) no `.env`.
- Crie **usuários de teste** (comprador e vendedor) em *Suas integrações > Contas de teste*; use o
  Access Token do vendedor de teste e pague com o comprador de teste.
- Cartões de teste (documentação oficial): ex. Mastercard `5031 4332 1540 6351`, CVV `123`, validade
  `11/30`. O **nome do titular** define o resultado: `APRO` (aprovado), `OTHE` (recusado),
  `CONT` (pendente), `FUND` (saldo insuficiente), `SECU` (CVV inválido), etc.
- Pix em sandbox: o QR é gerado normalmente; a aprovação pode ser simulada pela conta do comprador
  de teste ou pelo painel do Mercado Pago.

## 14. Testes automatizados

```bash
cd backend
npm test
```

Os testes rodam contra o banco `TEST_DATABASE_URL` (o schema é aplicado automaticamente com
`prisma db push`) e simulam o Mercado Pago (`vi.mock` de `src/lib/mercadopago`). Cobrem:

- cálculo do subtotal, da taxa de entrega fixa e do total (preço vem do banco, nunca do
  frontend);
- produto/variação esgotados não geram pedido;
- validação do pedido (Zod) e do endereço completo;
- token de acesso do pedido (cliente só vê o próprio pedido);
- criação de pagamento Pix e cartão (aprovado, recusado, pendente), idempotência, reaproveitamento
  de Pix pendente, pedido já pago, erro do provedor sem registro fantasma;
- atualização do pagamento por consulta e por webhook (payload mentiroso é ignorado, assinatura
  inválida rejeitada, reconstrução de pagamento ausente, estorno);
- transições de status do pedido (não prepara sem pagamento, admin não marca PAGO manualmente,
  fluxo completo até CONCLUIDO, cancelamento);
- autenticação administrativa; disponibilidade e preço refletindo no cardápio público;
- mensagem do WhatsApp;
- e-mail transacional: conteúdo (assunto, itens, link de acompanhamento) e o envio via SMTP
  (`vi.mock` de `nodemailer`); dispara o e-mail de confirmação só na primeira aprovação do
  pagamento (não repete em reconsultas) e o de "saiu para entrega" só nessa transição de status.

## 15. Rotas da API

```
GET    /health

POST   /api/auth/login

GET    /api/products
GET    /api/categories

POST   /api/orders                         cria o pedido (AGUARDANDO_PAGAMENTO) + accessToken
GET    /api/orders/:id?token=...           acompanhamento pelo cliente (sincroniza pagamento pendente)

GET    /api/payments/config                public key do Mercado Pago (sem segredos)
POST   /api/payments                       cria o pagamento (Pix ou cartão) — idempotente
GET    /api/payments/:id?token=...         status do pagamento (reconsulta o MP se pendente)
POST   /api/payments/webhook               notificações do Mercado Pago

-- Admin (Authorization: Bearer <token>) --
GET    /api/admin/dashboard
GET    /api/admin/orders
GET    /api/admin/orders/:id
PATCH  /api/admin/orders/:id/status        { status }
GET    /api/admin/products
POST   /api/admin/products
PUT    /api/admin/products/:id
DELETE /api/admin/products/:id
PATCH  /api/admin/products/:id/availability
GET    /api/admin/categories
POST   /api/admin/categories
PUT    /api/admin/categories/:id
DELETE /api/admin/categories/:id
```

## 16. Segurança

- Senhas com **bcrypt**; sessão do admin com **JWT**; todas as rotas `/api/admin/*` protegidas.
- Validação de entrada com **Zod** em todas as rotas de escrita.
- Backend **recalcula** subtotal, taxa e total; rejeita produtos esgotados e regiões inativas.
- O valor cobrado no Mercado Pago é sempre o total do pedido salvo no banco.
- Pedidos são acessados pelo cliente apenas com o `accessToken` secreto (UUID) — não dá para
  enumerar pedidos de outras pessoas.
- **Nenhum dado de cartão** (número, validade, CVV) chega ao servidor ou ao banco.
- `MP_ACCESS_TOKEN` existe apenas no backend; o navegador só recebe a Public Key.
- Webhook com verificação de assinatura e reconsulta ao provedor.
- Segredos só em variáveis de ambiente (`.env` fora do git).
- O e-mail transacional nunca derruba o fluxo do pedido: qualquer falha (SMTP ausente, provedor fora
  do ar) só é registrada em log — o pedido segue confirmado/atualizado normalmente.

## 17. Painel administrativo

Acesse `/admin/login` com as credenciais do seed.

- **Pedidos** — Kanban com as colunas *Aguardando pagamento*, *Pagos / Aguardando preparo*,
  *Em preparo*, *Saiu para entrega*, *Concluídos* e *Cancelados*. Cada card mostra número, horário,
  cliente, telefone, e-mail, itens com quantidades e observações, subtotal, entrega, total, forma e
  status do pagamento e endereço completo. O painel atualiza sozinho a cada 15 s. Pedidos pagos
  entram automaticamente na coluna de preparo (o admin não marca "pago" à mão) — é aí que o e-mail de
  confirmação já foi enviado ao cliente. Quando o admin move um pedido para *Saiu para entrega*, o
  cliente recebe automaticamente o segundo e-mail.
- **Cardápio** — criar/editar/excluir produtos, alterar nome, descrição, preço, imagem e categoria;
  produtos com sabores (refrigerantes) têm variações com preço e disponibilidade próprios.
- **Disponibilidade** — alterna cada produto entre *Disponível* e *Esgotado*; o cliente vê o selo
  **ESGOTADO** e não consegue adicionar ao carrinho.
- **Dashboard** — pedidos do dia por etapa e faturamento (apenas pagamentos confirmados).

A taxa de entrega é fixa (R$ 2,00, ver `backend/src/config/constants.ts`) para toda a cidade — o
cliente digita o bairro livremente no checkout, sem lista de regiões cadastradas.

## 18. E-mail transacional

O cliente informa o e-mail no checkout (junto com nome e telefone) e recebe automaticamente:

1. **Pedido confirmado** — assim que o pagamento é aprovado (mesmo instante em que o WhatsApp da
   loja recebe a notificação e o pedido some da coluna "Aguardando pagamento" no painel).
2. **Saiu para entrega** — quando o admin move o pedido para essa coluna no Kanban.

Os dois e-mails trazem um link para `/pedido/:id?token=...`, onde o cliente também acompanha o
andamento em tempo real (a página atualiza sozinha a cada 4s enquanto o pedido não é concluído).

Funciona com **qualquer provedor SMTP** (via [Nodemailer](https://nodemailer.com)) — não há
aprovação nem custo por envio como na API do WhatsApp Business. Enquanto `SMTP_HOST` / `SMTP_USER` /
`SMTP_PASSWORD` não estiverem preenchidos, o envio fica **desligado** (só um aviso no log) e nada
mais é afetado.

### Configuração rápida

Qualquer provedor SMTP funciona. Algumas opções gratuitas para começar:

- **Gmail** (rápido para testar): ative a verificação em duas etapas na conta e gere uma
  ["senha de app"](https://myaccount.google.com/apppasswords). Use:
  ```
  SMTP_HOST="smtp.gmail.com"
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER="seuemail@gmail.com"
  SMTP_PASSWORD="a senha de app gerada (16 caracteres)"
  ```
- **Brevo, Resend, Amazon SES, etc.** — qualquer provedor transacional tem uma tela de "credenciais
  SMTP"; copie host/porta/usuário/senha de lá. Recomendado para produção (Gmail tem limite baixo de
  envios por dia e pode marcar como spam).
- **Ethereal** (só para testar sem mandar e-mail de verdade): gere uma conta temporária rodando
  `npx tsx -e "import('nodemailer').then(m=>m.default.createTestAccount().then(console.log))"` dentro
  de `backend/` — ele devolve host/usuário/senha e cada e-mail "enviado" vira um link de preview.

Depois de preencher o `.env`, reinicie o backend. No próximo pagamento aprovado (ou pedido movido
para "Saiu para entrega"), o e-mail chega sozinho.
