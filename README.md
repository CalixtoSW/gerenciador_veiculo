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

### Frontend

```bash
cd frontend
npm install
npm run build
cd ..
.venv/bin/python backend/manage.py runserver 0.0.0.0:8000
```

O React é servido pelo Django em `/app/` (SPA com catch-all).

## Documentação

Índice: `docs/README.md`
