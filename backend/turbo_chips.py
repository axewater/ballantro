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

# ------------------------------------------------------------------ #
#  NEW suit-specific multiplier chips                               #
# ------------------------------------------------------------------ #

def _make_suit_multiplier_chip(name: str, effect_id: str, suit_str: str):
    """
    Returns a TurboChip that adds **+3** to the hand multiplier
    *iff* at least one **triggered** card of the given suit scored.
    The calculation is performed entirely client-side based on
    `HandResult` + the original `played_cards` passed in by the
    patched turbo hook.
    """
    def _apply(total: int, *, res=None, played_cards=None):
        if res is None or played_cards is None or not res.triggered_indices:
            return total
        # Check if any triggered card matches the suit
        for idx in res.triggered_indices:
            if idx < len(played_cards) and str(getattr(played_cards[idx], "suit", "")) == suit_str:
                # Re-compute total with (+3) multiplier
                if res.multiplier == 0:          # safeguard
                    return total
                base_total = total // res.multiplier
                return base_total * (res.multiplier + 3)
        return total

    return TurboChip(
        name=name,
        effect_id=effect_id,
        description=f"+3 multiplier when a {suit_str[:-1] if suit_str.endswith('s') else suit_str} card is scored.",
        apply_fn=_apply,
    )

_register(_make_suit_multiplier_chip("In the Club",     "mult_plus3_clubs",    "clubs"))
_register(_make_suit_multiplier_chip("Girls Best Friend","mult_plus3_diamonds","diamonds"))
_register(_make_suit_multiplier_chip("The Digger",      "mult_plus3_spades",   "spades"))
_register(_make_suit_multiplier_chip("Cupido",          "mult_plus3_hearts",   "hearts"))

AVAILABLE_TURBO_IDS: List[str] = list(TURBO_CHIP_REGISTRY.keys())
