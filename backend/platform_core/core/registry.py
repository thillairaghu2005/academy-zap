"""Subsystem registry + feature-flag gate.

Written once (platform §4.1): "for each subsystem, validate against its contract, register,
expose via feature flag" — never edited when a new subsystem is added. Each subsystem calls
`register_subsystem` once at import time from its `routes/__init__.py`-equivalent entrypoint;
`main.py` mounts every enabled subsystem's router under `/api/v1` in one loop.
"""

from dataclasses import dataclass

from fastapi import APIRouter


@dataclass
class SubsystemRegistration:
    name: str
    router: APIRouter
    enabled_by_default: bool = True


_REGISTRY: dict[str, SubsystemRegistration] = {}


def register_subsystem(name: str, router: APIRouter, *, enabled_by_default: bool = True) -> None:
    if name in _REGISTRY:
        raise ValueError(f"Subsystem '{name}' is already registered.")
    _REGISTRY[name] = SubsystemRegistration(
        name=name, router=router, enabled_by_default=enabled_by_default
    )


def _is_enabled(name: str) -> bool:
    """Per-subsystem feature flag: `FEATURE_<SUBSYSTEM>_ENABLED=false` in the environment
    overrides the subsystem's own default, without editing this module.
    """
    import os

    override = os.environ.get(f"FEATURE_{name.upper()}_ENABLED")
    if override is not None:
        return override.lower() in {"1", "true", "yes"}
    return _REGISTRY[name].enabled_by_default


def enabled_routers() -> list[APIRouter]:
    return [reg.router for name, reg in _REGISTRY.items() if _is_enabled(name)]


def registered_subsystems() -> list[str]:
    return list(_REGISTRY.keys())


__all__ = ["register_subsystem", "enabled_routers", "registered_subsystems"]
