#!/usr/bin/env bash
# Review2Product — one-click demo launcher (macOS / Linux)
set -uo pipefail
cd "$(dirname "$0")"

BOLD="\033[1m"; CYAN="\033[36m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; RESET="\033[0m"
say()  { echo -e "${CYAN}$1${RESET}"; }
ok()   { echo -e "${GREEN}$1${RESET}"; }
warn() { echo -e "${YELLOW}$1${RESET}"; }
fail() { echo -e "${RED}$1${RESET}"; exit 1; }

echo "=========================================================="
echo "  Review2Product — Global Voice of Customer → Product Evolution Agent"
echo "  One-click launcher (macOS / Linux)"
echo "=========================================================="
echo

# ---------- 1. Python ----------
PY=python3; command -v $PY >/dev/null 2>&1 || PY=python
command -v $PY >/dev/null 2>&1 || fail "[ERROR] Python not found. Install Python 3.10+ first."

# ---------- 2. venv + deps ----------
if [ ! -x ".venv/bin/python" ]; then
  say "[1/5] Creating virtual environment ..."
  $PY -m venv .venv || fail "[ERROR] venv creation failed"
else
  say "[1/5] Virtual environment found."
fi

say "[2/5] Checking backend dependencies ..."
if ! .venv/bin/python -c "import fastapi, pandas, duckdb, sklearn, pyarrow" >/dev/null 2>&1; then
  echo "      Installing requirements.txt ..."
  .venv/bin/python -m pip install -q -r requirements.txt || fail "[ERROR] pip install failed"
else
  ok "      Dependencies OK."
fi

# ---------- 3. pipeline ----------
say "[3/5] Running data pipeline (download → preprocess → analyze) ..."
.venv/bin/python scripts/run_pipeline.py || warn "[WARN] Pipeline returned non-zero; backend will retry lazily."

# ---------- 4. backend ----------
say "[4/5] Starting FastAPI backend on http://127.0.0.1:8000 ..."
.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &
API_PID=$!

tries=0
until curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; do
  tries=$((tries+1))
  [ $tries -ge 30 ] && { warn "[WARN] Backend health check timed out; it may still be loading."; break; }
  sleep 2
done
ok "      Backend is up."

# ---------- 5. frontend ----------
say "[5/5] Starting React frontend ..."
command -v npm >/dev/null 2>&1 || fail "[ERROR] npm not found. Install Node 18+ first."
cd frontend
[ -d node_modules ] || { echo "      Installing npm packages (first run only) ..."; npm install; }
npm run dev -- --port 5173 &
WEB_PID=$!
cd ..

echo
echo "=========================================================="
echo "  Frontend : http://localhost:5173"
echo "  API docs : http://127.0.0.1:8000/docs"
echo "  Hero     : Segbeauty spray bottle (1,420 real reviews)"
echo "=========================================================="
echo "Press Ctrl+C to stop both servers."
( command -v xdg-open >/dev/null 2>&1 && xdg-open http://localhost:5173 ) \
  || ( command -v open >/dev/null 2>&1 && open http://localhost:5173 ) \
  || true

trap 'echo; warn "Shutting down ..."; kill $API_PID $WEB_PID 2>/dev/null; exit 0' INT TERM
wait
