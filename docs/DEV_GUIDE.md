# Guia de desenvolvimento

## Requisitos

- Python 3.12+
- Node.js 20+

## Setup rápido

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/python backend/manage.py migrate
.venv/bin/python backend/manage.py runserver 0.0.0.0:8000
```

Acesse:

- UI React: `http://localhost:8000/app/`
- Admin Django: `http://localhost:8000/admin/`
- Health: `http://localhost:8000/health/`

## Build do frontend (React via Django)

```bash
cd frontend
npm install
npm run build
```

O build copia artefatos para:

- `backend/templates/react.generated.html`
- `backend/static/assets/`

## Usuários / admin

Criar superuser:

```bash
.venv/bin/python backend/manage.py createsuperuser
```

## Convenções importantes

- Endpoints `/api/*` nunca retornam HTML.
- A UI consome somente `/api/*`.
- Isolamento por usuário: tudo tem `owner` e filtra por `request.user`.

