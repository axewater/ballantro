"""
Registry & helper utilities for always-on *Turbo Chips*.
A TurboChip is purchased once ($1) and stays active for the whole session.
"""
from __future__ import annotations

from typing import Callable, Dict, List
from pydantic import BaseModel

# ---------------------  Public Pydantic model  --------------------- #
class TurboChip(BaseModel):
    name: str
    effect_id: str               # unique key
    description: str
    apply_fn: Callable[[int], int]   # fn(total_score)->new_total_score


# --------------------------- Registry ------------------------------ #
TURBO_CHIP_REGISTRY: Dict[str, TurboChip] = {}


def _register(chip: TurboChip):
    if chip.effect_id in TURBO_CHIP_REGISTRY:
        raise ValueError(f"Duplicate turbo chip id {chip.effect_id}")
    TURBO_CHIP_REGISTRY[chip.effect_id] = chip


# ------------------------------------------------------------------ #
#  Default Turbo-Chips                                              #
# ------------------------------------------------------------------ #
_register(
    TurboChip(
        name="The Multer",
        effect_id="mul_score_x2",
        description="Doubles the final multiplier.",
        apply_fn=lambda score: score * 2,
    )
)

_register(
    TurboChip(
        name="The Pusher",
        effect_id="push_score_x2",
        description="Doubles the final chip payout.",
        apply_fn=lambda score: score * 2,
    )
)

AVAILABLE_TURBO_IDS: List[str] = list(TURBO_CHIP_REGISTRY.keys())
