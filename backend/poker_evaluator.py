from typing import List, Dict, Tuple, Optional
from collections import Counter
from .models import Card, HandType, HandResult, Rank

class PokerEvaluator:
    """Comprehensive poker hand evaluation with exact scoring"""
    
    # Hand scoring configuration from game requirements
    HAND_SCORES = {
        HandType.STRAIGHT_FLUSH: {"base_chips": 75, "multiplier": 10},
        HandType.FOUR_OF_A_KIND: {"base_chips": 60, "multiplier": 8},
        HandType.FULL_HOUSE: {"base_chips": 50, "multiplier": 7},
        HandType.FLUSH: {"base_chips": 40, "multiplier": 6},
        HandType.STRAIGHT: {"base_chips": 30, "multiplier": 5},
        HandType.THREE_OF_A_KIND: {"base_chips": 25, "multiplier": 4},
        HandType.TWO_PAIR: {"base_chips": 20, "multiplier": 3},
        HandType.ONE_PAIR: {"base_chips": 15, "multiplier": 2},
        HandType.HIGH_CARD: {"base_chips": 10, "multiplier": 2},
    }
    
    # Rank values for comparison (Ace high)
    RANK_VALUES = {
        Rank.TWO: 2, Rank.THREE: 3, Rank.FOUR: 4, Rank.FIVE: 5,
        Rank.SIX: 6, Rank.SEVEN: 7, Rank.EIGHT: 8, Rank.NINE: 9,
        Rank.TEN: 10, Rank.JACK: 11, Rank.QUEEN: 12, Rank.KING: 13, Rank.ACE: 14
    }
    
    # Low Ace straight (A-2-3-4-5)
    LOW_ACE_STRAIGHT = [14, 2, 3, 4, 5]
    
    @classmethod
    def evaluate_hand(cls, cards: List[Card]) -> HandResult:
        """Evaluate a poker hand and return complete scoring information"""
        if len(cards) != 5:
            raise ValueError("Hand must contain exactly 5 cards")
        
        # Calculate card chip values
        card_chips = sum(card.get_chip_value() for card in cards)
        
        # Determine hand type
        hand_type = cls._get_hand_type(cards)
        
        # Get scoring information
        score_info = cls.HAND_SCORES[hand_type]
        base_chips = score_info["base_chips"]
        multiplier = score_info["multiplier"]
        
        # Calculate total score: (card_chips + base_chips) * multiplier
        total_score = (card_chips + base_chips) * multiplier
        
        # Generate description
        description = cls._get_hand_description(hand_type, cards)
        
        return HandResult(
            hand_type=hand_type,
            base_chips=base_chips,
            multiplier=multiplier,
            card_chips=card_chips,
            total_score=total_score,
            description=description
        )
    
    @classmethod
    def _get_hand_type(cls, cards: List[Card]) -> HandType:
        """Determine the poker hand type"""
        ranks = [card.rank for card in cards]
        suits = [card.suit for card in cards]
        
        # Count ranks and suits
        rank_counts = Counter(ranks)
        suit_counts = Counter(suits)
        
        # Check for flush
        is_flush = len(suit_counts) == 1
        
        # Check for straight
        is_straight = cls._is_straight(ranks)
        
        # Determine hand type based on patterns
        if is_straight and is_flush:
            return HandType.STRAIGHT_FLUSH
        
        # Check for four of a kind
        if 4 in rank_counts.values():
            return HandType.FOUR_OF_A_KIND
        
        # Check for full house (3 + 2)
        if 3 in rank_counts.values() and 2 in rank_counts.values():
            return HandType.FULL_HOUSE
        
        if is_flush:
            return HandType.FLUSH
        
        if is_straight:
            return HandType.STRAIGHT
        
        # Check for three of a kind
        if 3 in rank_counts.values():
            return HandType.THREE_OF_A_KIND
        
        # Check for pairs
        pair_count = sum(1 for count in rank_counts.values() if count == 2)
        if pair_count == 2:
            return HandType.TWO_PAIR
        elif pair_count == 1:
            return HandType.ONE_PAIR
        
        return HandType.HIGH_CARD
    
    @classmethod
    def _is_straight(cls, ranks: List[Rank]) -> bool:
        """Check if ranks form a straight"""
        rank_values = [cls.RANK_VALUES[rank] for rank in ranks]
        rank_values.sort()
        
        # Check for regular straight
        for i in range(1, len(rank_values)):
            if rank_values[i] != rank_values[i-1] + 1:
                break
        else:
            return True
        
        # Check for low ace straight (A-2-3-4-5)
        if sorted(rank_values) == sorted(cls.LOW_ACE_STRAIGHT):
            return True
        
        return False
    
    @classmethod
    def _get_hand_description(cls, hand_type: HandType, cards: List[Card]) -> str:
        """Generate a human-readable description of the hand"""
        ranks = [card.rank for card in cards]
        rank_counts = Counter(ranks)
        
        if hand_type == HandType.STRAIGHT_FLUSH:
            high_card = cls._get_straight_high_card(ranks)
            return f"Straight Flush, {high_card} high"
        
        elif hand_type == HandType.FOUR_OF_A_KIND:
            quad_rank = [rank for rank, count in rank_counts.items() if count == 4][0]
            return f"Four of a Kind, {quad_rank}s"
        
        elif hand_type == HandType.FULL_HOUSE:
            trip_rank = [rank for rank, count in rank_counts.items() if count == 3][0]
            pair_rank = [rank for rank, count in rank_counts.items() if count == 2][0]
            return f"Full House, {trip_rank}s over {pair_rank}s"
        
        elif hand_type == HandType.FLUSH:
            suit = cards[0].suit
            high_card = max(ranks, key=lambda r: cls.RANK_VALUES[r])
            return f"Flush, {high_card} high"
        
        elif hand_type == HandType.STRAIGHT:
            high_card = cls._get_straight_high_card(ranks)
            return f"Straight, {high_card} high"
        
        elif hand_type == HandType.THREE_OF_A_KIND:
            trip_rank = [rank for rank, count in rank_counts.items() if count == 3][0]
            return f"Three of a Kind, {trip_rank}s"
        
        elif hand_type == HandType.TWO_PAIR:
            pairs = [rank for rank, count in rank_counts.items() if count == 2]
            pairs.sort(key=lambda r: cls.RANK_VALUES[r], reverse=True)
            return f"Two Pair, {pairs[0]}s and {pairs[1]}s"
        
        elif hand_type == HandType.ONE_PAIR:
            pair_rank = [rank for rank, count in rank_counts.items() if count == 2][0]
            return f"Pair of {pair_rank}s"
        
        else:  # HIGH_CARD
            high_card = max(ranks, key=lambda r: cls.RANK_VALUES[r])
            return f"High Card, {high_card}"
    
    @classmethod
    def _get_straight_high_card(cls, ranks: List[Rank]) -> Rank:
        """Get the high card of a straight"""
        rank_values = [cls.RANK_VALUES[rank] for rank in ranks]
        
        # Check for low ace straight
        if sorted(rank_values) == sorted(cls.LOW_ACE_STRAIGHT):
            return Rank.FIVE  # In A-2-3-4-5, 5 is the high card
        
        # Regular straight - return highest rank
        return max(ranks, key=lambda r: cls.RANK_VALUES[r])

