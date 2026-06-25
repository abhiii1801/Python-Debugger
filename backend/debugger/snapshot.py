"""
snapshot.py — Pydantic models for execution frame data.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class StackFrame(BaseModel):
    function_name: str
    filename: str
    line: int
    locals: Dict[str, Any]


class ExceptionInfo(BaseModel):
    type: str
    message: str
    traceback: str


class ExecutionFrame(BaseModel):
    frame_index: int
    line: int
    event: str  # "line" | "call" | "return" | "exception"
    locals: Dict[str, Any]
    globals: Dict[str, Any]
    stack: List[StackFrame]
    stdout: str
    stderr: str
    heap: List[Any]
    return_value: Optional[Any] = None
    exception: Optional[ExceptionInfo] = None
    changed_vars: List[str]


class AstInfo(BaseModel):
    has_loops: bool
    has_functions: bool
    has_classes: bool
    has_recursion: bool
    function_names: List[str]
    class_names: List[str]
    import_names: List[str]


class RunResponse(BaseModel):
    frames: List[ExecutionFrame]
    ast_info: Optional[AstInfo] = None
    total_frames: int
    execution_time_ms: float


class ErrorDetail(BaseModel):
    type: str
    message: str
    line: Optional[int] = None


class ErrorResponse(BaseModel):
    frames: List[ExecutionFrame] = []
    error: ErrorDetail
    ast_info: Optional[AstInfo] = None
    total_frames: int = 0
    execution_time_ms: float = 0.0
