from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import AbstractBaseUser
from django.db import transaction
from django.utils import timezone

from .models import FuelType, Fueling, Station, Vehicle
from .selectors import vehicle_for_user


@dataclass(frozen=True)
class ConsumptionMetrics:
    km_per_liter_avg: Decimal | None
    total_km: int
    total_liters: Decimal
    total_cost: Decimal
    intervals_count: int


def auth_register(*, request, username: str, password: str):
    from django.contrib.auth.models import User

    with transaction.atomic():
        user = User.objects.create_user(username=username, password=password)
    login(request, user)
    return user


def auth_login(*, request, username: str, password: str):
    user = authenticate(request, username=username, password=password)
    if user is None:
        return None
    login(request, user)
    return user


def auth_logout(*, request) -> None:
    logout(request)


def create_vehicle(
    *,
    user: AbstractBaseUser,
    nickname: str = "",
    brand: str,
    model: str,
    manufacture_year: int | None = None,
    model_year: int | None = None,
    plate: str = "",
    fuel_type: str = FuelType.GASOLINA,
) -> Vehicle:
    return Vehicle.objects.create(
        owner=user,
        nickname=nickname,
        brand=brand,
        model=model,
        manufacture_year=manufacture_year,
        model_year=model_year,
        plate=plate,
        fuel_type=fuel_type,
    )


def create_fueling(
    *,
    user: AbstractBaseUser,
    vehicle_id: int,
    occurred_at: datetime | None,
    odometer_km: int,
    fuel_type: str,
    liters: Decimal,
    total_cost: Decimal,
    is_full_tank: bool = True,
    station_id: int | None = None,
    station_name: str = "",
    notes: str = "",
) -> Fueling:
    vehicle = vehicle_for_user(user=user, vehicle_id=vehicle_id)
    if occurred_at is None:
        occurred_at = timezone.now()
    station = None
    if station_id is not None:
        station = Station.objects.filter(id=station_id).first()
    if not station_name and station:
        station_name = station.name
    return Fueling.objects.create(
        owner=user,
        vehicle=vehicle,
        station=station,
        occurred_at=occurred_at,
        odometer_km=odometer_km,
        fuel_type=fuel_type,
        liters=liters,
        total_cost=total_cost,
        is_full_tank=is_full_tank,
        station_name=station_name,
        notes=notes,
    )


def compute_consumption_metrics(
    *,
    fuelings_asc: list[Fueling],
) -> ConsumptionMetrics:
    full_events = [f for f in fuelings_asc if f.is_full_tank]
    if len(full_events) < 2:
        total_cost = sum((f.total_cost for f in fuelings_asc), Decimal("0"))
        total_liters = sum((f.liters for f in fuelings_asc), Decimal("0"))
        total_km = 0
        if fuelings_asc:
            total_km = max(0, fuelings_asc[-1].odometer_km - fuelings_asc[0].odometer_km)
        return ConsumptionMetrics(
            km_per_liter_avg=None,
            total_km=total_km,
            total_liters=total_liters,
            total_cost=total_cost,
            intervals_count=0,
        )

    total_km = 0
    total_liters = Decimal("0")
    total_cost = Decimal("0")
    intervals_count = 0

    i = 0
    while i < len(full_events) - 1:
        start = full_events[i]
        end = full_events[i + 1]
        interval_fuelings = [f for f in fuelings_asc if start.occurred_at <= f.occurred_at <= end.occurred_at]
        liters = sum((f.liters for f in interval_fuelings[1:]), Decimal("0"))  # ignore the start tank
        cost = sum((f.total_cost for f in interval_fuelings[1:]), Decimal("0"))
        km = max(0, end.odometer_km - start.odometer_km)

        if liters > 0 and km > 0:
            total_km += km
            total_liters += liters
            total_cost += cost
            intervals_count += 1

        i += 1

    km_per_liter_avg = None
    if total_liters > 0 and total_km > 0:
        km_per_liter_avg = (Decimal(total_km) / total_liters).quantize(Decimal("0.01"))

    return ConsumptionMetrics(
        km_per_liter_avg=km_per_liter_avg,
        total_km=total_km,
        total_liters=total_liters,
        total_cost=total_cost.quantize(Decimal("0.01")),
        intervals_count=intervals_count,
    )

