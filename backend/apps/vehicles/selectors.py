from __future__ import annotations

from datetime import datetime

from django.contrib.auth.models import AbstractBaseUser
from django.db.models import QuerySet

from .models import Fueling, Vehicle


def vehicles_for_user(*, user: AbstractBaseUser) -> QuerySet[Vehicle]:
    return Vehicle.objects.filter(owner=user).order_by("-updated_at", "-id")


def vehicle_for_user(*, user: AbstractBaseUser, vehicle_id: int) -> Vehicle:
    return Vehicle.objects.get(owner=user, id=vehicle_id)


def fuelings_for_user_vehicle(*, user: AbstractBaseUser, vehicle_id: int) -> QuerySet[Fueling]:
    return (
        Fueling.objects.filter(owner=user, vehicle_id=vehicle_id)
        .select_related("vehicle")
        .order_by("-occurred_at", "-id")
    )


def fuelings_between(
    *,
    user: AbstractBaseUser,
    vehicle_id: int,
    start: datetime | None = None,
    end: datetime | None = None,
) -> QuerySet[Fueling]:
    qs = Fueling.objects.filter(owner=user, vehicle_id=vehicle_id)
    if start is not None:
        qs = qs.filter(occurred_at__gte=start)
    if end is not None:
        qs = qs.filter(occurred_at__lte=end)
    return qs.select_related("vehicle").order_by("occurred_at", "id")

