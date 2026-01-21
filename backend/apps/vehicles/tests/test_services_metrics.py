from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from django.test import TestCase

from apps.vehicles.models import FuelType, Fueling, Vehicle
from apps.vehicles.services import compute_consumption_metrics


class ComputeConsumptionMetricsTests(TestCase):
    def test_requires_two_full_tanks(self):
        user = self._create_user("u")
        v = Vehicle.objects.create(owner=user, brand="Fiat", model="Uno", fuel_type=FuelType.GASOLINA)
        now = datetime.now(tz=timezone.utc)

        f1 = Fueling.objects.create(
            owner=user,
            vehicle=v,
            occurred_at=now,
            odometer_km=1000,
            fuel_type=FuelType.GASOLINA,
            liters=Decimal("30.0"),
            total_cost=Decimal("150.0"),
            is_full_tank=True,
        )

        metrics = compute_consumption_metrics(fuelings_asc=[f1])
        self.assertIsNone(metrics.km_per_liter_avg)

    def test_two_full_tanks(self):
        user = self._create_user("u2")
        v = Vehicle.objects.create(owner=user, brand="VW", model="Gol", fuel_type=FuelType.GASOLINA)
        now = datetime.now(tz=timezone.utc)

        f1 = Fueling.objects.create(
            owner=user,
            vehicle=v,
            occurred_at=now,
            odometer_km=1000,
            fuel_type=FuelType.GASOLINA,
            liters=Decimal("35.0"),
            total_cost=Decimal("200.0"),
            is_full_tank=True,
        )
        f2 = Fueling.objects.create(
            owner=user,
            vehicle=v,
            occurred_at=now + timedelta(days=7),
            odometer_km=1350,
            fuel_type=FuelType.GASOLINA,
            liters=Decimal("25.0"),
            total_cost=Decimal("160.0"),
            is_full_tank=True,
        )

        metrics = compute_consumption_metrics(fuelings_asc=[f1, f2])
        self.assertEqual(metrics.km_per_liter_avg, Decimal("14.00"))
        self.assertEqual(metrics.total_km, 350)
        self.assertEqual(metrics.total_liters, Decimal("25.0"))

    def _create_user(self, username: str):
        from django.contrib.auth.models import User

        return User.objects.create_user(username=username, password="password-123")

