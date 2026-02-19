WEB_DIR := apps/web
API_DIR := apps/api
PYTHON := $(API_DIR)/.venv/Scripts/python

.PHONY: setup dev dev-web dev-api test-api lint fmt

setup:
	
cd $(WEB_DIR) && npm install
	
python -m venv $(API_DIR)/.venv
	
$(PYTHON) -m pip install -U pip
	
$(PYTHON) -m pip install -r $(API_DIR)/requirements.txt

dev:
	
$(MAKE) -j 2 dev-web dev-api

dev-web:
	
cd $(WEB_DIR) && npm run dev

dev-api:
	
$(PYTHON) -m uvicorn app.main:app --reload --port 8000 --app-dir $(API_DIR)

test-api:
	
$(PYTHON) -m pytest

lint:
	
cd $(WEB_DIR) && npm run lint
	
$(PYTHON) -m ruff check $(API_DIR)

fmt:
	
cd $(WEB_DIR) && npm run format
	
$(PYTHON) -m black $(API_DIR)