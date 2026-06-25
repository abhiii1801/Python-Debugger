# Tracer

A Visual Python Debugger with step-by-step execution visualization.

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

## Deployment

### Backend (Render)
1. Go to render.com → New Web Service
2. Connect your GitHub repository
3. Set root directory to `backend`
4. Render auto-detects render.yaml settings
5. After deploy, copy your Render URL (e.g. https://tracer-backend.onrender.com)

### Frontend (Vercel)
1. Go to vercel.com → New Project
2. Connect your GitHub repository
3. Set root directory to `frontend`
4. Add environment variable:
   - Key: VITE_API_URL
   - Value: https://tracer-backend.onrender.com  ← your Render URL
5. Deploy

### After Both Are Deployed
Update backend ALLOWED_ORIGINS on Render:
- Go to Render dashboard → your service → Environment
- Set ALLOWED_ORIGINS to your Vercel URL (e.g. https://tracer.vercel.app)
- Render will auto-redeploy

## Tech Stack
- Frontend: React + TypeScript + Vite + TailwindCSS + Monaco Editor + React Flow
- Backend: FastAPI + Python sys.settrace
