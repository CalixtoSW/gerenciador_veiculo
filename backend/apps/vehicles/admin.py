from django.contrib import admin

from .models import Fueling, Station, Vehicle


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "nickname", "brand", "model", "plate", "fuel_type", "updated_at")
    search_fields = ("nickname", "brand", "model", "plate", "owner__username")


@admin.register(Fueling)
class FuelingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "owner",
        "vehicle",
        "station",
        "occurred_at",
        "odometer_km",
        "fuel_type",
        "liters",
        "total_cost",
        "is_full_tank",
    )
    list_filter = ("fuel_type", "is_full_tank")
    search_fields = ("vehicle__nickname", "vehicle__brand", "vehicle__model", "station_name", "owner__username")


@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "brand", "city", "state", "updated_at")
    search_fields = ("name", "brand", "city", "state")

