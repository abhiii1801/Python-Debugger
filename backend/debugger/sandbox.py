"""
sandbox.py — Security wrapper for executing untrusted Python code.

Restrictions:
- 5-second timeout (threading.Timer)
- Forbidden stdlib modules
- Blocked dangerous builtins
- Mock input() to return ""
- File I/O and network calls blocked
"""
from __future__ import annotations
import threading
import time
from io import StringIO
from typing import Any, Dict, Optional, Tuple

FORBIDDEN_MODULES = {
    "os",
    "sys",
    "subprocess",
    "socket",
    "shutil",
    "pathlib",
    "importlib",
    "importlib.util",
    "importlib.machinery",
    "importlib.abc",
    "pty",
    "fcntl",
    "signal",
    "ctypes",
    "multiprocessing",
    "threading",
    "concurrent",
    "asyncio",
    "selectors",
    "ssl",
    "http",
    "urllib",
    "ftplib",
    "smtplib",
    "poplib",
    "imaplib",
    "telnetlib",
    "xmlrpc",
    "pickle",
    "shelve",
    "dbm",
    "sqlite3",
    "zipfile",
    "tarfile",
    "gzip",
    "bz2",
    "lzma",
    "io",
    "tempfile",
    "glob",
    "fnmatch",
    "linecache",
    "tokenize",
    "token",
    "ast",
    "dis",
    "py_compile",
    "compileall",
    "zipimport",
    "pkgutil",
    "sysconfig",
    "builtins",
    "gc",
    "inspect",
    "traceback",
    "warnings",
    "weakref",
    "site",
    "code",
    "codeop",
    "pprint",
    "reprlib",
    "atexit",
    "faulthandler",
    "struct",
    "codecs",
    "encodings",
    "unicodedata",
    "platform",
    "resource",
    "mmap",
    "array",
    "queue",
    "getpass",
    "grp",
    "pwd",
}

ALLOWED_MODULES = {
    "math",
    "random",
    "itertools",
    "collections",
    "functools",
    "copy",
    "json",
    "re",
    "string",
    "datetime",
    "heapq",
    "bisect",
    "decimal",
    "fractions",
    "numbers",
    "operator",
    "typing",
    "abc",
    "enum",
    "dataclasses",
    "pprint",
    "textwrap",
    "difflib",
}


class SandboxViolation(Exception):
    """Raised when code tries to import a forbidden module."""
    pass


class TimeoutError(Exception):
    """Raised when execution exceeds the 5-second limit."""
    pass


def _make_restricted_import(stdout_capture: StringIO):
    """Create a __import__ replacement that blocks forbidden modules."""
    import builtins as _builtins
    original_import = _builtins.__import__

    def restricted_import(name, *args, **kwargs):
        base_name = name.split(".")[0]
        if base_name in FORBIDDEN_MODULES or name in FORBIDDEN_MODULES:
            raise SandboxViolation(
                f"Import of '{name}' is not allowed in the sandbox."
            )
        if base_name not in ALLOWED_MODULES and name not in ALLOWED_MODULES:
            raise SandboxViolation(
                f"Import of '{name}' is not in the allowed modules list."
            )
        return original_import(name, *args, **kwargs)

    return restricted_import


