from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class FuelType(models.TextChoices):
    GASOLINA = "gasolina", "Gasolina"
    ETANOL = "etanol", "Etanol"
    DIESEL = "diesel", "Diesel"
    GNV = "gnv", "GNV"
    ELETRICO = "eletrico", "Elétrico"
    HIBRIDO = "hibrido", "Híbrido"
    FLEX = "flex", "Flex"


class Vehicle(TimestampedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vehicles")

    nickname = models.CharField(max_length=60, blank=True)
    brand = models.CharField(max_length=60)
    model = models.CharField(max_length=80)
    manufacture_year = models.PositiveSmallIntegerField(null=True, blank=True)
    model_year = models.PositiveSmallIntegerField(null=True, blank=True)
    plate = models.CharField(max_length=10, blank=True)

    fuel_type = models.CharField(max_length=16, choices=FuelType.choices, default=FuelType.GASOLINA)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "plate"],
                condition=~models.Q(plate=""),
                name="uq_vehicle_owner_plate",
            ),
        ]

    def __str__(self) -> str:
        return self.nickname or f"{self.brand} {self.model}".strip()


class Fueling(TimestampedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="fuelings")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="fuelings")

    occurred_at = models.DateTimeField()
    odometer_km = models.PositiveIntegerField()

    fuel_type = models.CharField(max_length=16, choices=FuelType.choices)
    liters = models.DecimalField(max_digits=8, decimal_places=3)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    is_full_tank = models.BooleanField(default=True)

    station_name = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-occurred_at", "-id"]
        indexes = [
            models.Index(fields=["owner", "vehicle", "-occurred_at"]),
            models.Index(fields=["owner", "vehicle", "-odometer_km"]),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(liters__gt=0), name="ck_fueling_liters_gt_0"),
            models.CheckConstraint(condition=models.Q(total_cost__gt=0), name="ck_fueling_cost_gt_0"),
        ]

    @property
    def price_per_liter(self) -> Decimal:
        if self.liters:
            return (self.total_cost / self.liters).quantize(Decimal("0.0001"))
        return Decimal("0")

    def __str__(self) -> str:
        return f"{self.vehicle_id} {self.occurred_at:%Y-%m-%d} @ {self.odometer_km}km"
