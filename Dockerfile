# Review2Product — ModelScope Studio deployment image
# Build React once, then serve the SPA and FastAPI from one process/port.
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=7860
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY scripts ./scripts
COPY data ./data
COPY artifacts ./artifacts
COPY .env.example ./.env.example
COPY README.md RUN_REPORT.md DEMO_SCRIPT.md PPT_MATERIALS.md POSTER_CONTENT.md ./
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

EXPOSE 7860
CMD ["sh", "-c", "python scripts/run_pipeline.py || true; uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
