"""
Skill Registry — Central registry for marketing skill modules.

Manages skill registration, discovery, and metadata for the Brain Orchestrator.
Each skill corresponds to a marketing capability (analytics, creative, CRM, etc.)
that the orchestrator can delegate tasks to.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Optional


@dataclass
class SkillMetadata:
    """Metadata describing a registered skill."""
    name: str
    description: str
    capabilities: list[str] = field(default_factory=list)
    intents: list[str] = field(default_factory=list)
    version: str = "1.0.0"
    enabled: bool = True


class SkillRegistry:
    """
    Central registry for all marketing skill modules.

    Skills are registered with a name, an instance (or callable), and metadata.
    The orchestrator queries this registry to discover and invoke skills.
    """

    def __init__(self) -> None:
        self._skills: dict[str, Any] = {}
        self._metadata: dict[str, SkillMetadata] = {}

    def register(
        self,
        name: str,
        skill: Any,
        description: str = "",
        capabilities: Optional[list[str]] = None,
        intents: Optional[list[str]] = None,
        version: str = "1.0.0",
    ) -> None:
        """
        Register a skill module.

        Args:
            name: Unique skill identifier (e.g. "analytics", "creative").
            skill: The skill instance or callable.
            description: Human-readable description.
            capabilities: List of capability strings the skill provides.
            intents: Intent labels this skill handles (used for routing).
            version: Skill version string.
        """
        self._skills[name] = skill
        self._metadata[name] = SkillMetadata(
            name=name,
            description=description,
            capabilities=capabilities or [],
            intents=intents or [name],
            version=version,
        )

    def unregister(self, name: str) -> bool:
        """Remove a skill from the registry. Returns True if it existed."""
        if name in self._skills:
            del self._skills[name]
            del self._metadata[name]
            return True
        return False

    def get(self, name: str) -> Optional[Any]:
        """Retrieve a skill instance by name. Returns None if not found."""
        return self._skills.get(name)

    def get_metadata(self, name: str) -> Optional[SkillMetadata]:
        """Retrieve metadata for a skill. Returns None if not found."""
        return self._metadata.get(name)

    def enable(self, name: str) -> bool:
        """Enable a skill. Returns True if the skill exists."""
        meta = self._metadata.get(name)
        if meta:
            meta.enabled = True
            return True
        return False

    def disable(self, name: str) -> bool:
        """Disable a skill without removing it. Returns True if the skill exists."""
        meta = self._metadata.get(name)
        if meta:
            meta.enabled = False
            return True
        return False

    def resolve_intent(self, intent: str) -> Optional[Any]:
        """
        Find the first enabled skill that handles the given intent.

        Args:
            intent: Intent label from the router.

        Returns:
            The skill instance, or None if no matching enabled skill is found.
        """
        for name, meta in self._metadata.items():
            if meta.enabled and intent in meta.intents:
                return self._skills[name]
        return None

    def list_skills(self, enabled_only: bool = False) -> list[dict]:
        """
        List all registered skills with their metadata.

        Args:
            enabled_only: If True, only return enabled skills.

        Returns:
            List of dicts with skill info.
        """
        result = []
        for name, meta in self._metadata.items():
            if enabled_only and not meta.enabled:
                continue
            result.append({
                "name": meta.name,
                "description": meta.description,
                "capabilities": meta.capabilities,
                "intents": meta.intents,
                "version": meta.version,
                "enabled": meta.enabled,
            })
        return result

    def has_skill(self, name: str) -> bool:
        """Check whether a skill with the given name is registered."""
        return name in self._skills

    def skill_count(self) -> int:
        """Return the total number of registered skills."""
        return len(self._skills)

    def register_from_dict(self, skills: dict[str, Any]) -> None:
        """
        Bulk-register skills from a name→instance mapping.

        Args:
            skills: Dict of {skill_name: skill_instance}.
        """
        for name, skill in skills.items():
            if name not in self._metadata:
                self.register(name, skill)

    def to_dict(self) -> dict:
        """Serialise registry metadata (without skill instances) to a dict."""
        return {
            "skills": self.list_skills(),
            "total": self.skill_count(),
        }
