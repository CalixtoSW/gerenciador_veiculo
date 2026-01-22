SHELL := /bin/bash
.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c

.DEFAULT_GOAL := help

VENV ?= .venv
PYTHON ?= $(VENV)/bin/python
PIP ?= $(VENV)/bin/pip

DJANGO_MANAGE ?= $(PYTHON) backend/manage.py
HOST ?= 0.0.0.0
PORT ?= 8000

FRONTEND_DIR ?= frontend
RUN_DIR ?= .run

.PHONY: help
help:
	@cat <<'EOF'
	Uso:
	  make up            # sobe o projeto (build + migrate + server em background)
	  make down          # derruba o projeto (mata o runserver iniciado pelo Makefile)
	  make update        # atualiza deps + build + migrate (opcionalmente git pull)
	  make dev           # modo dev (Django + Vite em foreground)

	Alvos úteis:
	  make install       # cria venv + instala deps (backend + frontend)
	  make build         # build do frontend (copia para o Django)
	  make migrate       # aplica migrations
	  make test          # roda testes do Django
	  make shell         # abre shell do Django
	  make collectstatic # coleta estáticos (prod)
	  make health        # chama /health/
	  make status        # mostra status do runserver (make up)
	  make superuser     # cria admin (Django)
	  make logs          # acompanha logs do Django (make up)
	  make check         # checks do Django
	  make clean         # limpa artefatos comuns

	Variáveis:
	  HOST=0.0.0.0 PORT=8000 VENV=.venv UPDATE_GIT=1
	EOF

$(VENV)/bin/python:
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip

.PHONY: backend-install
backend-install: $(VENV)/bin/python
	$(PIP) install -r backend/requirements.txt

.PHONY: frontend-install
frontend-install:
	cd $(FRONTEND_DIR)
	if [ -f package-lock.json ]; then npm ci; else npm install; fi

.PHONY: install
install: backend-install frontend-install

.PHONY: build
build:
	cd $(FRONTEND_DIR)
	npm run build

.PHONY: migrate
migrate: backend-install
	$(DJANGO_MANAGE) migrate

.PHONY: makemigrations
makemigrations: backend-install
	$(DJANGO_MANAGE) makemigrations

.PHONY: check
check: backend-install
	$(DJANGO_MANAGE) check

.PHONY: test
test: backend-install
	$(DJANGO_MANAGE) test

.PHONY: shell
shell: backend-install
	$(DJANGO_MANAGE) shell

.PHONY: collectstatic
collectstatic: backend-install
	$(DJANGO_MANAGE) collectstatic --noinput

.PHONY: health
health:
	curl -fsS "http://localhost:$(PORT)/health/" | cat

.PHONY: status
status:
	if [ -f $(RUN_DIR)/django.pid ] && kill -0 "$$(cat $(RUN_DIR)/django.pid)" 2>/dev/null; then
		echo "Django rodando (pid=$$(cat $(RUN_DIR)/django.pid))"
	else
		echo "Django não está rodando"
	fi

.PHONY: superuser
superuser: backend-install
	$(DJANGO_MANAGE) createsuperuser

$(RUN_DIR):
	mkdir -p $(RUN_DIR)

.PHONY: up
up: install build migrate $(RUN_DIR)
	if [ -f $(RUN_DIR)/django.pid ] && kill -0 "$$(cat $(RUN_DIR)/django.pid)" 2>/dev/null; then
		echo "Django já está rodando (pid=$$(cat $(RUN_DIR)/django.pid))."
		exit 0
	fi
	nohup $(DJANGO_MANAGE) runserver $(HOST):$(PORT) > $(RUN_DIR)/django.log 2>&1 &
	echo $$! > $(RUN_DIR)/django.pid
	echo "Django iniciado: http://localhost:$(PORT)/ (pid=$$(cat $(RUN_DIR)/django.pid))"
	echo "Logs: make logs"

.PHONY: down
down:
	if [ ! -f $(RUN_DIR)/django.pid ]; then
		echo "Nada para derrubar (arquivo $(RUN_DIR)/django.pid não existe)."
		exit 0
	fi
	pid="$$(cat $(RUN_DIR)/django.pid)"
	if kill -0 "$$pid" 2>/dev/null; then
		kill "$$pid"
		echo "Django derrubado (pid=$$pid)."
	else
		echo "PID $$pid não está rodando."
	fi
	rm -f $(RUN_DIR)/django.pid

.PHONY: logs
logs:
	if [ ! -f $(RUN_DIR)/django.log ]; then
		echo "Sem logs ainda (arquivo $(RUN_DIR)/django.log não existe)."
		exit 1
	fi
	tail -n 200 -f $(RUN_DIR)/django.log

.PHONY: update
update:
	UPDATE_GIT=$${UPDATE_GIT:-1}
	if [ "$$UPDATE_GIT" = "1" ]; then
		git pull --rebase --autostash || git pull
	fi
	$(MAKE) install
	$(MAKE) build
	$(MAKE) migrate
	echo "Update concluído."

.PHONY: dev
dev: install migrate
	set -m
	trap 'jobs -pr | xargs -r kill; wait || true' INT TERM EXIT
	(cd $(FRONTEND_DIR) && npm run dev -- --host $(HOST) --port 5173) &
	$(DJANGO_MANAGE) runserver $(HOST):$(PORT)

.PHONY: clean
clean:
	rm -rf $(RUN_DIR)
	rm -rf backend/static/assets backend/templates/react.generated.html
	rm -rf $(FRONTEND_DIR)/dist
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
