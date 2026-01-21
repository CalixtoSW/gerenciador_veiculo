from __future__ import annotations

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.template.loader import render_to_string


def health_view(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})


def react_shell_view(request: HttpRequest) -> HttpResponse:
    generated = settings.BASE_DIR / "templates" / "react.generated.html"
    if generated.exists():
        return HttpResponse(generated.read_text(encoding="utf-8"), content_type="text/html; charset=utf-8")
    return HttpResponse(render_to_string("react.html"), content_type="text/html; charset=utf-8")
