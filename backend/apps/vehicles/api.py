from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date

from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import FuelType, Fueling, Station, Vehicle
from .selectors import fuelings_between, vehicles_for_user
from .services import (
    auth_login,
    auth_logout,
    auth_register,
    compute_consumption_metrics,
    create_fueling,
    create_vehicle,
)


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


class StationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Station
        fields = [
            "id",
            "name",
            "brand",
            "address",
            "city",
            "state",
            "latitude",
            "longitude",
        ]


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = [
            "id",
            "nickname",
            "brand",
            "model",
            "manufacture_year",
            "model_year",
            "plate",
            "fuel_type",
            "created_at",
            "updated_at",
        ]


class FuelingSerializer(serializers.ModelSerializer):
    price_per_liter = serializers.SerializerMethodField()
    occurred_at = serializers.DateTimeField(required=False)
    station = serializers.PrimaryKeyRelatedField(queryset=Station.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Fueling
        fields = [
            "id",
            "vehicle",
            "station",
            "occurred_at",
            "odometer_km",
            "fuel_type",
            "liters",
            "total_cost",
            "price_per_liter",
            "is_full_tank",
            "station_name",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "price_per_liter"]

    def validate_vehicle(self, value: Vehicle) -> Vehicle:
        request = self.context.get("request")
        if request is None:
            return value
        if value.owner_id != request.user.id:
            raise serializers.ValidationError("vehicle_not_owned")
        return value

    def get_price_per_liter(self, obj: Fueling) -> str:
        return str(obj.price_per_liter)


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer

    def get_queryset(self):
        return vehicles_for_user(user=self.request.user)

    def perform_create(self, serializer):
        vehicle = create_vehicle(user=self.request.user, **serializer.validated_data)
        serializer.instance = vehicle


class FuelingViewSet(viewsets.ModelViewSet):
    serializer_class = FuelingSerializer

    def get_queryset(self):
        vehicle_id = self.request.query_params.get("vehicle")
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        qs = Fueling.objects.filter(owner=self.request.user).select_related("vehicle")
        if vehicle_id:
            qs = qs.filter(vehicle_id=vehicle_id)
        if start:
            dt = parse_datetime(start)
            if dt is None:
                d = parse_date(start)
                if d is not None:
                    dt = datetime.combine(d, datetime.min.time())
            if dt is not None and timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone.get_current_timezone())
            if dt is not None:
                qs = qs.filter(occurred_at__gte=dt)
        if end:
            dt = parse_datetime(end)
            if dt is None:
                d = parse_date(end)
                if d is not None:
                    dt = datetime.combine(d, datetime.max.time())
            if dt is not None and timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone.get_current_timezone())
            if dt is not None:
                qs = qs.filter(occurred_at__lte=dt)
        return qs.order_by("-occurred_at", "-id")

    def perform_create(self, serializer):
        vehicle = serializer.validated_data["vehicle"]
        station = serializer.validated_data.get("station")
        fueling = create_fueling(
            user=self.request.user,
            vehicle_id=vehicle.id,
            occurred_at=serializer.validated_data.get("occurred_at"),
            odometer_km=serializer.validated_data["odometer_km"],
            fuel_type=serializer.validated_data["fuel_type"],
            liters=serializer.validated_data["liters"],
            total_cost=serializer.validated_data["total_cost"],
            is_full_tank=serializer.validated_data.get("is_full_tank", True),
            station_id=station.id if station else None,
            station_name=serializer.validated_data.get("station_name", ""),
            notes=serializer.validated_data.get("notes", ""),
        )
        serializer.instance = fueling


class StationViewSet(viewsets.ModelViewSet):
    serializer_class = StationSerializer
    queryset = Station.objects.all()

    def get_queryset(self):
        qs = Station.objects.all()
        query = self.request.query_params.get("q")
        if query:
            qs = qs.filter(
                Q(name__icontains=query)
                | Q(city__icontains=query)
                | Q(state__icontains=query)
                | Q(brand__icontains=query)
            )
        return qs.order_by("name", "city", "state")


class AuthRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=3, max_length=150)
    password = serializers.CharField(min_length=8, max_length=256)

    def validate_username(self, value: str) -> str:
        from django.contrib.auth.models import User

        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("username_taken")
        return value


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    serializer = AuthRegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = auth_register(request=request, **serializer.validated_data)
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class AuthLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    serializer = AuthLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = auth_login(request=request, **serializer.validated_data)
    if user is None:
        return Response({"detail": "invalid_credentials"}, status=status.HTTP_400_BAD_REQUEST)
    return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_view(request):
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
def logout_view(request):
    auth_logout(request=request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([AllowAny])
def me_view(request):
    if not request.user.is_authenticated:
        return Response(status=status.HTTP_204_NO_CONTENT)
    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class MetricsQuerySerializer(serializers.Serializer):
    start = serializers.CharField(required=False)
    end = serializers.CharField(required=False)

    def validate(self, attrs):
        start = attrs.get("start")
        end = attrs.get("end")
        parsed_start = parse_datetime(start) if start else None
        if parsed_start is None and start:
            d = parse_date(start)
            if d is not None:
                parsed_start = timezone.make_aware(datetime.combine(d, datetime.min.time()), timezone.get_current_timezone())

        parsed_end = parse_datetime(end) if end else None
        if parsed_end is None and end:
            d = parse_date(end)
            if d is not None:
                parsed_end = timezone.make_aware(datetime.combine(d, datetime.max.time()), timezone.get_current_timezone())

        if parsed_start is not None and timezone.is_naive(parsed_start):
            parsed_start = timezone.make_aware(parsed_start, timezone.get_current_timezone())
        if parsed_end is not None and timezone.is_naive(parsed_end):
            parsed_end = timezone.make_aware(parsed_end, timezone.get_current_timezone())

        attrs["start_dt"] = parsed_start
        attrs["end_dt"] = parsed_end
        return attrs


def _filter_by_period(qs, *, start, end):
    if start is not None:
        qs = qs.filter(occurred_at__gte=start)
    if end is not None:
        qs = qs.filter(occurred_at__lte=end)
    return qs


@api_view(["GET"])
def vehicle_metrics_view(request, vehicle_id: int):
    if not Vehicle.objects.filter(owner=request.user, id=vehicle_id).exists():
        return Response({"detail": "not_found"}, status=status.HTTP_404_NOT_FOUND)

    query = MetricsQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    fuelings = list(
        fuelings_between(
            user=request.user,
            vehicle_id=vehicle_id,
            start=query.validated_data["start_dt"],
            end=query.validated_data["end_dt"],
        )
    )
    metrics = compute_consumption_metrics(fuelings_asc=fuelings)

    cost_per_km = None
    if metrics.total_km > 0 and metrics.total_cost > 0:
        cost_per_km = str((metrics.total_cost / metrics.total_km).quantize(Decimal("0.0001")))

    avg_cost_per_liter = None
    if metrics.total_liters > 0 and metrics.total_cost > 0:
        avg_cost_per_liter = str((metrics.total_cost / metrics.total_liters).quantize(Decimal("0.0001")))

    return Response(
        {
            "vehicle_id": vehicle_id,
            "km_per_liter_avg": str(metrics.km_per_liter_avg) if metrics.km_per_liter_avg is not None else None,
            "liters_per_100km_avg": (
                str((Decimal("100") / metrics.km_per_liter_avg).quantize(Decimal("0.01")))
                if metrics.km_per_liter_avg
                else None
            ),
            "avg_cost_per_liter": avg_cost_per_liter,
            "avg_cost_per_km": cost_per_km,
            "total_km": metrics.total_km,
            "total_liters": str(metrics.total_liters),
            "total_cost": str(metrics.total_cost),
            "intervals_count": metrics.intervals_count,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def station_metrics_view(request, station_id: int):
    if not Station.objects.filter(id=station_id).exists():
        return Response({"detail": "not_found"}, status=status.HTTP_404_NOT_FOUND)

    query = MetricsQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    fuelings = Fueling.objects.filter(owner=request.user, station_id=station_id)
    fuelings = _filter_by_period(fuelings, start=query.validated_data["start_dt"], end=query.validated_data["end_dt"])

    total_cost = fuelings.aggregate(total=Sum("total_cost"))["total"] or Decimal("0")
    total_liters = fuelings.aggregate(total=Sum("liters"))["total"] or Decimal("0")
    fuelings_count = fuelings.aggregate(total=Count("id"))["total"] or 0

    avg_price_per_liter = None
    if total_liters > 0 and total_cost > 0:
        avg_price_per_liter = str((total_cost / total_liters).quantize(Decimal("0.0001")))

    return Response(
        {
            "station_id": station_id,
            "fuelings_count": fuelings_count,
            "total_liters": str(total_liters),
            "total_cost": str(total_cost),
            "avg_price_per_liter": avg_price_per_liter,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def stations_metrics_view(request):
    query = MetricsQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    fuelings = Fueling.objects.filter(owner=request.user, station__isnull=False)
    fuelings = _filter_by_period(fuelings, start=query.validated_data["start_dt"], end=query.validated_data["end_dt"])

    rows = (
        fuelings.values("station_id", "station__name", "station__brand", "station__city", "station__state")
        .annotate(
            total_cost=Sum("total_cost"),
            total_liters=Sum("liters"),
            fuelings_count=Count("id"),
        )
        .annotate(
            avg_price_per_liter=ExpressionWrapper(
                F("total_cost") / F("total_liters"),
                output_field=DecimalField(max_digits=10, decimal_places=4),
            )
        )
        .filter(total_liters__gt=0)
        .order_by("avg_price_per_liter", "station__name")
    )

    data = [
        {
            "station_id": row["station_id"],
            "name": row["station__name"],
            "brand": row["station__brand"],
            "city": row["station__city"],
            "state": row["station__state"],
            "fuelings_count": row["fuelings_count"],
            "total_liters": str(row["total_liters"] or Decimal("0")),
            "total_cost": str(row["total_cost"] or Decimal("0")),
            "avg_price_per_liter": str(row["avg_price_per_liter"]) if row["avg_price_per_liter"] is not None else None,
        }
        for row in rows
    ]

    return Response(data, status=status.HTTP_200_OK)
