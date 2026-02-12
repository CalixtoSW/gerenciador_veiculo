from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP


def quantize_decimal(value: Decimal | int | float | str | None, places: int = 3) -> Decimal | None:
    if value is None:
        return None
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    pattern = Decimal("1." + ("0" * places))
    return value.quantize(pattern, rounding=ROUND_HALF_UP)


def format_decimal(value: Decimal | int | float | str | None, places: int = 3) -> str | None:
    quantized = quantize_decimal(value, places=places)
    return str(quantized) if quantized is not None else None
