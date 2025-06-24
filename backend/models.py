from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum
from .turbo_chips import TurboChip

class Suit(str, Enum):
    HEARTS = "hearts"
    DIAMONDS = "diamonds"
    CLUBS = "clubs"
    SPADES = "spades"

class Rank(str, Enum):
    TWO = "2"
    THREE = "3"
    FOUR = "4"
    FIVE = "5"
    SIX = "6"
    SEVEN = "7"
    EIGHT = "8"
    NINE = "9"
    TEN = "10"
    JACK = "J"
    QUEEN = "Q"
    KING = "K"
    ACE = "A"

class Card(BaseModel):
    suit: Suit
    rank: Rank
    # List of *effect identifiers* applied to this specific card.
    effects: list[str] = []  # resolved via `backend.card_effects.EFFECT_REGISTRY`
    
    def __str__(self):
        return f"{self.rank}{self.suit}"
    
    # ----------------------------  Scoring helpers  ---------------------------- #
    def _base_chip_value(self) -> int:
        """Chip value derived *solely* from the rank (no effects applied)."""
        if self.rank == Rank.ACE:
            return 11
        if self.rank in {Rank.KING, Rank.QUEEN, Rank.JACK}:
            return 10
        return int(self.rank)

    def get_chip_value(self) -> int:
        """
        Backwards-compat accessor – now includes any **chip bonus** coming from
        attached effects so that legacy code keeps working transparently.
        """
        return self._base_chip_value() + self._effect_bonus_chips()

    # ------------------------------------------------------------------------- #
    #  Effect integration
    # ------------------------------------------------------------------------- #
    def _effect_bonus_chips(self) -> int:
        """Sum of flat chip bonuses contributed by all effects on this card."""
        from .card_effects import EFFECT_REGISTRY  # local import to avoid cycles
        return sum(EFFECT_REGISTRY[eff].bonus_chips() for eff in self.effects if eff in EFFECT_REGISTRY)

    def _effect_bonus_multiplier(self) -> int:
        """Sum of multiplier bonuses contributed by all effects on this card."""
        from .card_effects import EFFECT_REGISTRY
        return sum(EFFECT_REGISTRY[eff].bonus_multiplier() for eff in self.effects if eff in EFFECT_REGISTRY)

    # Public helpers used by the evaluator
    def bonus_chips(self) -> int:
        return self._effect_bonus_chips()

    def bonus_multiplier(self) -> int:
        return self._effect_bonus_multiplier()

class HandType(str, Enum):
    HIGH_CARD = "high_card"
    ONE_PAIR = "one_pair"
    TWO_PAIR = "two_pair"
    THREE_OF_A_KIND = "three_of_a_kind"
    STRAIGHT = "straight"
    FLUSH = "flush"
    FULL_HOUSE = "full_house"
    FOUR_OF_A_KIND = "four_of_a_kind"
    STRAIGHT_FLUSH = "straight_flush"

class HandResult(BaseModel):
    hand_type: HandType
    base_chips: int
    multiplier: int
    card_chips: int
    total_score: int
    description: str
    applied_bonuses: List[str] = [] # List of strings describing card-specific bonuses

class GameState(BaseModel):
    session_id: str
    current_round: int
    hands_played: int
    draws_used: int
    total_score: int
    money: int = 0
    hand: List[Card]
    deck_remaining: int
    in_shop: bool = False
    shop_cards: List[Card] = []
    round_target: int
    max_hands: int = 4
    max_hand_size: int = 8
    max_draws: int = 3
    is_game_over: bool = False
    is_victory: bool = False
    # active turbo chips (max 8)
    inventory: list[TurboChip] = []
    is_debug_mode: bool = False

class GameAction(BaseModel):
    session_id: str
    selected_cards: List[int]  # Indices of selected cards

class HighScore(BaseModel):
    name: str
    score: int
    timestamp: str
