"""
tracer.py — sys.settrace-based execution tracer.

Captures line, call, return, and exception events and builds a list of
ExecutionFrame snapshots. Caps at MAX_FRAMES to prevent runaway loops.
"""
from __future__ import annotations
import sys
import types as _types
import traceback as tb_module
from io import StringIO
from typing import Any, Dict, List, Optional

from debugger.serializer import serialize_locals, collect_heap_objects, should_exclude_object

MAX_FRAMES = 500

# Variables to always exclude from display
EXCLUDED_VARS = {
    "__name__", "__doc__", "__package__", "__spec__",
    "__annotations__", "__builtins__", "__loader__", "__file__",
    "__cached__", "__build_class__",
}


class FrameCollector:
    """
    Collects execution frames via sys.settrace hooks.
    Attach to a thread and call result() when done.
    """

    def __init__(self, code_filename: str, sandbox_globals: dict,
                 stdout_capture: StringIO, stderr_capture: StringIO):
        self.code_filename = code_filename
        self.sandbox_globals = sandbox_globals
        self.stdout_capture = stdout_capture
        self.stderr_capture = stderr_capture

        # Capture the set of pre-loaded names so we can exclude them from locals/globals display
        self._initial_sandbox_keys: frozenset = frozenset(sandbox_globals.keys())

        self.frames: List[dict] = []
        self.call_stack: List[dict] = []  # stack of {function_name, filename, line, locals}
        self.frame_index = 0
        self.prev_locals: Dict[str, Any] = {}
        self._stop = False

    def _get_stdout(self) -> str:
        return self.stdout_capture.getvalue()

    def _get_stderr(self) -> str:
        return self.stderr_capture.getvalue()

    def _compute_changed_vars(self, current_locals: dict) -> list:
        changed = []
        for name, descriptor in current_locals.items():
            if name not in self.prev_locals:
                changed.append(name)
            elif self.prev_locals[name] != descriptor:
                changed.append(name)
        return changed

    def _filter_user_vars(self, raw_vars: dict, is_module_level: bool = False) -> dict:
        """
        Filter a vars dict to only include user-defined variables.
        Removes: dunder names, pre-loaded sandbox keys, module objects, typing internals.
        """
        result = {}
        for k, v in raw_vars.items():
            if k.startswith("__") or k in EXCLUDED_VARS:
                continue
            if isinstance(v, _types.ModuleType):
                continue
            # Skip typing module internals
            if should_exclude_object(v):
                continue
            # At module level, f_locals IS the sandbox_globals dict,
            # so we filter by initial sandbox keys to only show user-defined names.
            if is_module_level and k in self._initial_sandbox_keys:
                continue
            result[k] = v
        return result

    def _capture_frame(self, py_frame, event: str, arg: Any):
        if self._stop or self.frame_index >= MAX_FRAMES:
            self._stop = True
            return

        # Only trace code from our user script (skip stdlib internals)
        filename = py_frame.f_code.co_filename
        if filename != self.code_filename:
            return

        func_name = py_frame.f_code.co_name
        is_module = func_name == "<module>"

        # Serialize locals — filter module-level sandbox noise
        raw_locals = dict(py_frame.f_locals)
        user_locals = self._filter_user_vars(raw_locals, is_module_level=is_module)
        serial_locals = serialize_locals(user_locals)

        # Serialize globals — at module level same as locals (user-defined only)
        # At function level, globals = user-defined names added to sandbox since start
        user_globals: dict = {}
        if not is_module:
            # Show what has been added to globals since initial sandbox setup
            for k, v in self.sandbox_globals.items():
                if k.startswith("__") or k in EXCLUDED_VARS:
                    continue
                if isinstance(v, _types.ModuleType):
                    continue
                if k in self._initial_sandbox_keys:
                    continue
                # Don't duplicate what's already in locals
                if k not in user_locals:
                    user_globals[k] = v
        serial_globals = serialize_locals(user_globals)

        # Collect heap
        heap = collect_heap_objects(serial_locals, serial_globals)

        # Compute changed vars
        changed_vars = self._compute_changed_vars(serial_locals)

        # Build stack snapshot
        stack_snapshot = []
        for sf in self.call_stack:
            stack_snapshot.append({
                "function_name": sf["function_name"],
                "filename": sf["filename"],
                "line": sf["line"],
                "locals": sf["locals"],
            })

        # Return value
        return_value = None
        if event == "return":
            try:
                return_value = serialize_locals({"__ret__": arg}).get("__ret__")
            except Exception:
                return_value = None

        # Exception info
        exception_info = None
        if event == "exception" and arg is not None:
            exc_type, exc_value, exc_tb = arg
            exception_info = {
                "type": exc_type.__name__ if exc_type else "Exception",
                "message": str(exc_value),
                "traceback": "".join(tb_module.format_exception(exc_type, exc_value, exc_tb)),
            }

        frame_data = {
            "frame_index": self.frame_index,
            "line": py_frame.f_lineno,
            "event": event,
            "locals": serial_locals,
            "globals": serial_globals,
            "stack": stack_snapshot,
            "stdout": self._get_stdout(),
            "stderr": self._get_stderr(),
            "heap": heap,
            "return_value": return_value,
            "exception": exception_info,
            "changed_vars": changed_vars,
        }

        self.frames.append(frame_data)
        self.frame_index += 1
        self.prev_locals = dict(serial_locals)

    def get_trace_function(self):
        """Returns the global trace function to be set via sys.settrace."""
        collector = self

        def global_trace(frame, event, arg):
            filename = frame.f_code.co_filename
            if filename != collector.code_filename:
                return None  # Don't trace stdlib/other files

            if event == "call":
                func_name = frame.f_code.co_name
                is_module = func_name == "<module>"
                raw_locals = dict(frame.f_locals)
                user_locals = collector._filter_user_vars(raw_locals, is_module_level=is_module)
                serial_locals = serialize_locals(user_locals)
                collector.call_stack.append({
                    "function_name": func_name,
                    "filename": filename,
                    "line": frame.f_lineno,
                    "locals": serial_locals,
                })
                collector._capture_frame(frame, "call", arg)

            return local_trace

        def local_trace(frame, event, arg):
            if collector._stop:
                return None

            filename = frame.f_code.co_filename
            if filename != collector.code_filename:
                return None

            if event == "line":
                # Update top of call stack with current line
                if collector.call_stack:
                    func_name = frame.f_code.co_name
                    is_module = func_name == "<module>"
                    user_locals = collector._filter_user_vars(
                        dict(frame.f_locals), is_module_level=is_module
                    )
                    collector.call_stack[-1]["line"] = frame.f_lineno
                    collector.call_stack[-1]["locals"] = serialize_locals(user_locals)
                collector._capture_frame(frame, "line", arg)

            elif event == "return":
                collector._capture_frame(frame, "return", arg)
                if collector.call_stack:
                    collector.call_stack.pop()

            elif event == "exception":
                collector._capture_frame(frame, "exception", arg)

            return local_trace

        return global_trace

    def result(self) -> List[dict]:
        return self.frames
