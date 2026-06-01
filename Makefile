.PHONY: install dev initdb seed migrate revision test lint fmt up down

install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --port 8000

initdb:        ## create tables directly (dev only)
	python -m scripts.init_db

seed:
	python -m scripts.seed

revision:      ## autogenerate a migration: make revision m="add x"
	alembic revision --autogenerate -m "$(m)"

migrate:
	alembic upgrade head

test:
	pytest

lint:
	ruff check .

fmt:
	ruff check --fix . && ruff format .

up:
	docker compose up --build -d

down:
	docker compose down
