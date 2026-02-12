from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .api import (
    FuelingViewSet,
    StationBrandViewSet,
    StationViewSet,
    VehicleViewSet,
    csrf_view,
    login_view,
    logout_view,
    me_view,
    register_view,
    station_metrics_view,
    stations_metrics_view,
    vehicle_metrics_view,
)

router = DefaultRouter()
router.register(r"vehicles", VehicleViewSet, basename="vehicle")
router.register(r"fuelings", FuelingViewSet, basename="fueling")
router.register(r"stations", StationViewSet, basename="station")
router.register(r"station-brands", StationBrandViewSet, basename="station-brand")

urlpatterns = [
    path("auth/csrf/", csrf_view, name="auth-csrf"),
    path("auth/register/", register_view, name="auth-register"),
    path("auth/login/", login_view, name="auth-login"),
    path("auth/logout/", logout_view, name="auth-logout"),
    path("auth/me/", me_view, name="auth-me"),
    path("vehicles/<int:vehicle_id>/metrics/", vehicle_metrics_view, name="vehicle-metrics"),
    path("stations/metrics/", stations_metrics_view, name="stations-metrics"),
    path("stations/<int:station_id>/metrics/", station_metrics_view, name="station-metrics"),
    path("", include(router.urls)),
]
