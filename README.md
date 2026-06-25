# PyDebugger

A Python visual debugger with step-by-step execution visualization.

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Tech Stack
- Frontend: React + TypeScript + Vite + TailwindCSS + Monaco Editor + React Flow
- Backend: FastAPI + Python sys.settrace
