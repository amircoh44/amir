# The Super Siddur — FastAPI backend + static PWA frontend.
FROM python:3.12-slim

WORKDIR /app

# Install deps first for layer caching.
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# App code: Python backend + server-rendered Flask front-end + static PWA.
COPY backend ./backend
COPY public ./public
COPY web ./web

RUN mkdir -p /app/data
ENV SIDDUR_DATA_DIR=/app/data \
    PYTHONUNBUFFERED=1

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=4s --start-period=6s \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/healthz').status==200 else 1)" || exit 1

# 2 workers is plenty for this read-heavy app; tune as needed.
CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
