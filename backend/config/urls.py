from django.shortcuts import redirect
from django.contrib import admin
from django.urls import include, path, re_path

from apps.vehicles.views import health_view, react_shell_view


def root_redirect_view(request):
    return redirect("/app/")


urlpatterns = [
    path("", root_redirect_view, name="root"),
    path("admin/", admin.site.urls),
    path("health/", health_view, name="health"),
    path("api/", include("apps.vehicles.urls")),
    path("app/", react_shell_view, name="react-shell"),
    re_path(r"^app/.*$", react_shell_view, name="react-shell-catchall"),
]
