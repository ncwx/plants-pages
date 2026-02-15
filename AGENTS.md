# Plants & Pages — Agent Instructions (Codex)

## Stack (must follow)
- Frontend: Next.js (TypeScript)
- Backend: FastAPI (Python)
- DB/Auth: Supabase (Postgres + Auth)
- ORM/migrations: SQLAlchemy + Alembic
- Deployment: Render (API) + Vercel (Web)

## Repo layout
- apps/web
- apps/api

## Rules
- Small commits only
- Always run tests before finishing tasks
- No unnecessary dependencies
- Enforce auth on all user data
- Use pagination for lists
- Clean, simple UI (mobile responsive)

## Commands expected
- make setup
- make dev
- make test-api
- make lint
- make fmt
