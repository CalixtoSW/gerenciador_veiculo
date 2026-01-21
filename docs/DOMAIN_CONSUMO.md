# Domínio: abastecimento e métricas de consumo

## Modelo mental

Para métricas de consumo consistentes, o sistema considera o padrão “**tanque cheio**”:

- Você marca um abastecimento como `is_full_tank=true` quando realmente completa o tanque.
- A métrica de consumo é calculada entre **dois eventos consecutivos de tanque cheio**.

## Cálculo principal (km/L)

Entre dois eventos `A` e `B` (ambos tanque cheio):

- `distância_km = odometro(B) - odometro(A)`
- `litros_consumidos = soma(litros) de todos abastecimentos após A até B (inclui B; ignora A)`
- `km_por_litro = distância_km / litros_consumidos`

Isso lida bem com “completar tanque” mesmo quando há abastecimentos intermediários.

## Derivações úteis

- `L/100km = 100 / (km/L)`
- `custo_por_km = custo_total / km_total`
- `custo_por_litro = custo_total / litros_total`

## Boas práticas de uso

- Sempre registrar o hodômetro (`odometer_km`) corretamente.
- Marcar corretamente `is_full_tank` (métricas dependem disso).
- Para veículos Flex: registrar o `fuel_type` em cada abastecimento.

