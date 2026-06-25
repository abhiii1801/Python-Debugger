"""
main.py — FastAPI application for Tracer.

Endpoints:
  POST /run  — Execute user Python code and return all execution frames.
"""
from __future__ import annotations
import os
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from debugger.runner import run_code
from debugger.sandbox import SandboxViolation

app = FastAPI(title="Tracer API", version="1.0.0")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Read allowed origins from environment variable
# In production, set ALLOWED_ORIGINS=https://yourapp.vercel.app
# Multiple origins comma-separated: https://app1.vercel.app,https://app2.vercel.app
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")

if allowed_origins_env == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [o.strip() for o in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


class RunRequest(BaseModel):
    code: str


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "tracer-backend"}


@app.post("/run")
@limiter.limit("10/minute")
async def run_code_endpoint(request: Request, body: RunRequest):
    """
    Execute user Python code and return all execution frames.

    On success, returns all captured frames from sys.settrace.
    On error, returns an error descriptor with type/message/line info.
    """
    code = body.code.strip()
    if not code:
        return {
            "frames": [],
            "error": {"type": "EmptyCode", "message": "No code provided.", "line": None},
            "ast_info": None,
            "total_frames": 0,
            "execution_time_ms": 0.0,
        }

    try:
        frames, ast_info, execution_time_ms = run_code(code)
        return {
            "frames": frames,
            "ast_info": ast_info,
            "total_frames": len(frames),
            "execution_time_ms": round(execution_time_ms, 2),
        }

    except SyntaxError as e:
        return {
            "frames": [],
            "error": {
                "type": "SyntaxError",
                "message": str(e.msg) if hasattr(e, "msg") else str(e),
                "line": e.lineno,
            },
            "ast_info": None,
            "total_frames": 0,
            "execution_time_ms": 0.0,
        }

    except SandboxViolation as e:
        return {
            "frames": [],
            "error": {
                "type": "SandboxViolation",
                "message": str(e),
                "line": None,
            },
            "ast_info": None,
            "total_frames": 0,
            "execution_time_ms": 0.0,
        }

    except TimeoutError as e:
        return {
            "frames": [],
            "error": {
                "type": "TimeoutError",
                "message": str(e),
                "line": None,
            },
            "ast_info": None,
            "total_frames": 0,
            "execution_time_ms": 5000.0,
        }

    except Exception as e:
        import traceback
        return {
            "frames": [],
            "error": {
                "type": type(e).__name__,
                "message": str(e),
                "line": None,
            },
            "ast_info": None,
            "total_frames": 0,
            "execution_time_ms": 0.0,
        }
