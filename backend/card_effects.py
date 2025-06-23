"""
Central registry and simple strategy objects for **special card effects**.

The goal is to keep each effect self-contained so that new effects can be
added by simply subclassing `CardEffect` **and** registering the instance
in `EFFECT_REGISTRY` (or via a helper function later on).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict


class CardEffect(ABC):
    """
    Abstract base for all card effects.

    Effects are intentionally *stateless* – they expose how many bonus chips /
    multipliers they contribute **per card** whenever that card is used for
    scoring.  This keeps evaluation logic inside the evaluator simple.
    """

    # A unique, URL-safe identifier (also persisted in JSON).
    name: str

    def __init__(self, name: str, bonus_chips: int = 0, bonus_multiplier: int = 0):
        self.name = name
        self._bonus_chips = bonus_chips
        self._bonus_multiplier = bonus_multiplier

    # ------------------------------------------------------------------ #
    #  Simple value-object interface
    # ------------------------------------------------------------------ #
    def bonus_chips(self) -> int:
        """Flat chip bonus contributed **per card** that owns this effect."""
        return self._bonus_chips

    def bonus_multiplier(self) -> int:
        """
        Additional multiplier added to the *hand multiplier* when *any*
        card with this effect participates in the played hand.
        """
        return self._bonus_multiplier

    # Comparison & repr helpers (useful for testing / debugging)
    # ------------------------------------------------------------------ #
    def __repr__(self) -> str:  # pragma: no cover
        return f"<CardEffect {self.name!s}>"

    def __eq__(self, other) -> bool:  # pragma: no cover
        return isinstance(other, CardEffect) and self.name == other.name


# ---------------------------------------------------------------------- #
#  Concrete effect implementations
# ---------------------------------------------------------------------- #

class BonusChipsEffect(CardEffect):
    """Adds +50 chips to the card value when scored."""

    def __init__(self):
        super().__init__(name="bonus_chips_50", bonus_chips=50)


class BonusMultiplierEffect(CardEffect):
    """Adds +5 to the hand multiplier when scored."""

    def __init__(self):
        super().__init__(name="bonus_multiplier_5", bonus_multiplier=5)


# ---------------------------------------------------------------------- #
#  Effect registry – lookup by string identifier (stored in JSON)
# ---------------------------------------------------------------------- #

EFFECT_REGISTRY: Dict[str, CardEffect] = {}

def _register(effect: CardEffect):
    if effect.name in EFFECT_REGISTRY:  # pragma: no cover
        raise ValueError(f"Duplicate card effect name registered: {effect.name}")
    EFFECT_REGISTRY[effect.name] = effect


# Register default effects
_register(BonusChipsEffect())
_register(BonusMultiplierEffect())

# Convenience export – only the names are needed when serialising.
AVAILABLE_EFFECT_NAMES = list(EFFECT_REGISTRY.keys())