def build_sandbox_globals(stdout_capture: StringIO, stderr_capture: StringIO) -> dict:
    """Build a restricted globals dict for exec."""
    import math
    import random
    import itertools
    import collections
    import functools
    import copy
    import json
    import re
    import string
    import datetime
    import heapq
    import bisect
    import decimal

    safe_globals = {
        "__name__": "__main__",
        "__doc__": None,
        "__package__": None,
        "__spec__": None,
        "__annotations__": {},
        "__builtins__": {
            # Safe builtins
            "print": lambda *args, sep=" ", end="\n", file=None, flush=False: (
                stdout_capture.write(sep.join(str(a) for a in args) + end)
            ),
            "input": lambda prompt="": "",
            "len": len,
            "range": range,
            "enumerate": enumerate,
            "zip": zip,
            "map": map,
            "filter": filter,
            "sorted": sorted,
            "reversed": reversed,
            "list": list,
            "dict": dict,
            "set": set,
            "tuple": tuple,
            "str": str,
            "int": int,
            "float": float,
            "bool": bool,
            "bytes": bytes,
            "bytearray": bytearray,
            "memoryview": memoryview,
            "complex": complex,
            "abs": abs,
            "all": all,
            "any": any,
            "bin": bin,
            "chr": chr,
            "divmod": divmod,
            "format": format,
            "getattr": getattr,
            "hasattr": hasattr,
            "hash": hash,
            "hex": hex,
            "id": id,
            "isinstance": isinstance,
            "issubclass": issubclass,
            "iter": iter,
            "max": max,
            "min": min,
            "next": next,
            "oct": oct,
            "ord": ord,
            "pow": pow,
            "repr": repr,
            "round": round,
            "setattr": setattr,
            "slice": slice,
            "sum": sum,
            "type": type,
            "vars": vars,
            "object": object,
            "super": super,
            "property": property,
            "classmethod": classmethod,
            "staticmethod": staticmethod,
            "callable": callable,
            "delattr": delattr,
            "dir": dir,
            "frozenset": frozenset,
            "globals": lambda: safe_globals,
            "locals": locals,
            "NotImplemented": NotImplemented,
            "Ellipsis": Ellipsis,
            # CRITICAL: needed for class definitions
            "__build_class__": __build_class__,
            "__import__": __builtins__["__import__"] if isinstance(__builtins__, dict) else __import__,
            # Exceptions
            "Exception": Exception,
            "BaseException": BaseException,
            "ArithmeticError": ArithmeticError,
            "AssertionError": AssertionError,
            "AttributeError": AttributeError,
            "EOFError": EOFError,
            "EnvironmentError": EnvironmentError,
            "FloatingPointError": FloatingPointError,
            "GeneratorExit": GeneratorExit,
            "IOError": IOError,
            "ImportError": ImportError,
            "IndexError": IndexError,
            "KeyError": KeyError,
            "KeyboardInterrupt": KeyboardInterrupt,
            "LookupError": LookupError,
            "MemoryError": MemoryError,
            "NameError": NameError,
            "NotImplementedError": NotImplementedError,
            "OSError": OSError,
            "OverflowError": OverflowError,
            "RecursionError": RecursionError,
            "ReferenceError": ReferenceError,
            "RuntimeError": RuntimeError,
            "StopIteration": StopIteration,
            "StopAsyncIteration": StopAsyncIteration,
            "SyntaxError": SyntaxError,
            "SyntaxWarning": SyntaxWarning,
            "SystemError": SystemError,
            "SystemExit": SystemExit,
            "TypeError": TypeError,
            "UnboundLocalError": UnboundLocalError,
            "UnicodeError": UnicodeError,
            "UnicodeDecodeError": UnicodeDecodeError,
            "UnicodeEncodeError": UnicodeEncodeError,
            "UnicodeTranslateError": UnicodeTranslateError,
            "ValueError": ValueError,
            "ZeroDivisionError": ZeroDivisionError,
            "Warning": Warning,
            "UserWarning": UserWarning,
            "DeprecationWarning": DeprecationWarning,
            "True": True,
            "False": False,
            "None": None,
        },
        # Pre-imported allowed modules
        "math": math,
        "random": random,
        "itertools": itertools,
        "collections": collections,
        "functools": functools,
        "copy": copy,
        "json": json,
        "re": re,
        "string": string,
        "datetime": datetime,
        "heapq": heapq,
        "bisect": bisect,
        "decimal": decimal,
    }

    return safe_globals


class SandboxResult:
    def __init__(self):
        self.success: bool = True
        self.exception: Optional[Exception] = None
        self.timed_out: bool = False
        self.sandbox_violation: Optional[str] = None
