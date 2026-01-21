# Arquitetura (Django + React no mesmo domínio)

Este projeto é um monólito de **um único serviço HTTP**:

- **Django** entrega:
  - API JSON em `/api/` (sempre `application/json`)
  - Admin em `/admin/`
  - Healthcheck em `/health/`
  - Shell do React (SPA) em `/app/` (HTML)
- **React (Vite)** é buildado e servido como arquivos estáticos do Django (`/static/`).

## Isolamento por usuário (o “sistema individual”)

O isolamento é **por ownership**:

- Cada entidade de domínio possui `owner = ForeignKey(User)`.
- Toda leitura e escrita filtra pelo `request.user` no backend.
- A UI assume que o backend é a fonte de verdade (sem “permissões no window.*”).

## Camadas (backend)

Padrão adotado por app:

- `api.py`: endpoints JSON (contrato e serialização)
- `views.py`: endpoints HTML/ReactShell e health (somente HTTP in/out)
- `services.py`: regras de negócio/casos de uso (criar veículo, criar abastecimento, métricas)
- `selectors.py`: queries de leitura (ORM) encapsuladas
- `models.py`: modelos e constraints

## Integração do React

- O build gera:
  - `backend/templates/react.generated.html` (HTML final do SPA)
  - `backend/static/assets/` (JS/CSS do Vite)
- O Django serve `/app/` usando:
  - `react.generated.html` se existir
  - fallback para `backend/templates/react.html` (placeholder)

## Autenticação

- `SessionAuthentication` (cookie/sessão) + CSRF.
- Fluxo recomendado no frontend:
  - `GET /api/auth/csrf/` para garantir cookie CSRF
  - `POST /api/auth/login/` ou `POST /api/auth/register/`
  - `GET /api/auth/me/` para estado do usuário

