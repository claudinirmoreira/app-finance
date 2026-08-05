# app-finance

Aplicativo de **finanças pessoais** (controle de receitas e despesas). Este projeto foi refatorado a partir de uma SPA em JavaScript puro (com persistência em `localStorage`) para uma arquitetura full-stack moderna, aplicando boas práticas de programação.

## Stack

- **Backend**: Node.js + Express + Prisma (TypeScript)
- **Frontend**: React + Vite + TypeScript
- **Banco de dados**: PostgreSQL
- **Infraestrutura**: Docker Compose (banco, API e web)
- **Seed**: dados variados para testes

## Estrutura

```
app-finance/
├── backend/                  # API REST (Express + Prisma + PostgreSQL)
│   ├── prisma/
│   │   ├── schema.prisma      # modelos do banco
│   │   ├── migrations/        # migração inicial
│   │   └── seed.ts            # dados para testes
│   ├── src/
│   │   ├── controllers/       # regras de negócio
│   │   ├── middleware/        # validação e tratamento de erros
│   │   ├── routes/            # rotas da API
│   │   ├── utils/             # utilitários (erros, serialização, async)
│   │   ├── config/            # configuração de ambiente
│   │   ├── app.ts / server.ts
│   └── Dockerfile
├── frontend/                  # SPA React (Vite + TypeScript)
│   ├── src/
│   │   ├── api/               # cliente HTTP e chamadas por recurso
│   │   ├── components/        # Layout, Modal, Toast
│   │   ├── pages/             # Dashboard, Transações, Contas, Categorias, Orçamentos, Relatórios
│   │   ├── hooks/             # hooks reutilizáveis (async, toast)
│   │   ├── utils/             # formatação (moeda, datas)
│   │   ├── types/             # tipos compartilhados
│   │   └── styles/            # CSS (aproveitado do projeto original)
│   └── Dockerfile
└── docker-compose.yml
```

## Funcionalidades

- **Dashboard**: resumo do mês (saldo total, receitas, despesas, economia), gráfico receitas vs despesas, despesas por categoria e orçamento.
- **Transações**: listagem com filtros (busca, tipo, categoria), CRUD em modal, navegação por mês.
- **Contas**: CRUD com saldo inicial e saldo atual calculado pelas transações.
- **Categorias**: CRUD separado por tipo (receita/despesa), com proteção contra exclusão em uso.
- **Orçamentos**: limite mensal por categoria com indicador de utilização e variação de cor.
- **Relatórios**: resumo, fluxo diário, evolução anual, receitas/despesas por categoria e saldo por conta.

## Modelo de dados

| Modelo       | Campos principais                                                        |
|--------------|-------------------------------------------------------------------------|
| `Account`    | name, type (checking/savings/wallet/credit/investment), initialBalance, color, icon |
| `Category`   | name, type (income/expense), color, icon                                 |
| `Transaction`| description, amount, type, date, notes, accountId, categoryId            |
| `Budget`     | categoryId, amount, month, year — única por categoria/mês/ano            |

Valores monetários usam `Decimal` do Prisma para evitar erros de arredondamento.

---

## Como executar

### Opção 1 — Docker Compose (recomendada)

Pré-requisito: Docker instalado e em execução.

```bash
docker compose up --build -d
```

| Serviço   | Endereço                  |
|-----------|---------------------------|
| Frontend  | http://localhost:8080     |
| Backend   | http://localhost:3333     |
| Health    | http://localhost:3333/health |
| PostgreSQL | `localhost:5433` (user/senha `postgres`, banco `app_finance`) |

Na primeira subida, o backend executa automaticamente a migração (`prisma migrate deploy`) e o seed (`prisma db seed`). O seed é **idempotente**: só insere dados se o banco estiver vazio, então reiniciar não sobrescreve registros existentes.

> Observação: a porta do Postgres é `5433` no host para não conflitar com um PostgreSQL local já em uso na porta 5432.

### Opção 2 — Desenvolvimento local

Requisito: Node.js ≥ 20 e PostgreSQL acessível (ou suba só o banco com `docker compose up -d db`).

**Banco de dados**
```bash
docker compose up -d db
```

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # ajuste DATABASE_URL se necessário
npx prisma migrate deploy
npx prisma db seed      # opcional: insere dados de exemplo
npm run dev             # API em http://localhost:3333
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env   # opcional (padrões OK)
npm run dev             # app em http://localhost:5173 (proxy /api -> :3333)
```

---

## Scripts

### Backend (`cd backend`)

| Script             | Descrição                                  |
|---------------------|-------------------------------------------|
| `npm run dev`       | API em desenvolvimento (hot reload)        |
| `npm run build`     | Gera cliente Prisma e compila TS          |
| `npm start`         | Roda o build de produção                   |
| `npm run typecheck` | Verifica tipos                             |
| `npm run prisma:migrate` | Cria nova migração                    |
| `npm run prisma:deploy`  | Aplica migrações                    |
| `npm run prisma:seed`    | Popula o banco com dados            |

### Frontend (`cd frontend`)

`npm run dev` • `npm run build` • `npm run preview` • `npm run typecheck`

---

## API

Base: `http://localhost:3333/api`

### Contas (`/accounts`)
| Método | Rota              | Descrição                          |
|--------|-------------------|------------------------------------|
| GET    | `/`               | Lista contas (com saldo)           |
| POST   | `/`               | Cria conta                         |
| GET    | `/:id`            | Detalha conta                      |
| PUT    | `/:id`            | Atualiza conta                     |
| DELETE | `/:id`            | Exclui conta                       |
| GET    | `/summary`        | Resumo de saldos e totais          |

### Categorias (`/categories`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Lista (filtro `?type=`) |
| POST | `/` | Cria categoria |
| GET | `/:id` | Detalhe |
| PUT | `/:id` | Atualiza |
| DELETE | `/:id` | Exclui (bloqueia se houver transações) |

### Transações (`/transactions`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Lista com filtros |
| POST | `/` | Cria transação |
| GET | `/:id` | Detalhe |
| PUT | `/:id` | Atualiza |
| DELETE | `/:id` | Exclui |

Filtros de listagem: `year`, `month`, `search`, `type`, `categoryId`, `startDate`, `endDate`.

### Orçamentos (`/budgets`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Lista (filtro `?year=&month=`) |
| POST | `/` | Cria orçamento |
| GET | `/:id` | Detalhe |
| PUT | `/:id` | Atualiza |
| DELETE | `/:id` | Exclui |

### Relatórios (`/reports`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/summary` | Resumo do mês (`?year=&month=`) |
| GET | `/category-totals` | Totais por categoria (filtro `?type=`) |
| GET | `/daily` | Fluxo diário |
| GET | `/monthly` | Totais anuais (`?year=`) |
| GET | `/account-balances` | Saldo por conta |
| GET | `/budget-ratios` | Utilização de orçamentos |

---

## Validações e boas práticas

- **Validação de entrada** em todas as rotas via `express-validator`, retornando `400` com detalhes.
- **Regras de negócio**: tipo da categoria deve corresponder ao da transação; categoria em uso não pode ser excluída; orçamento único por categoria/mês/ano.
- **Tratamento de erros** centralizado com `ApiError` e middleware global.
- **Enums** no banco para `AccountType` e `TransactionType`.
- **Serialização** de `Decimal` → `number` nas respostas.
- **Cliente Prisma singleton** no desenvolvimento (evita múltiplas conexões em hot reload).
- **Dockerfile em múltiplos estágios** e imagem base Debian (compatível com o engine do Prisma).