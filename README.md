# Consultoria de Campo

Sistema de auditoria e checklist para consultoria de campo.

## Tecnologias

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Express + Node.js
- **Banco de dados:** PostgreSQL
- **Containerização:** Docker + Docker Compose

## Funcionalidades

- ✅ Criar auditorias/checklists
- ✅ Listar histórico de auditorias
- ✅ Editar registros existentes
- ✅ Excluir registros
- ✅ Gerar PDFs

## Executar Localmente

**Pré-requisitos:** Node.js 20+ e Docker

1. Clone o repositório:
   ```bash
   git clone https://github.com/Esegnorelli/consultoria-de-campo.git
   cd consultoria-de-campo
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o PostgreSQL com Docker:
   ```bash
   docker compose up -d postgres
   ```

4. Execute a aplicação:
   ```bash
   npm run dev
   ```

5. Acesse: http://localhost:3000

## Docker

Para executar tudo com Docker:

```bash
docker compose up -d
```

## Variáveis de Ambiente

Crie um arquivo `.env` com:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/consultoria_campo
# ou
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=postgres
PG_DATABASE=consultoria_campo
```

## Licença

MIT
