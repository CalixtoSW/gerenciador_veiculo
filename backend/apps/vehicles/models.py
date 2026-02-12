from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models

from .utils import quantize_decimal


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


class Station(TimestampedModel):
    name = models.CharField(max_length=120)
    brand = models.ForeignKey("StationBrand", on_delete=models.SET_NULL, null=True, blank=True, related_name="stations")
    address = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=80)
    state = models.CharField(max_length=2)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["city", "state"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.city}/{self.state})"


class StationBrand(TimestampedModel):
    name = models.CharField(max_length=80, unique=True)

    class Meta:
        verbose_name = "Station brand"
        verbose_name_plural = "Station brands"

    def __str__(self) -> str:
        return self.name


class Fueling(TimestampedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="fuelings")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="fuelings")
    station = models.ForeignKey(Station, on_delete=models.SET_NULL, null=True, blank=True, related_name="fuelings")

    occurred_at = models.DateTimeField()
    odometer_km = models.PositiveIntegerField()

    fuel_type = models.CharField(max_length=16, choices=FuelType.choices)
    liters = models.DecimalField(max_digits=8, decimal_places=3)
    total_cost = models.DecimalField(max_digits=10, decimal_places=3)
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
            return quantize_decimal(self.total_cost / self.liters, places=3) or Decimal("0")
        return Decimal("0")

    def __str__(self) -> str:
        return f"{self.vehicle_id} {self.occurred_at:%Y-%m-%d} @ {self.odometer_km}km"
