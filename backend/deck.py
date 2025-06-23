import random
from typing import List, Tuple
from .models import Card, Suit, Rank

class Deck:
    """Manages a standard 52-card deck"""
    
    def __init__(self):
        self.cards: List[Card] = []
        self.discarded: List[Card] = []
        self.reset()
    
    def reset(self):
        """Create a fresh shuffled deck"""
        self.cards = []
        self.discarded = []
        
        # Create all 52 cards
        for suit in Suit:
            for rank in Rank:
                self.cards.append(Card(suit=suit, rank=rank))
        
        # Shuffle the deck
        random.shuffle(self.cards)
    
    def draw(self, count: int = 1) -> List[Card]:
        """Draw cards from the deck"""
        if count > len(self.cards):
            raise ValueError(f"Cannot draw {count} cards, only {len(self.cards)} remaining")
        
        drawn_cards = []
        for _ in range(count):
            drawn_cards.append(self.cards.pop())
        
        return drawn_cards
    
    def discard(self, cards: List[Card]):
        """Add cards to discard pile"""
        self.discarded.extend(cards)
    
    def remaining_count(self) -> int:
        """Get number of cards remaining in deck"""
        return len(self.cards)
    
    def can_draw(self, count: int) -> bool:
        """Check if we can draw the requested number of cards"""
        return len(self.cards) >= count

def card_from_string(card_str: str) -> Card:
    """Convert string representation to Card object"""
    if len(card_str) < 2:
        raise ValueError(f"Invalid card string: {card_str}")
    
    # Handle 10 specially
    if card_str.startswith("10"):
        rank_str = "10"
        suit_str = card_str[2:]
    else:
        rank_str = card_str[0]
        suit_str = card_str[1:]
    
    # Map suit strings to enum
    suit_map = {
        "h": Suit.HEARTS,
        "hearts": Suit.HEARTS,
        "d": Suit.DIAMONDS, 
        "diamonds": Suit.DIAMONDS,
        "c": Suit.CLUBS,
        "clubs": Suit.CLUBS,
        "s": Suit.SPADES,
        "spades": Suit.SPADES
    }
    
    suit = suit_map.get(suit_str.lower())
    if not suit:
        raise ValueError(f"Invalid suit: {suit_str}")
    
    # Map rank strings to enum
    rank_map = {
        "2": Rank.TWO, "3": Rank.THREE, "4": Rank.FOUR, "5": Rank.FIVE,
        "6": Rank.SIX, "7": Rank.SEVEN, "8": Rank.EIGHT, "9": Rank.NINE,
        "10": Rank.TEN, "T": Rank.TEN,
        "J": Rank.JACK, "Q": Rank.QUEEN, "K": Rank.KING, "A": Rank.ACE
    }
    
    rank = rank_map.get(rank_str.upper())
    if not rank:
        raise ValueError(f"Invalid rank: {rank_str}")
    
    return Card(suit=suit, rank=rank)

