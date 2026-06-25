"""
serializer.py — Converts Python objects into JSON-safe typed descriptors.
Uses id() for object identity and detects circular references.
"""
from __future__ import annotations
import typing
import types as _types_mod
from typing import Any, Dict, Set


# ─── Typing Object Filter ─────────────────────────────────────────────────────

# Gather all available typing internal types defensively
_EXCLUDED_TYPING_BASES: tuple = tuple(filter(None, [
    getattr(typing, '_SpecialForm', None),
    getattr(typing, '_GenericAlias', None),
    getattr(typing, '_SpecialGenericAlias', None),
    getattr(typing, '_BaseGenericAlias', None),
    getattr(typing, '_UnionGenericAlias', None),
    getattr(typing, '_LiteralGenericAlias', None),
    getattr(typing, '_AnnotatedAlias', None),
]))

_EXCLUDED_TYPE_NAMES = {
    '_SpecialGenericAlias', '_GenericAlias', '_SpecialForm',
    '_TupleType', '_UnionGenericAlias', '_LiteralGenericAlias',
    '_AnnotatedAlias', '_BaseGenericAlias', 'ABCMeta',
    '_CallableGenericAlias', '_CallableType', '_AliasPath',
    '_AliasType',
}


def should_exclude_object(obj: Any) -> bool:
    """Return True if this object should be hidden from visualization."""
    # Exclude known typing module internal instances
    if _EXCLUDED_TYPING_BASES and isinstance(obj, _EXCLUDED_TYPING_BASES):
        return True
    # Exclude by type name
    type_name = type(obj).__name__
    if type_name in _EXCLUDED_TYPE_NAMES:
        return True
    # Exclude type objects that belong to the typing module
    if isinstance(obj, type) and getattr(obj, '__module__', None) == 'typing':
        return True
    # Exclude anything whose repr obviously starts with 'typing.'
    try:
        r = repr(obj)
        if r.startswith('typing.'):
            return True
    except Exception:
        pass
    return False


# ─── Serialization ────────────────────────────────────────────────────────────

