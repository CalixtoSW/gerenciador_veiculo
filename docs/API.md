# API (contratos principais)

Base: `/api/`  
Auth: sessão/cookie + CSRF. Em requests `POST/PATCH/DELETE`, enviar header `X-CSRFToken` com o cookie `csrftoken`.

## Auth

- `GET /api/auth/csrf/`  
  Gera/garante cookie `csrftoken`. Retorna `204`.

- `POST /api/auth/register/`  
  Body: `{ "username": "string", "password": "string" }`  
  Retorna `201` com `{ id, username }` e autentica a sessão.

- `POST /api/auth/login/`  
  Body: `{ "username": "string", "password": "string" }`  
  Retorna `200` com `{ id, username }`.

- `POST /api/auth/logout/`  
  Retorna `204`.

- `GET /api/auth/me/`  
  Retorna `200` com `{ id, username }`.

## Veículos

- `GET /api/vehicles/` (paginado)  
  Retorna lista dos veículos do usuário logado.

- `POST /api/vehicles/`  
  Campos: `nickname?`, `brand`, `model`, `plate?`, `fuel_type` (`gasolina|etanol|diesel|gnv|eletrico|hibrido|flex`)

- `GET /api/vehicles/{id}/`
- `PATCH /api/vehicles/{id}/`
- `DELETE /api/vehicles/{id}/`

## Abastecimentos

- `GET /api/fuelings/?vehicle={vehicleId}&start={iso}&end={iso}` (paginado)  
  `start/end` são opcionais e filtram por `occurred_at` (ISO string).

- `POST /api/fuelings/`  
  Body (exemplo):
  ```json
  {
    "vehicle": 1,
    "occurred_at": "2026-01-21T10:30:00.000Z",
    "odometer_km": 12345,
    "fuel_type": "gasolina",
    "liters": "35.500",
    "total_cost": "199.90",
    "is_full_tank": true,
    "station_name": "",
    "notes": ""
  }
  ```

- `GET /api/fuelings/{id}/`
- `PATCH /api/fuelings/{id}/` (edição)
- `DELETE /api/fuelings/{id}/`

## Métricas

- `GET /api/vehicles/{vehicleId}/metrics/?start={iso}&end={iso}`
  - `km_per_liter_avg`
  - `liters_per_100km_avg`
  - `avg_cost_per_liter`
  - `avg_cost_per_km`
  - totais (`total_km`, `total_liters`, `total_cost`)

