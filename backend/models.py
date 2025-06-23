from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

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
    
    def __str__(self):
        return f"{self.rank}{self.suit}"
    
    def get_chip_value(self) -> int:
        """Get the chip value of the card"""
        if self.rank == Rank.ACE:
            return 11
        elif self.rank in [Rank.KING, Rank.QUEEN, Rank.JACK]:
            return 10
        else:
            return int(self.rank)

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

class GameAction(BaseModel):
    session_id: str
    selected_cards: List[int]  # Indices of selected cards

class HighScore(BaseModel):
    name: str
    score: int
    timestamp: str