def serialize(obj: Any, seen: Set[int] | None = None) -> Dict:
    """Convert any Python object to a typed JSON-safe descriptor."""
    if seen is None:
        seen = set()

    # Fast-exit for typing objects — return a sentinel we'll filter upstream
    if should_exclude_object(obj):
        return {"type": "_typing_internal", "id": f"prim_{id(obj)}"}

    obj_id = id(obj)

    # Primitives: int, float, bool, NoneType (check bool before int)
    if obj is None:
        return {"id": f"prim_{obj_id}", "type": "none", "value": None}

    if isinstance(obj, bool):
        return {"id": f"prim_{obj_id}", "type": "bool", "value": obj}

    if isinstance(obj, int):
        return {"id": f"prim_{obj_id}", "type": "int", "value": obj}

    if isinstance(obj, float):
        return {"id": f"prim_{obj_id}", "type": "float", "value": obj}

    # String
    if isinstance(obj, str):
        if obj_id in seen:
            return {"type": "circular_ref", "ref_id": f"obj_{obj_id}"}
        seen.add(obj_id)
        return {
            "id": f"obj_{obj_id}",
            "type": "string",
            "value": obj,
            "length": len(obj),
        }

    # Circular reference check for mutable containers
    if obj_id in seen:
        return {"type": "circular_ref", "ref_id": f"obj_{obj_id}"}
    seen.add(obj_id)

    # List
    if isinstance(obj, list):
        items = [serialize(item, seen) for item in obj]
        # Filter out typing internals from items
        items = [i for i in items if i.get("type") != "_typing_internal"]
        return {
            "id": f"obj_{obj_id}",
            "type": "list",
            "length": len(obj),
            "items": items,
        }

    # Tuple
    if isinstance(obj, tuple):
        items = [serialize(item, seen) for item in obj]
        items = [i for i in items if i.get("type") != "_typing_internal"]
        return {
            "id": f"obj_{obj_id}",
            "type": "tuple",
            "length": len(obj),
            "items": items,
        }

    # Set / frozenset
    if isinstance(obj, (set, frozenset)):
        items = [serialize(item, seen) for item in obj]
        items = [i for i in items if i.get("type") != "_typing_internal"]
        return {
            "id": f"obj_{obj_id}",
            "type": "set",
            "items": items,
        }

    # Dict
    if isinstance(obj, dict):
        pairs = []
        for k, v in obj.items():
            if should_exclude_object(k) or should_exclude_object(v):
                continue
            pairs.append({"key": serialize(k, seen), "value": serialize(v, seen)})
        return {
            "id": f"obj_{obj_id}",
            "type": "dict",
            "pairs": pairs,
        }

    # Function / lambda
    if isinstance(obj, (_types_mod.FunctionType, _types_mod.LambdaType, _types_mod.BuiltinFunctionType)):
        return {
            "id": f"obj_{obj_id}",
            "type": "function",
            "name": getattr(obj, "__name__", repr(obj)),
        }

    # Class (type) objects — skip typing module classes
    if isinstance(obj, type):
        if getattr(obj, '__module__', '') == 'typing':
            return {"type": "_typing_internal", "id": f"prim_{obj_id}"}
        return {
            "id": f"obj_{obj_id}",
            "type": "class",
            "name": obj.__name__,
        }

    # Custom class instances — skip typing internals
    if hasattr(obj, "__dict__") and hasattr(obj, "__class__"):
        class_name = type(obj).__name__
        if class_name in _EXCLUDED_TYPE_NAMES:
            return {"type": "_typing_internal", "id": f"prim_{obj_id}"}
        attrs = {}
        for k, v in obj.__dict__.items():
            if k.startswith("__"):
                continue
            if should_exclude_object(v):
                continue
            try:
                s = serialize(v, seen)
                if s.get("type") != "_typing_internal":
                    attrs[k] = s
            except Exception:
                attrs[k] = {"type": "error", "value": repr(v)}
        return {
            "id": f"obj_{obj_id}",
            "type": "instance",
            "class_name": class_name,
            "attributes": attrs,
        }

    # Fallback: represent as string
    return {
        "id": f"obj_{obj_id}",
        "type": "unknown",
        "value": repr(obj),
    }


def serialize_locals(local_vars: dict, seen: Set[int] | None = None) -> dict:
    """Serialize a dict of local variables, skipping non-serializable entries."""
    if seen is None:
        seen = set()
    result = {}
    for name, val in local_vars.items():
        if name.startswith("__"):
            continue
        # Skip typing module objects even if var name is clean
        if should_exclude_object(val):
            continue
        try:
            s = serialize(val, set(seen))
            if s.get("type") != "_typing_internal":
                result[name] = s
        except Exception:
            result[name] = {"type": "error", "value": repr(val)}
    return result


def collect_heap_objects(serialized_locals: dict, serialized_globals: dict) -> list:
    """
    Extract all unique heap objects (non-primitive) from locals + globals.
    Returns a deduplicated list by object id.
    """
    seen_ids: Set[str] = set()
    heap: list = []

    def _collect(descriptor):
        if not isinstance(descriptor, dict):
            return
        obj_type = descriptor.get("type", "")
        obj_id = descriptor.get("id", "")

        # Skip typing internals
        if obj_type == "_typing_internal":
            return

        # Only heap objects (not primitives)
        if obj_id and obj_id.startswith("obj_") and obj_id not in seen_ids:
            seen_ids.add(obj_id)
            heap.append(descriptor)

        # Recurse into containers
        for item in descriptor.get("items", []):
            _collect(item)
        for pair in descriptor.get("pairs", []):
            _collect(pair.get("key"))
            _collect(pair.get("value"))
        for attr_val in descriptor.get("attributes", {}).values():
            _collect(attr_val)

    for desc in serialized_locals.values():
        _collect(desc)
    for desc in serialized_globals.values():
        _collect(desc)

    return heap
