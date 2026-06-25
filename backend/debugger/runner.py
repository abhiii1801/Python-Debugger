"""
runner.py — Orchestrates code execution with tracing.

Responsibilities:
1. AST pre-analysis
2. Compile user code
3. Execute in sandbox with tracer attached
4. Return frames + AST info
"""
from __future__ import annotations
import ast
import sys
import time
import threading
from io import StringIO
from typing import Any, Dict, List, Optional, Tuple

from debugger.sandbox import build_sandbox_globals, SandboxViolation, FORBIDDEN_MODULES
from debugger.tracer import FrameCollector

EXECUTION_TIMEOUT = 5.0  # seconds
CODE_FILENAME = "<user_code>"


def analyze_ast(code: str) -> Dict:
    """Run AST analysis on user code to extract structural info."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return {
            "has_loops": False,
            "has_functions": False,
            "has_classes": False,
            "has_recursion": False,
            "function_names": [],
            "class_names": [],
            "import_names": [],
        }

    function_names = []
    class_names = []
    import_names = []
    has_loops = False
    has_functions = False
    has_classes = False
    has_recursion = False

    # Track which functions contain calls to themselves
    func_call_map: Dict[str, set] = {}
    current_func = [None]

    class Visitor(ast.NodeVisitor):
        def visit_FunctionDef(self, node):
            nonlocal has_functions
            has_functions = True
            function_names.append(node.name)
            func_call_map[node.name] = set()
            prev = current_func[0]
            current_func[0] = node.name
            self.generic_visit(node)
            current_func[0] = prev

        def visit_AsyncFunctionDef(self, node):
            self.visit_FunctionDef(node)

        def visit_ClassDef(self, node):
            nonlocal has_classes
            has_classes = True
            class_names.append(node.name)
            self.generic_visit(node)

        def visit_For(self, node):
            nonlocal has_loops
            has_loops = True
            self.generic_visit(node)

        def visit_While(self, node):
            nonlocal has_loops
            has_loops = True
            self.generic_visit(node)

        def visit_Import(self, node):
            for alias in node.names:
                import_names.append(alias.name)

        def visit_ImportFrom(self, node):
            if node.module:
                import_names.append(node.module)

        def visit_Call(self, node):
            if current_func[0] is not None:
                if isinstance(node.func, ast.Name):
                    if node.func.id in func_call_map:
                        func_call_map[current_func[0]].add(node.func.id)
            self.generic_visit(node)

    Visitor().visit(tree)

    # Check recursion: any function calls itself
    for func_name, calls in func_call_map.items():
        if func_name in calls:
            has_recursion = True
            break

    return {
        "has_loops": has_loops,
        "has_functions": has_functions,
        "has_classes": has_classes,
        "has_recursion": has_recursion,
        "function_names": list(set(function_names)),
        "class_names": list(set(class_names)),
        "import_names": list(set(import_names)),
    }


def check_imports_for_violations(code: str) -> Optional[str]:
    """Quick AST check for forbidden imports before execution."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return None

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                base = alias.name.split(".")[0]
                if base in FORBIDDEN_MODULES or alias.name in FORBIDDEN_MODULES:
                    return alias.name
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                base = node.module.split(".")[0]
                if base in FORBIDDEN_MODULES or node.module in FORBIDDEN_MODULES:
                    return node.module
    return None


def run_code(code: str) -> Tuple[List[dict], Dict, float]:
    """
    Execute user code with sys.settrace tracing in a sandbox.

    Returns:
        (frames, ast_info, execution_time_ms)

    Raises:
        SyntaxError: if the code has a compile error
        SandboxViolation: if the code tries to import forbidden modules
        TimeoutError: if execution exceeds 5 seconds
        Exception: for any other runtime error (captured as a final exception frame)
    """
    # AST analysis
    ast_info = analyze_ast(code)

    # Check for forbidden imports upfront
    forbidden = check_imports_for_violations(code)
    if forbidden:
        raise SandboxViolation(f"Import of '{forbidden}' is not allowed in the sandbox.")

    # Compile with our virtual filename
    try:
        compiled = compile(code, CODE_FILENAME, "exec")
    except SyntaxError as e:
        raise

    # Set up I/O captures
    stdout_capture = StringIO()
    stderr_capture = StringIO()

    # Build sandbox globals
    sandbox_globals = build_sandbox_globals(stdout_capture, stderr_capture)

    # Set up tracer
    collector = FrameCollector(
        code_filename=CODE_FILENAME,
        sandbox_globals=sandbox_globals,
        stdout_capture=stdout_capture,
        stderr_capture=stderr_capture,
    )

    # Thread-based execution with timeout
    exception_holder = [None]
    timed_out = [False]

    def _execute():
        try:
            sys.settrace(collector.get_trace_function())
            exec(compiled, sandbox_globals)
        except SandboxViolation as e:
            exception_holder[0] = e
        except SystemExit:
            pass  # Allow sys.exit() analog gracefully
        except Exception as e:
            # Add the exception as a final frame
            import traceback as tb
            exc_info = {
                "frame_index": collector.frame_index,
                "line": 0,
                "event": "exception",
                "locals": {},
                "globals": {},
                "stack": [],
                "stdout": stdout_capture.getvalue(),
                "stderr": stderr_capture.getvalue(),
                "heap": [],
                "return_value": None,
                "exception": {
                    "type": type(e).__name__,
                    "message": str(e),
                    "traceback": tb.format_exc(),
                },
                "changed_vars": [],
            }
            collector.frames.append(exc_info)
        finally:
            sys.settrace(None)

    start_time = time.time()
    exec_thread = threading.Thread(target=_execute, daemon=True)
    exec_thread.start()
    exec_thread.join(timeout=EXECUTION_TIMEOUT)

    if exec_thread.is_alive():
        timed_out[0] = True
        sys.settrace(None)
        raise TimeoutError(f"Code execution exceeded {EXECUTION_TIMEOUT} second limit.")

    execution_time_ms = (time.time() - start_time) * 1000

    if exception_holder[0] is not None:
        raise exception_holder[0]

    frames = collector.result()

    # If LeetCode-transformed code was run, capture _result from the namespace
    # and add it to the last frame as 'leetcode_result' for reliable pass/fail comparison.
    if '_result' in sandbox_globals and frames:
        try:
            frames[-1]['leetcode_result'] = str(sandbox_globals['_result'])
        except Exception:
            pass

    return frames, ast_info, execution_time_ms
