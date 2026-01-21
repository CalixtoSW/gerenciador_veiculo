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
python -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run build
cd ..
python backend/manage.py runserver
```

O React é servido pelo Django em `/app/` (SPA com catch-all).

