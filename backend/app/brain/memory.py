"""
Memory — Context retention interface for the Brain module.

Provides a lightweight, session-scoped key-value memory store for
short-term context retention across a conversation turn, and a simple
API for the orchestrator to read/write contextual facts without
dealing with the full MemoryManager infrastructure.

For persistent, vector-backed, and long-term storage see MemoryManager.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional


class ContextMemory:
    """
    Short-term, in-process context memory for a single session.

    Stores arbitrary key-value pairs scoped to a conversation or user session.
    All data is held in-memory and does not persist across restarts; use
    MemoryManager for persistence.
    """

    def __init__(self, session_id: Optional[str] = None) -> None:
        self.session_id = session_id
        self._store: dict[str, Any] = {}
        self._timestamps: dict[str, str] = {}

    # ── Core operations ───────────────────────────────────────────────

    def set(self, key: str, value: Any) -> None:
        """Store a value under a key."""
        self._store[key] = value
        self._timestamps[key] = datetime.now(timezone.utc).isoformat()

    def get(self, key: str, default: Any = None) -> Any:
        """Retrieve a stored value, returning *default* if not found."""
        return self._store.get(key, default)

    def delete(self, key: str) -> bool:
        """Remove a key. Returns True if it existed."""
        if key in self._store:
            del self._store[key]
            self._timestamps.pop(key, None)
            return True
        return False

    def has(self, key: str) -> bool:
        """Check whether a key is stored."""
        return key in self._store

    def clear(self) -> None:
        """Remove all stored context."""
        self._store.clear()
        self._timestamps.clear()

    # ── Bulk operations ───────────────────────────────────────────────

    def update(self, data: dict[str, Any]) -> None:
        """Merge a dict of key-value pairs into the context."""
        for k, v in data.items():
            self.set(k, v)

    def snapshot(self) -> dict[str, Any]:
        """Return a shallow copy of the entire context store."""
        return dict(self._store)

    def keys(self) -> list[str]:
        """Return all stored keys."""
        return list(self._store.keys())

    # ── Convenience helpers ───────────────────────────────────────────

    def remember_fact(self, fact: str, category: str = "general") -> None:
        """
        Append a free-text fact to a categorised list.

        Args:
            fact: The fact string to remember.
            category: Grouping label (e.g. "brand", "budget", "goal").
        """
        key = f"facts:{category}"
        existing: list[str] = self._store.get(key, [])
        existing.append(fact)
        self.set(key, existing)

    def get_facts(self, category: str = "general") -> list[str]:
        """Retrieve all facts stored under a category."""
        return self._store.get(f"facts:{category}", [])

    def set_user_preference(self, pref_key: str, value: Any) -> None:
        """Store a user preference."""
        self.set(f"pref:{pref_key}", value)

    def get_user_preference(self, pref_key: str, default: Any = None) -> Any:
        """Retrieve a user preference."""
        return self.get(f"pref:{pref_key}", default)

    # ── Metadata ─────────────────────────────────────────────────────

    def last_updated(self, key: str) -> Optional[str]:
        """Return the ISO timestamp of the last write to *key*, or None."""
        return self._timestamps.get(key)

    def size(self) -> int:
        """Return the number of entries in the context store."""
        return len(self._store)

    def to_dict(self) -> dict:
        """Serialise the full context to a dict (for debugging/export)."""
        return {
            "session_id": self.session_id,
            "size": self.size(),
            "entries": {
                k: {"value": v, "updated_at": self._timestamps.get(k)}
                for k, v in self._store.items()
            },
        }


class MultiSessionMemory:
    """
    Manages ContextMemory instances keyed by session/conversation ID.

    Use this when the same process serves multiple concurrent conversations
    and you need isolated context per session.
    """

    def __init__(self) -> None:
        self._sessions: dict[str, ContextMemory] = {}

    def get_or_create(self, session_id: str) -> ContextMemory:
        """Retrieve existing session memory or create a new one."""
        if session_id not in self._sessions:
            self._sessions[session_id] = ContextMemory(session_id=session_id)
        return self._sessions[session_id]

    def get(self, session_id: str) -> Optional[ContextMemory]:
        """Retrieve existing session memory, or None if not found."""
        return self._sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        """Remove a session from memory. Returns True if it existed."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def active_sessions(self) -> list[str]:
        """Return all active session IDs."""
        return list(self._sessions.keys())

    def session_count(self) -> int:
        """Return the number of active sessions."""
        return len(self._sessions)
