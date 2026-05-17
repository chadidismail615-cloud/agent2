#!/bin/bash
set -e

echo "🏋️  Starting GymOS AI Platform..."

# Backend
cd "$(dirname "$0")/backend"

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "⚠️  Created .env — add your ANTHROPIC_API_KEY before using the AI agent"
fi

if [ ! -d "venv" ]; then
  echo "📦 Creating Python venv..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

python seed_demo.py

echo "🚀 Starting FastAPI backend on http://localhost:8000 ..."
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
cd ../frontend

if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  npm install
fi

cp .env.example .env.local 2>/dev/null || true

echo "🚀 Starting Next.js frontend on http://localhost:3000 ..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "═══════════════════════════════════════════"
echo "  GymOS is running!"
echo "  Frontend:  http://localhost:3000"
echo "  API docs:  http://localhost:8000/docs"
echo "  Login:     owner@ironparadise.com"
echo "  Password:  demo1234"
echo "═══════════════════════════════════════════"
echo ""

wait $BACKEND_PID $FRONTEND_PID
