# Gerenciador de Veículo

Monólito Django (API JSON em `/api`) servindo um SPA React (Vite) no mesmo domínio/servidor HTTP.

## Stack

- Backend: Django + Django REST Framework (auth por sessão/cookie + CSRF)
- Frontend: React + Vite (build servido pelo Django)
- Banco: SQLite (MVP)

## Estrutura

- `backend/`: projeto Django e apps
- `frontend/`: SPA React (Vite)
- `docs/`: documentação e especificação do projeto

## Desenvolvimento (local)

### Backend

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/python backend/manage.py migrate
.venv/bin/python backend/manage.py runserver 0.0.0.0:8000
```

Por padrão `DEBUG=1` localmente. Se quiser simular produção, defina `DEBUG=0` e `SECRET_KEY` no ambiente.

### Frontend

```bash
cd frontend
npm install
npm run build
cd ..
.venv/bin/python backend/manage.py runserver 0.0.0.0:8000
```

O React é servido pelo Django em `/app/` (SPA com catch-all).

## Deploy (Vercel)

- Defina a variável de ambiente `SECRET_KEY` no projeto (Production/Preview).
- Para dados persistentes, configure `DATABASE_URL` (Postgres). Sem isso, a Vercel usa SQLite em `/tmp` (volátil, perde dados entre execuções).
- O build roda `collectstatic` via `build_files.sh` e publica os estáticos em `backend/staticfiles`.

## Documentação

Índice: `docs/README.md`
