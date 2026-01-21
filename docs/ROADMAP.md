# Roadmap

## Próximo app: Manutenção do veículo (início amanhã)

Objetivo: controlar manutenção preventiva/corretiva, peças e custos ao longo do tempo.

Escopo inicial sugerido:

- Cadastro de **itens de manutenção** por veículo (ex: óleo, filtro, pneus, pastilhas).
- Planos por:
  - **km** (ex: trocar óleo a cada 10.000 km)
  - **tempo** (ex: a cada 6 meses)
  - **ambos** (vence pelo primeiro que ocorrer)
- Lançamento de **execuções** de manutenção:
  - data/hora, odômetro, itens executados, custo total, fornecedor/oficina, notas
  - anexos (opcional futuro)
- Alertas/pendências:
  - “vencido”, “a vencer”, “em dia”
  - cálculo baseado no último evento + regras do plano

Integrações futuras:

- Relacionar com abastecimentos (ex: odômetro recente para estimar vencimento).
- Dashboard com custo total por período e por veículo.

